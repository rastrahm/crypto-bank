# Plan de implementación — Crypto Bank Vault (Módulo 02)

Documento maestro del módulo. Define fases, entregables, criterios de aceptación y el stack acordado para contratos + frontend de demostración en servidor Google.

---

## 1. Objetivo del módulo

Construir un **vault bancario descentralizado** seguro y gas-optimizado que:

- Acepte depósitos de **ETH nativo** y **tokens ERC-20**.
- Mantenga un **ledger interno** por usuario y activo.
- Aplique **Checks-Effects-Interactions (CEI)** y protección contra **reentrancy**.
- Incluya **pausa de emergencia** con control de ownership.
- Exponga un **frontend Next.js** (demo) con **ethers.js v6** para interactuar con el vault.
- Sea desplegable como muestra en un **VPS / servidor Google**.

---

## 2. Stack acordado

| Capa | Tecnología | Notas |
|------|------------|--------|
| Contratos | Solidity `0.8.24` (pragma fijo) | Sin floating pragma |
| Tooling on-chain | Foundry (`forge`, `cast`, `anvil`) | Unit, fuzz, invariant, gas |
| Librerías | OpenZeppelin v5.x (Ownable2Step / Pausable según diseño) | Solo contratos auditados OZ |
| Frontend | Next.js (App Router) + TypeScript | Reglas `nextjs.cursorrules` |
| Web3 en UI | **ethers.js v6** | `BrowserProvider` + `Contract` |
| Validación UI | Zod | Formularios, env, params |
| Tests UI | Vitest + React Testing Library | TDD de interacción |
| Demo server | Node.js + reverse proxy (Nginx) en VPS Google | Build estático o `next start` |
| Red demo | Anvil local / Sepolia (u otra testnet) | Configurable por `.env` |

**Fuera de alcance en v1:** bridges, yield, liquidaciones, multisig avanzado, indexers (The Graph), mobile nativo.

---

## 3. Arquitectura lógica (resumen)

```
Usuario (MetaMask)
       │
       ▼
Next.js App (ethers.js v6)  ──RPC──►  Nodo / Anvil / Testnet
       │                                    │
       │                                    ▼
       └──────── ABI + address ──────► CryptoBankVault
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              Ledger users        Vault balances         Pause / Owner
           (user→token→amt)      (token→total)         Ownable2Step
```

Diagramas detallados:

- [Diagrama de clases](./01-diagrama-clases.md)
- [Diagrama de flujo](./02-diagrama-flujo.md)
- [Flujograma](./03-flujograma.md)

---

## 4. Estructura de repositorio prevista

```
02-crypto-bank/
├── .cursorrules
├── doc/                          # Plan y diagramas (este directorio)
├── foundry.toml
├── remappings.txt
├── src/
│   ├── CryptoBankVault.sol
│   ├── interfaces/ICryptoBankVault.sol
│   └── errors/CryptoBankErrors.sol   # o errors inline en el contrato
├── script/
│   ├── Deploy.s.sol
│   └── DeployMockToken.s.sol         # ERC-20 de prueba para demo
├── test/
│   ├── unit/CryptoBankVault.t.sol
│   ├── attack/ReentrancyAttack.t.sol
│   ├── fuzz/CryptoBankVault.fuzz.t.sol
│   └── invariant/CryptoBankVault.invariant.t.sol
└── frontend/                     # Next.js + ethers.js
    ├── app/
    ├── components/
    ├── lib/contracts.ts          # ABI, address, helpers ethers
    ├── lib/schemas.ts            # Zod
    ├── abi/
    ├── .env.example
    └── ...
```

---

## 5. Fases de implementación

### Fase 0 — Bootstrap del módulo (Foundry + docs)

**Duración estimada:** 0.5 día

| Tarea | Entregable |
|-------|------------|
| Inicializar Foundry (`forge init` / config) | `foundry.toml`, `lib/`, remappings OZ |
| Fijar Solidity `0.8.24` | Compilación limpia |
| Instalar OpenZeppelin v5 | Dependencia pinneada |
| Confirmar layout `doc/` | Plan + diagramas revisados |

