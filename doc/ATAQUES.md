# Campañas de ataque — CryptoBankVault

> **Protocolo:** tests Foundry defensivos (`vm.expectRevert` / invariantes). El éxito del “ataque” es que **falle** o quede documentado como limitación de estándar.  
> **Fuera de alcance:** scripts de exploit, payloads ofensivos, o procedimientos para extraer fondos ajenos.

Contrato: `src/CryptoBankVault.sol`  
Auditoría: [`SWC-AUDIT.md`](./SWC-AUDIT.md)

---

## Resumen

| Campaña | Nombre | SWC / tema | Estado |
|---------|--------|------------|--------|
| A | Integridad ledger + allowances (ERC-20 externo) | SWC-101, 105, 123 | ✅ |
| B | Permit / replay / malleabilidad | SWC-117, 121, 122 | ✅ N/A (sin permit en vault) |
| C | Orden de transacciones | SWC-114 (ERC-20) | ✅ Documental |
| D | Aritmética `unchecked` | SWC-101 | ✅ |
| E | Superficie / checklist | SWC-105–107, 112, 132 | ✅ |

---

## Campaña A — Integridad de balances y allowances

**Hipótesis:** nadie mueve fondos del vault sin crédito en ledger; `depositERC20` exige allowance suficiente en el token externo; no se toca el saldo de otro usuario.

| # | Escenario | Resultado esperado | Test |
|---|-----------|--------------------|------|
| A1 | `withdrawETH` > ledger | `InsufficientVaultBalance` | `test_AttackA1_*` |
| A2 | `withdrawETH` sin depósito | `InsufficientVaultBalance` | `test_AttackA2_*` |
| A3 | `depositERC20` sin `approve` | revert SafeERC20 / allowance | `test_AttackA3_*` |
| A4 | `depositERC20` con allowance parcial | revert | `test_AttackA4_*` |
| A5 | Bob no puede retirar ledger de Alice | ledger de Alice intacto | `test_AttackA5_*` |
| A6 | `withdrawERC20` > ledger | `InsufficientVaultBalance` | `test_AttackA6_*` |
| A7 | `depositERC20(address(0))` | `InvalidToken` | `test_AttackA7_*` |
| A8 | Receptor que rechaza ETH | `TransferFailed` | `test_AttackA8_*` |
| A9 | No-owner llama `pause` | revert Ownable | `test_AttackA9_*` |
| A10 | Fee-on-transfer no infla ledger | ledger == balance recibido | `test_AttackA10_*` |
| A11 | Depósito ERC-20 no allowlisted | `TokenNotAllowed` | `test_AttackA11_*` |
| A12 | Rescue no drena ledger | `RescueExceedsSurplus` | `test_AttackA12_*` |

---

## Campaña B — Replay y malleabilidad de permit

**Hipótesis N/A:** el vault **no** implementa EIP-2612 ni verifica firmas.

| # | Escenario | Clasificación | Acción |
|---|-----------|---------------|--------|
| B0 | Superficie `permit` / `ecrecover` / nonces | Ausente en `CryptoBankVault.sol` | Checklist estático `test_AttackB0_NoPermitSurface` |
| B1–B9 | Replay, malleabilidad `s`, deadline, domain | Aplican al **token** con permit, no al vault | N/A — ver módulo `01-erc20` |

---

## Campaña C — Orden de transacciones (SWC-114)

**Hipótesis:** el vault no puede eliminar el race de `approve` del ERC-20; se documenta el comportamiento del token usado en demo.

| # | Escenario | Clasificación | Test |
|---|-----------|---------------|------|
| C1 | `approve` N→M sin pasar por 0 | Limitación ERC-20 | `test_AttackC1_ApproveOverwriteWithoutZeroing` |

Mitigación off-chain: `approve(0)` luego nuevo amount; o `permit` en el token (no en el vault).

---

## Campaña D — Aritmética `unchecked`

**Hipótesis:** tras `bal >= amount`, la resta `unchecked` no underflow.

| # | Escenario | Resultado esperado | Test |
|---|-----------|--------------------|------|
| D1 | Retiro ETH del balance exacto | ledger 0; ETH enviado | `test_AttackD1_*` |
| D2 | Retiro ERC-20 del balance exacto | ledger 0; tokens enviados | `test_AttackD2_*` |
| D3 | Dos retiros parciales que suman el total | OK; tercer retiro falla | `test_AttackD3_*` |

---

## Campaña E — Checklist de superficie

A diferencia del token puro del módulo 01, el vault **sí** maneja ETH y **sí** tiene riesgo de reentrancy (mitigado).

| SWC | Título | Estado vault | Evidencia |
|-----|--------|--------------|-----------|
| 105 | Unprotected Ether Withdrawal | ✅ Mitigado | Solo ledger propio + pause + CEI |
| 106 | Unprotected SELFDESTRUCT | ✅ N/A | Sin `selfdestruct` en src |
| 107 | Reentrancy | ✅ Mitigado | Guard + CEI; ataque falla |
| 112 | Delegatecall | ✅ N/A | Sin `delegatecall` |
| 132 | Unexpected Ether | ⚠️ Informativo | ETH forzado no acredita ledger |

| # | Escenario | Test |
|---|-----------|------|
| E1 | Reentrancy en `withdrawETH` no drena | `test_AttackE1_*` (alias del test attack) |
| E2 | ETH forzado no aumenta ledger | `test_AttackE2_*` |
| E3 | Sin `SELFDESTRUCT` / `DELEGATECALL` en bytecode runtime | `test_AttackE3_*` |
| E4 | Pause bloquea depósito vía `receive` | `test_AttackE4_*` |

---

## Ejecución

```bash
export PATH="$HOME/.foundry/bin:$PATH"
forge test --match-test test_Attack -vv
```

---

## Cierre

**Estado:** ✅ Cerrado — 2026-08-24 (campañas A–E implementadas y verdes).
