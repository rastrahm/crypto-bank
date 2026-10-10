# Attack campaigns — CryptoBankVault
> 🇪🇸 [Versión en español](./ATAQUES-ES.md)

> **Protocol:** defensive Foundry tests (`vm.expectRevert` / invariants). A successful “attack” means it **fails** or is documented as a limitation of the standard.  
> **Out of scope:** exploit scripts, offensive payloads, or procedures to extract other users' funds.

Contract: `src/CryptoBankVault.sol`  
Audit: [`SWC-AUDIT-EN.md`](./SWC-AUDIT-EN.md)

---

## Summary

| Campaign | Name | SWC / topic | Status |
|----------|------|-------------|--------|
| A | Ledger + allowance integrity (external ERC-20) | SWC-101, 105, 123 | ✅ |
| B | Permit / replay / malleability | SWC-117, 121, 122 | ✅ N/A (no permit in vault) |
| C | Transaction ordering | SWC-114 (ERC-20) | ✅ Documentary |
| D | `unchecked` arithmetic | SWC-101 | ✅ |
| E | Surface / checklist | SWC-105–107, 112, 132 | ✅ |

---

## Campaign A — Balance and allowance integrity

**Hypothesis:** nobody moves funds out of the vault without a ledger credit; `depositERC20` requires a sufficient allowance on the external token; no user's balance can be touched by someone else.

| # | Scenario | Expected result | Test |
|---|----------|-----------------|------|
| A1 | `withdrawETH` > ledger | `InsufficientVaultBalance` | `test_AttackA1_*` |
| A2 | `withdrawETH` without a deposit | `InsufficientVaultBalance` | `test_AttackA2_*` |
| A3 | `depositERC20` without `approve` | SafeERC20 / allowance revert | `test_AttackA3_*` |
| A4 | `depositERC20` with partial allowance | revert | `test_AttackA4_*` |
| A5 | Bob cannot withdraw Alice's ledger | Alice's ledger intact | `test_AttackA5_*` |
| A6 | `withdrawERC20` > ledger | `InsufficientVaultBalance` | `test_AttackA6_*` |
| A7 | `depositERC20(address(0))` | `InvalidToken` | `test_AttackA7_*` |
| A8 | Receiver that rejects ETH | `TransferFailed` | `test_AttackA8_*` |
| A9 | Non-owner calls `pause` | Ownable revert | `test_AttackA9_*` |
| A10 | Fee-on-transfer does not inflate ledger | ledger == balance received | `test_AttackA10_*` |
| A11 | Deposit of a non-allowlisted ERC-20 | `TokenNotAllowed` | `test_AttackA11_*` |
| A12 | Rescue does not drain ledger | `RescueExceedsSurplus` | `test_AttackA12_*` |

---

## Campaign B — Permit replay and malleability

**N/A hypothesis:** the vault does **not** implement EIP-2612 nor verify signatures.

| # | Scenario | Classification | Action |
|---|----------|----------------|--------|
| B0 | `permit` / `ecrecover` / nonces surface | Absent in `CryptoBankVault.sol` | Static checklist `test_AttackB0_NoPermitSurface` |
| B1–B9 | Replay, `s` malleability, deadline, domain | Apply to the **token** with permit, not to the vault | N/A — see module `01-erc20` |

---

## Campaign C — Transaction ordering (SWC-114)

**Hypothesis:** the vault cannot eliminate the ERC-20 `approve` race; the behavior of the token used in the demo is documented.

| # | Scenario | Classification | Test |
|---|----------|----------------|------|
| C1 | `approve` N→M without going through 0 | ERC-20 limitation | `test_AttackC1_ApproveOverwriteWithoutZeroing` |

Off-chain mitigation: `approve(0)` then the new amount; or `permit` on the token (not on the vault).

---

## Campaign D — `unchecked` arithmetic

**Hypothesis:** after `bal >= amount`, the `unchecked` subtraction does not underflow.

| # | Scenario | Expected result | Test |
|---|----------|-----------------|------|
| D1 | ETH withdrawal of the exact balance | ledger 0; ETH sent | `test_AttackD1_*` |
| D2 | ERC-20 withdrawal of the exact balance | ledger 0; tokens sent | `test_AttackD2_*` |
| D3 | Two partial withdrawals adding up to the total | OK; third withdrawal fails | `test_AttackD3_*` |

---

## Campaign E — Surface checklist

Unlike the pure token from module 01, the vault **does** handle ETH and **does** carry reentrancy risk (mitigated).

| SWC | Title | Vault status | Evidence |
|-----|-------|--------------|----------|
| 105 | Unprotected Ether Withdrawal | ✅ Mitigated | Own ledger only + pause + CEI |
| 106 | Unprotected SELFDESTRUCT | ✅ N/A | No `selfdestruct` in src |
| 107 | Reentrancy | ✅ Mitigated | Guard + CEI; attack fails |
| 112 | Delegatecall | ✅ N/A | No `delegatecall` |
| 132 | Unexpected Ether | ⚠️ Informational | Forced ETH does not credit the ledger |

| # | Scenario | Test |
|---|----------|------|
| E1 | Reentrancy on `withdrawETH` does not drain | `test_AttackE1_*` (alias of the attack test) |
| E2 | Forced ETH does not increase the ledger | `test_AttackE2_*` |
| E3 | No `SELFDESTRUCT` / `DELEGATECALL` in runtime bytecode | `test_AttackE3_*` |
| E4 | Pause blocks deposits via `receive` | `test_AttackE4_*` |

---

## Execution

```bash
export PATH="$HOME/.foundry/bin:$PATH"
forge test --match-test test_Attack -vv
```

---

## Closure

**Status:** ✅ Closed — 2026-08-24 (campaigns A–E implemented and green).
