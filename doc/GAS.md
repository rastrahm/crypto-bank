# Optimización de gas — CryptoBankVault (Fase 2)

## Cambios aplicados

| Optimización | Tradeoff | Efecto esperado |
|--------------|----------|-----------------|
| `ReentrancyGuardTransient` (EIP-1153) | Requiere EVM Cancun+ (`evm_version = "cancun"`) | Guard más barato (transient vs storage) |
| `unchecked` en restas de ledger tras `bal >= amount` | Solo válido si el check previo se mantiene | Ahorra gas del overflow check en subtract |
| Cache de `msg.sender` en paths de deposit/withdraw | Ninguno | Menos opcodes `CALLER` repetidos |
| Sin `balanceOf` before/after en `depositERC20` | **Obsoleto (Fase fee-aware):** ahora se mide delta | Ver sección siguiente |
| Pause una sola vez (`whenNotPaused` / check en `receive`) | `_creditNative` asume caller ya validó pausa | Evita SLOAD duplicado de `paused` |
| Custom errors (ya en Fase 1) | — | Más barato que `require` con string |

## Baseline (Fase 1, pre-opt) vs post-opt (unit gas-report)

Medido con `forge test --match-contract CryptoBankVaultTest --gas-report`.

| Métrica | Antes (Fase 1) | Después (Fase 2) | Δ |
|---------|----------------|------------------|---|
| Deployment Cost | 806 457 | 749 800 | **−56 657** |
| Deployment Size | 3559 | 3396 | −163 bytes |
| `depositETH` avg | 43 753 | 43 634 | −119 |
| `withdrawETH` avg | 31 810 | 29 132 | **−2 678** |
| `depositERC20` avg | 57 956 | 53 655 | **−4 301** |
| `withdrawERC20` avg | 40 690 | 37 340 | **−3 350** |

> `gas-report.txt` está en `.gitignore`; regenerar con el comando de arriba.

## Fuera de alcance (no optimizado a propósito)

- Fee-on-transfer en **retiro** y tokens rebase / `balanceOf` mentiroso allowlisted: ver [`LIMITACIONES.md`](./LIMITACIONES.md).
- Allowlist + `_totalBalances` + rescue: coste de storage/lecturas a cambio de solvencia y ops; no “des-optimizar” sin medir.
- Assembly en `.call` ETH: ahorro marginal vs legibilidad.
- Packing extra de storage: el ledger ya es un mapping anidado (slot por user+token).

## Fee-on-transfer en depósito (mitigado)

`depositERC20` hace `balanceOf` before/after y acredita solo el delta. Coste: ~2 calls externos extra por depósito vs Fase 2 “honest only”. Tradeoff aceptado para evitar insolvencia contable. El **retiro** no re-mide el delta (limitación documentada).