**Criterio de salida:** `forge build` OK; estructura de carpetas lista.

---

### Fase 1 — Diseño on-chain y TDD (contratos primero)

**Duración estimada:** 1–2 días  
**Principio:** escribir tests Foundry **antes** o en paralelo inmediato a la implementación (TDD).

#### 1.1 Modelo de datos

- `mapping(address user => mapping(address token => uint256 balance))` ledger.
- Convención: `address(0)` (o constante `NATIVE`) para ETH.
- Totales de vault por token (opcional explícito o derivado de invariantes).

#### 1.2 Superficie del contrato

| Función | Descripción |
|---------|-------------|
| `depositETH()` / `receive` | Depósito ETH; actualizar ledger **antes** de cualquier lógica externa |
| `depositERC20(token, amount)` | `transferFrom` tras effects / approve del usuario |
| `withdrawETH(amount)` | CEI + `.call{value}("")` + check success |
| `withdrawERC20(token, amount)` | CEI + transfer seguro |
| `pause` / `unpause` | Solo owner |
| `transferOwnership` (2-step) | Ownable2Step |
| Views | `balanceOf(user, token)`, `paused()`, `owner()` |

#### 1.3 Errores custom (mínimo)

- `ZeroAmount()`
- `InsufficientVaultBalance()` / `InsufficientBalance()`
- `TransferFailed()`
- `DepositFailed()`
- Errores OZ de pause/ownable según herencia

#### 1.4 Seguridad

- ReentrancyGuard (OZ o custom uint256/transient) **y/o** CEI estricto.
- Actualizar balances **antes** de `.call` / `transfer` / `transferFrom` según el flujo (CEI).
- ETH solo con `.call{value: amount}("")`; nunca `transfer`/`send`.

**Criterio de salida:** interfaz + esqueleto + suite de tests rojos/verdes en camino; NatSpec en públicas/externas.

---

### Fase 2 — Implementación completa del vault + tests

**Duración estimada:** 2–3 días

| Tipo de test | Qué cubre |
|--------------|-----------|
| Unit | Deposit/withdraw ETH y ERC-20; pause; zero amount; insufficient balance |
| Reentrancy | Contrato malicioso que reentra en `withdrawETH` |
| Fuzz | `bound()` en amounts; propiedades depósito↔balance |
| Invariant | Suma de ledger ≤ balance real del contrato por activo |
| Gas report | `forge test --gas-report` (baseline documentado) |

**Criterio de salida:**

- `forge test` verde.
- Cobertura de ramas alta (objetivo suite: ~100% paths explícitos del vault).
- Ataque de reentrancy **falla** (revert / no drenado).

---

### Fase 3 — Scripts de deploy y entorno demo on-chain

**Duración estimada:** 0.5–1 día

| Tarea | Entregable |
|-------|------------|
| `Deploy.s.sol` | Deploy vault + (opcional) mock ERC-20 |
| Variables | `PRIVATE_KEY`, `RPC_URL` en `.env` (nunca commitear secretos) |
| Export ABI | `out/.../CryptoBankVault.json` → `frontend/abi/` |
| Anvil playbook | Comandos para demo local |
| Testnet (opcional) | Sepolia u otra; address documentada |

**Criterio de salida:** deploy reproducible; ABI + address disponibles para el frontend.

---

### Fase 4 — Frontend Next.js + ethers.js v6 (TDD UI)

**Duración estimada:** 2–3 días

#### 4.1 Principios UI

- `'use client'` / `'use server'` explícitos.
- Cero `any`; props tipadas; Zod en inputs (amount, address token).
- JSDoc en componentes/hooks/utilidades.
- ethers solo en cliente: `BrowserProvider`, `JsonRpcProvider`, `Contract`, `parseEther` / `formatEther`.

#### 4.2 Pantallas / features mínimas de demo

