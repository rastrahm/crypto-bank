# Auditoría SWC — CryptoBankVault

Verificación de `CryptoBankVault` contra el [SWC Registry](https://swcregistry.io/) (EIP-1470).

> **Nota:** El SWC Registry no se mantiene activamente desde ~2020. Complementar con [SCSVS](https://github.com/ComposableSecurity/SCSVS) y [EEA EthTrust](https://entethalliance.org/specs/ethtrust/).

**Contrato auditado:** `src/CryptoBankVault.sol`  
**Fecha:** 2026-08-24  
**Referencia tests:** `test/unit/`, `test/attack/`, `test/fuzz/`, `test/invariant/`

---

## Resumen ejecutivo

| Estado | Cantidad |
|--------|----------|
| ✅ Mitigado / No aplicable | 34 |
| ⚠️ Informativo (diseño / estándar) | 3 |
| ❌ Vulnerable | 0 |

**Conclusión:** Sin vulnerabilidades SWC explotables en el alcance del vault. Ítems informativos: race de `approve` ERC-20 externo (SWC-114), tokens no estándar (fee-on-transfer), y ETH forzado al contrato (solvencia ≥ ledger se mantiene).

**Fuera de superficie del vault:** EIP-2612 / permit / malleabilidad de firmas / replay de permit — el vault **no** implementa `permit`; esas campañas del módulo ERC-20 son **N/A** aquí (ver [`ATAQUES.md`](./ATAQUES.md) campaña B).

---

## Matriz completa SWC-100 — SWC-136

| ID | Título | Aplica | Estado | Evidencia en `CryptoBankVault` |
|----|--------|--------|--------|--------------------------------|
| SWC-100 | Function Default Visibility | Sí | ✅ | Visibilidad explícita en todas las funciones |
| SWC-101 | Integer Overflow and Underflow | Sí | ✅ | Solidity 0.8.24; `unchecked` solo tras `bal >= amount` |
| SWC-102 | Outdated Compiler Version | Sí | ✅ | `pragma solidity 0.8.24` + `foundry.toml` |
| SWC-103 | Floating Pragma | Sí | ✅ | Pragma exacto `0.8.24` |
| SWC-104 | Unchecked Call Return Value | Sí | ✅ | ETH: `(bool ok,) = call…; if (!ok) revert`; ERC-20: `SafeERC20` |
| SWC-105 | Unprotected Ether Withdrawal | Sí | ✅ | Retiros solo debitan ledger del `msg.sender`; pause + `nonReentrant` |
| SWC-106 | Unprotected SELFDESTRUCT | No | N/A | Sin `selfdestruct` |
| SWC-107 | Reentrancy | Sí | ✅ | CEI + `ReentrancyGuardTransient`; `test_Attack_Reentrancy*` / `test_AttackE_*` |
| SWC-108 | State Variable Default Visibility | Sí | ✅ | `_balances` private; `NATIVE` constant public |
| SWC-109 | Uninitialized Storage Pointer | No | N/A | Sin punteros storage legacy |
| SWC-110 | Assert Violation | No | N/A | Sin `assert` de producción |
| SWC-111 | Deprecated Solidity Functions | Sí | ✅ | Sin `suicide` / `throw` / `tx.origin` |
| SWC-112 | Delegatecall to Untrusted Callee | No | N/A | Sin `delegatecall` |
| SWC-113 | DoS with Failed Call | Parcial | ✅ | Fallo de `.call` → `TransferFailed` (no deja estado inconsistente: tx revierte) |
| SWC-114 | Transaction Order Dependence | Sí | ⚠️ | Race de `approve` del **ERC-20 externo** (estándar); ver informativos |
| SWC-115 | Authorization through tx.origin | No | N/A | No se usa `tx.origin` |
| SWC-116 | Block values as a proxy for time | No | N/A | Sin lógica basada en `block.timestamp` / `blockhash` |
| SWC-117 | Signature Malleability | No | N/A | Sin firmas / `ecrecover` / permit |
| SWC-118 | Incorrect Constructor Name | No | N/A | `constructor` 0.8+ |
| SWC-119 | Shadowing State Variables | Sí | ✅ | Sin shadowing con OZ |
| SWC-120 | Weak Sources of Randomness | No | N/A | Sin RNG on-chain |
| SWC-121 | Missing Protection against Signature Replay | No | N/A | Sin firmas que reutilizar |
| SWC-122 | Lack of Proper Signature Verification | No | N/A | Sin verificación de firmas |
| SWC-123 | Requirement Violation | Sí | ✅ | Checks + custom errors; suite unit/fuzz/invariant |
| SWC-124 | Write to Arbitrary Storage Location | No | N/A | Sin assembly que escriba storage arbitrario |
| SWC-125 | Incorrect Inheritance Order | Sí | ✅ | `ICryptoBankVault, Ownable2Step, Pausable, ReentrancyGuardTransient` |
| SWC-126 | Insufficient Gas Griefing | No | N/A | Sin relayers con stipend fijo |
| SWC-127 | Arbitrary Jump with Function Type Variable | No | N/A | Sin function types dinámicos |
| SWC-128 | DoS With Block Gas Limit | Parcial | ✅ | Paths O(1); sin loops sobre input de usuario |
| SWC-129 | Typographical Error | Sí | ✅ | Revisión + `forge build` / tests |
| SWC-130 | Right-To-Left-Override | No | N/A | Strings ASCII |
| SWC-131 | Presence of unused variables | Sí | ✅ | Sin variables muertas materiales |
| SWC-132 | Unexpected Ether balance | Sí | ⚠️ | ETH forzado (p. ej. `selfdestruct`) no acredita ledger; solvencia `balance ≥ Σ ledger` se mantiene |
| SWC-133 | Hash Collisions (var-length args) | No | N/A | Sin hashing multi-dinámico propio |
| SWC-134 | Message call with hardcoded gas | No | N/A | `.call{value}` sin `{gas: …}` |
| SWC-135 | Code With No Effects | No | N/A | Sin statements vacíos relevantes |
| SWC-136 | Unencrypted Private Data On-Chain | Parcial | ✅ | Ledger privado vía mapping; lecturas públicas `balanceOf` por diseño |

---

## Riesgos informativos

### SWC-114 — Front-running de `approve` (ERC-20 externo)

El vault no gestiona allowances. El usuario debe `approve(vault, amount)` en el token antes de `depositERC20`. Ese `approve` hereda el race clásico ERC-20.

**Mitigación de producto:** `approve(0)` antes de cambiar allowance, o tokens con `permit` usados solo en el token (no en el vault).

### SWC-132 — ETH inesperado

Si se fuerza ETH al vault sin pasar por `depositETH`/`receive`, el balance físico sube pero el ledger no. Los retiros siguen limitados al ledger → no hay drenado contable. Invariante: `address(vault).balance >= Σ balances[*][NATIVE]`.

### Tokens no estándar

`depositERC20` asume ERC-20 honestos (sin fee-on-transfer). Documentado en NatSpec / `doc/GAS.md`.

---

## Mapeo SWC → tests

| SWC | Test(s) |
|-----|---------|
| SWC-101 | `test_AttackD_*`, fuzz, invariant |
| SWC-104 / 113 | `test_AttackA_WithdrawETH_RejectingReceiver` |
| SWC-105 | `test_AttackA_*` (solo ledger propio) |
| SWC-107 | `test_Attack_ReentrancyOnWithdrawETH_*`, `test_AttackE_ReentrancyBlocked` |
| SWC-114 | `test_AttackC1_ApproveOverwriteWithoutZeroing` (documental) |
| SWC-132 | `test_AttackE_ForcedEthDoesNotCreditLedger` |

---

## Referencias

- [SWC Registry](https://swcregistry.io/)
- Campañas: [`ATAQUES.md`](./ATAQUES.md)
- Gas / tokens honestos: [`GAS.md`](./GAS.md)
