# Decisiones técnicas, lógica y gas — CryptoBankVault
> 🇬🇧 [English version](./DECISIONES-TECNICAS-EN.md)

Documento para entender **qué se construyó**, **por qué** se eligió así, **cómo fluye** el sistema y **qué se podría mejorar en gas** sin romper seguridad.

Contrato: [`src/CryptoBankVault.sol`](../src/CryptoBankVault.sol)  
Complementa: [`GAS-ES.md`](./GAS-ES.md), [`LIMITACIONES-ES.md`](./LIMITACIONES-ES.md), [`SWC-AUDIT-ES.md`](./SWC-AUDIT-ES.md).

---

## 1. Qué es (en una frase)

Un **vault multi-activo** que guarda ETH y ERC-20, lleva un **ledger contable interno** por usuario/token, y solo deja retirar lo acreditado — con pause de emergencia, allowlist de tokens y protección contra reentrancy.

---

## 2. Decisiones técnicas (y por qué)

### 2.1 Stack on-chain

| Decisión | Elección | Motivo |
|----------|----------|--------|
| Compilador | `pragma solidity 0.8.24` fijo | Evita floating pragma (SWC-103); checks de overflow nativos |
| EVM | Cancun (`evm_version = "cancun"`) | Habilita EIP-1153 (transient storage) |
| Access control | OpenZeppelin `Ownable2Step` | Transferencia de ownership en dos pasos (menos error operativo) |
| Emergencia | `Pausable` | Congela depósitos **y** retiros bajo control del owner |
| Reentrancy | `ReentrancyGuardTransient` | Más barato que guard en storage clásico |
| ERC-20 | `SafeERC20` | Tokens que no retornan `bool` no rompen el vault |
| Errores | Custom errors | Más baratos y tipados que `require("string")` |
| ETH out | `.call{value}("")` + check | Estándar actual; revierte si el receptor rechaza |

### 2.2 Modelo de fondos: ledger ≠ balance físico

Hay **dos capas**:

1. **Físico:** ETH en `address(this).balance` / tokens en `balanceOf(vault)`.
2. **Contable:** `_balances[user][token]` y su suma `_totalBalances[token]`.

**Regla de oro:** un usuario solo puede retirar lo que tiene en el ledger.  
Si alguien manda ETH/tokens “por la fuerza” (p. ej. `selfdestruct` / `transfer` directo), sube el físico pero **no** el ledger → eso es **surplus** y solo el owner lo rescata (`rescueETH` / `rescueERC20`), nunca por encima del surplus.

### 2.3 Sentinel nativo

`NATIVE = address(0)` representa ETH en el mismo mapping que los ERC-20.  
Evita un mapping aparte y unifica `_credit` / `_debit`.

### 2.4 Allowlist de ERC-20

Solo tokens con `_allowedTokens[token] == true` pueden **depositarse**.  
**Retiros no exigen allowlist:** si el owner delista un token, quien ya tenía saldo puede seguir retirando.

**Tradeoff:** la allowlist es política del owner (confianza), no una prueba criptográfica de que el token es “honesto” (rebase / `balanceOf` mentiroso). Ver [`LIMITACIONES-ES.md`](./LIMITACIONES-ES.md).

### 2.5 Orden de operaciones (seguridad)

| Path | Patrón | Por qué |
|------|--------|---------|
| `withdrawETH` / `withdrawERC20` | **Effects → Interactions** (CEI) | Debitar ledger **antes** del `.call` / `transfer` (reentrancy) |
| `depositERC20` | Interactions → Effects | Hay que medir el **delta** recibido; el crédito depende de lo que llegó |
| Todos los paths de valor | `nonReentrant` | Superficie uniforme (también `receive` / rescue) |
| ETH deposit | `whenNotPaused` / check en `receive` | Emergencia sin modifier en `receive` |

### 2.6 Fee-on-transfer

- **Depósito:** se acredita `balanceAfter - balanceBefore` (no el `amount` pedido). Si no llega nada → `DepositFailed`.
- **Retiro:** se debita `amount` y se transfiere `amount`. Si el token cobra fee a la salida, el usuario puede recibir menos (limitación aceptada / documentada).