1. **Conectar wallet** (MetaMask / EIP-1193).
2. **Ver red y address** del vault configurado.
3. **Depositar ETH** / **Retirar ETH**.
4. **Depositar / retirar ERC-20** (mock token + approve).
5. **Ver saldo** en ledger (`balanceOf`).
6. **Estado paused** (lectura; acciones owner opcionales en panel admin simple).
7. Manejo de errores de tx (user reject, revert custom error).

#### 4.3 Tests frontend

- Vitest + RTL: formularios, validación Zod, botones por rol/accesibilidad.
- Mocks de `ethers` / provider para no depender de MetaMask en CI.

**Criterio de salida:** flujo feliz deposit/withdraw documentado; build `next build` OK; `.env.example` completo.

---

### Fase 5 — Empaquetado y despliegue en servidor Google (demo)

**Duración estimada:** 1 día

| Paso | Detalle |
|------|---------|
| Build | `next build` (+ `next start` o export según estrategia) |
| Proceso | PM2 / systemd para Node |
| Proxy | Nginx → `localhost:3000` (HTTPS con Let’s Encrypt si hay dominio) |
| Env prod | `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_VAULT_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_MOCK_TOKEN` |
| Firewall | Solo 80/443 (+ SSH restringido) |
| Checklist demo | Wallet en la red correcta; faucet/test ETH; mock token minted |

**Criterio de salida:** URL pública de muestra estable; README de operación (arranque, logs, redeploy).

---

### Fase 6 — Hardening, documentación final y handoff

**Duración estimada:** 0.5–1 día

- README del módulo (cómo testear, deploy, frontend, VPS).
- Revisar diagramas vs código final (actualizar si hubo desviaciones).
- Notas de gas / limitaciones conocidas.
- Lista de mejoras futuras (permit ERC-2612, events indexer, Ownable multisig, etc.).

**Criterio de salida:** demo usable por un tercero siguiendo solo `doc/` + README.

---

## 6. Orden de trabajo recomendado (checklist)

```text
[x] Fase 0  Bootstrap Foundry
[x] Fase 1  Diseño + tests iniciales (TDD)
[ ] Fase 2  Vault completo + reentrancy/fuzz/invariant
[ ] Fase 3  Deploy scripts + ABI export
[ ] Fase 4  Frontend Next.js + ethers v6
[ ] Fase 5  Deploy VPS Google
[ ] Fase 6  Docs finales + handoff
```

---

## 7. Variables de entorno (referencia)

### Foundry / deploy

```bash
PRIVATE_KEY=
RPC_URL=
ETHERSCAN_API_KEY=   # opcional verify
```

### Frontend (`frontend/.env.example`)

```bash
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_MOCK_TOKEN_ADDRESS=0x...
```

---

## 8. Criterios de aceptación globales (Definition of Done)

1. Compila con `pragma solidity 0.8.24`.
2. CEI + reentrancy protegido; tests de ataque pasan (ataque no drena).
3. ETH vía `.call` con chequeo de éxito; errores custom.
4. Pause + ownership 2-step (o equivalente explícito).
5. Suite Foundry: unit + reentrancy + fuzz + invariant.
6. Frontend Next.js con ethers.js v6 conecta wallet y opera deposit/withdraw.
7. Demo desplegable en servidor Google con env documentado.
8. `doc/` alineado con la implementación final.

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Reentrancy en withdraw ETH | CEI + ReentrancyGuard + test malicioso |
| Tokens no estándar (fee-on-transfer) | Documentar: solo ERC-20 “honestos” en v1; o medir balance delta |
| Frontend SSR + window.ethereum | Lógica ethers solo en client components |
| RPC inestable en VPS | RPC público de respaldo + mensaje de error claro |
| Secretos en git | `.gitignore` + solo `NEXT_PUBLIC_*` en cliente |

---

## 10. Próximo paso inmediato

Al aprobar este plan: **ejecutar Fase 0** (bootstrap Foundry) y abrir **Fase 1** con la interfaz `ICryptoBankVault` + primer test de depósito ETH en rojo.