### 2.7 Frontend (decisiones de producto)

| Decisión | Motivo |
|----------|--------|
| Next.js + ethers v6 (sin Wagmi) | Demo explícita, menos capas |
| EIP-6963 multiwallet | Varias extensiones sin pelear solo por `window.ethereum` |
| `NEXT_PUBLIC_ASSETS` + decimals | Multi-mercado desde env |
| Login por firma en `localStorage` | UX demo; **no** es SIWE/servidor |
| Approve `0 → N` (o permit del token) | Mitiga race SWC-114 del ERC-20 externo |

---

## 3. Lógica que sigue el sistema

### 3.1 Diagrama mental

```text
Usuario                    CryptoBankVault                 Token / red
   |                              |                            |
   |-- depositETH {value} ------->|                            |
   |                    _credit(user, NATIVE, value)           |
   |                    (ledger += , total +=)                 |
   |                              |                            |
   |-- approve(vault) --------------------------------------->|
   |-- depositERC20(token, amt) ->|                            |
   |                    transferFrom + delta balanceOf         |
   |                    _credit(user, token, received)         |
   |                              |                            |
   |-- withdrawETH(amt) --------->|                            |
   |                    _debit (ledger -=)                     |
   |                    emit Withdrawn                         |
   |                    call{value}(user) -------------------->|
   |                              |                            |
   |-- withdrawERC20 ------------>|                            |
   |                    _debit                                 |
   |                    safeTransfer(user) ------------------->|
```

### 3.2 Depósito ETH

1. `whenNotPaused` + `nonReentrant` (o check de pause en `receive`).
2. `_credit(msg.sender, NATIVE, msg.value)` → sube ledger y `_totalBalances`.
3. Emite `Deposited`.
4. El ETH físico ya está en el contrato por el `payable`.

Equivalente: enviar ETH directo al vault (`receive`) con las mismas reglas.

### 3.3 Depósito ERC-20

1. Checks: no `NATIVE`, allowlisted, `amount > 0`.
2. `balanceOf(vault)` before → `safeTransferFrom` → `balanceOf` after.
3. `received = after - before` (unchecked tras `after > before`).
4. `_credit(account, token, received)`.

### 3.4 Retiro ETH / ERC-20

1. `_debit`: si `amount == 0` o `bal < amount` → revert.
2. Actualiza `_balances` y `_totalBalances` (**antes** de enviar).
3. Emite `Withdrawn`.
4. Envía fondos (`.call` / `safeTransfer`). Si falla → toda la tx revierte (estado intacto).

### 3.5 Admin

| Función | Quién | Efecto |
|---------|-------|--------|
| `pause` / `unpause` | Owner | Bloquea / reabre depósitos y retiros |
| `setTokenAllowed` | Owner | Incluye/excluye token para **nuevos** depósitos |
| `rescueETH` / `rescueERC20` | Owner | Saca solo surplus (`físico - totalBalance`) |

### 3.6 Invariantes que el diseño protege

- Nadie retira más que su ledger.
- Nadie retira el ledger de otro.
- Reentrancy en withdraw no drena (CEI + guard).
- ETH/tokens “fantasma” no inflan el ledger; solo crean surplus rescatable.
- Pause detiene nuevas operaciones de usuario.

---

## 4. Gas: qué ya se hizo

Medición histórica (Fase 1 → Fase 2, unit gas-report). Detalle en [`GAS-ES.md`](./GAS-ES.md):

| Métrica | Δ aproximado |
|---------|----------------|
| Deploy | **−56 657** |
| `withdrawETH` avg | **−2 678** |
| `depositERC20` avg | **−4 301** (antes del delta fee-aware) |
| `withdrawERC20` avg | **−3 350** |

Técnicas aplicadas:

1. `ReentrancyGuardTransient` (EIP-1153).
2. `unchecked` en restas de ledger tras `bal >= amount`.
3. Cache de `msg.sender`.
4. Custom errors.
5. Pause validado una sola vez por path (evitar SLOAD duplicado).

**Coste consciente posterior:** `depositERC20` vuelve a pagar ~2 `balanceOf` para ser fee-aware. Seguridad contable > micro-ahorro.

---

## 5. ¿Se puede mejorar más el gas?

Sí, pero casi todo es **tradeoff seguridad / claridad / features**. Priorizado:

### 5.1 Mejoras realistas (bajo riesgo relativo)

| Idea | Ahorro esperado | Riesgo / costo |
|------|-----------------|----------------|
| Quitar `nonReentrant` en `depositETH` puro (solo value, sin call externo) | Bajo–medio | Hay que revalidar que no exista path de reentrada vía `receive` durante otros flujos; hoy se unificó a propósito |
| `transient` / packing de flags si se agrega más estado booleano | Bajo | Solo vale si crece el storage layout |
| Eventos más compactos (menos indexados) | Bajo en runtime / deploy | Peor indexación off-chain |
| Solidity optimizer `via_ir` + runs altos | Variable | Builds más lentos; medir antes/después |
| Assembly mínimo en `.call` ETH | Marginal | Pierde legibilidad; poco ROI |

### 5.2 Mejoras con tradeoff fuerte (pensar dos veces)

| Idea | Qué ganas | Qué pierdes |
|------|-----------|-------------|
| Volver a deposit ERC-20 “honest-only” (sin delta `balanceOf`) | Gas en cada depósito | Insolvencia con fee-on-transfer |
| Quitar `_totalBalances` y calcular surplus on-the-fly | Menos SSTORE en credit/debit | Imposible (o muy caro) acotar rescue sin recorrer usuarios |
| Quitar allowlist | Menos SLOAD | Cualquier token malicioso puede entrar al ledger |
| Pausable solo depósitos (no retiros) | Mejor UX en emergencia | Cambio de producto / más superficie de diseño |
| Batch deposit/withdraw | Menos overhead de tx para power users | Complejidad + gas worst-case + UX |

### 5.3 Mejoras de producto que también afectan gas off-chain

| Idea | Nota |
|------|------|
| EIP-2612 **en el token** + `permit` antes de `depositERC20` | Menos una tx de `approve` para el usuario (gas de red, no del vault) |
| Multicall / router externo | Fuera del vault; no ensucia el core |
| Leer `decimals()` on-chain en el FE | UX; no cambia gas del contrato |

### 5.4 Qué **no** conviene “optimizar”

- Quitar CEI / `nonReentrant` en retiros.
- Permitir rescue por encima del surplus.
- Acreditar `amount` pedido en vez del delta en depósitos fee-aware.
- Loops sobre usuarios/tokens en funciones de usuario (DoS por gas).

**Regla práctica:** cualquier cambio de gas debe pasar `forge test` (unit + attack + fuzz + invariant) y un nuevo `--gas-report` documentado en [`GAS-ES.md`](./GAS-ES.md).

---

## 6. Mapa rápido de archivos

| Capa | Dónde |
|------|--------|
| Contrato | `src/CryptoBankVault.sol` |
| Interfaz | `src/interfaces/ICryptoBankVault.sol` |
| Tests | `test/unit`, `test/attack`, `test/fuzz`, `test/invariant` |
| Frontend | `frontend/` (`VaultClient`, `useVaultApp`) |
| Ops | `doc/VPS-ES.md`, `deploy/vps/` |

---

## 7. Resumen ejecutivo

1. **Decisión central:** ledger contable + CEI + pause + allowlist + surplus/rescue.  
2. **Lógica:** depositar acredita; retirar debita primero y luego envía; admin solo toca política y surplus.  
3. **Gas:** ya hubo un pase serio (transient guard, unchecked, custom errors). Lo que queda es marginal o exige ceder seguridad/features.  
4. **Próximo paso si se optimiza otra vez:** hipótesis → implementación mínima → suite completa → gas-report → actualizar este doc y `GAS-ES.md`.
