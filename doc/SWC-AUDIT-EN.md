# SWC Audit — CryptoBankVault
> 🇪🇸 [Versión en español](./SWC-AUDIT-ES.md)

Verification of `CryptoBankVault` against the [SWC Registry](https://swcregistry.io/) (EIP-1470).

> **Note:** The SWC Registry has not been actively maintained since ~2020. Complement it with [SCSVS](https://github.com/ComposableSecurity/SCSVS) and [EEA EthTrust](https://entethalliance.org/specs/ethtrust/).

**Audited contract:** `src/CryptoBankVault.sol`  
**Date:** 2026-08-24  
**Test reference:** `test/unit/`, `test/attack/`, `test/fuzz/`, `test/invariant/`

---

## Executive summary

| Status | Count |
|--------|-------|
| ✅ Mitigated / Not applicable | 34 |
| ⚠️ Informational (design / standard) | 1 |
| ❌ Vulnerable | 0 |

**Conclusion:** No exploitable SWC vulnerabilities within the vault's scope. Informational item: external ERC-20 `approve` race (SWC-114; the frontend already does approve 0→N). Fee-on-transfer + allowlist + surplus rescue are covered.

**Outside the vault's surface:** EIP-2612 / permit / signature malleability / permit replay — the vault does **not** implement `permit`; those campaigns from the ERC-20 module are **N/A** here (see [`ATAQUES-EN.md`](./ATAQUES-EN.md) campaign B).

---

## Full SWC-100 — SWC-136 matrix

| ID | Title | Applies | Status | Evidence in `CryptoBankVault` |
|----|-------|---------|--------|-------------------------------|
| SWC-100 | Function Default Visibility | Yes | ✅ | Explicit visibility on all functions |
| SWC-101 | Integer Overflow and Underflow | Yes | ✅ | Solidity 0.8.24; `unchecked` only after `bal >= amount` |
| SWC-102 | Outdated Compiler Version | Yes | ✅ | `pragma solidity 0.8.24` + `foundry.toml` |
| SWC-103 | Floating Pragma | Yes | ✅ | Exact pragma `0.8.24` |
| SWC-104 | Unchecked Call Return Value | Yes | ✅ | ETH: `(bool ok,) = call…; if (!ok) revert`; ERC-20: `SafeERC20` |
| SWC-105 | Unprotected Ether Withdrawal | Yes | ✅ | Withdrawals only debit the `msg.sender` ledger; pause + `nonReentrant` |
| SWC-106 | Unprotected SELFDESTRUCT | No | N/A | No `selfdestruct` |
| SWC-107 | Reentrancy | Yes | ✅ | CEI + `ReentrancyGuardTransient`; `test_Attack_Reentrancy*` / `test_AttackE_*` |
| SWC-108 | State Variable Default Visibility | Yes | ✅ | `_balances` private; `NATIVE` constant public |
| SWC-109 | Uninitialized Storage Pointer | No | N/A | No legacy storage pointers |
| SWC-110 | Assert Violation | No | N/A | No production `assert` |
| SWC-111 | Use of Deprecated Solidity Functions | Yes | ✅ | No `suicide` / `throw` / `tx.origin` |
| SWC-112 | Delegatecall to Untrusted Callee | No | N/A | No `delegatecall` |
| SWC-113 | DoS with Failed Call | Partial | ✅ | `.call` failure → `TransferFailed` (no inconsistent state left: tx reverts) |
| SWC-114 | Transaction Order Dependence | Yes | ⚠️ | `approve` race of the **external ERC-20** (standard); see informational items |
| SWC-115 | Authorization through tx.origin | No | N/A | `tx.origin` is not used |
| SWC-116 | Block values as a proxy for time | No | N/A | No logic based on `block.timestamp` / `blockhash` |
| SWC-117 | Signature Malleability | No | N/A | No signatures / `ecrecover` / permit |
| SWC-118 | Incorrect Constructor Name | No | N/A | 0.8+ `constructor` |
| SWC-119 | Shadowing State Variables | Yes | ✅ | No shadowing with OZ |
| SWC-120 | Weak Sources of Randomness from Chain Attributes | No | N/A | No on-chain RNG |
| SWC-121 | Missing Protection against Signature Replay Attacks | No | N/A | No signatures to reuse |
| SWC-122 | Lack of Proper Signature Verification | No | N/A | No signature verification |
| SWC-123 | Requirement Violation | Yes | ✅ | Checks + custom errors; unit/fuzz/invariant suite |
| SWC-124 | Write to Arbitrary Storage Location | No | N/A | No assembly writing arbitrary storage |
| SWC-125 | Incorrect Inheritance Order | Yes | ✅ | `ICryptoBankVault, Ownable2Step, Pausable, ReentrancyGuardTransient` |
| SWC-126 | Insufficient Gas Griefing | No | N/A | No relayers with a fixed stipend |
| SWC-127 | Arbitrary Jump with Function Type Variable | No | N/A | No dynamic function types |
| SWC-128 | DoS With Block Gas Limit | Partial | ✅ | O(1) paths; no loops over user input |
| SWC-129 | Typographical Error | Yes | ✅ | Review + `forge build` / tests |
| SWC-130 | Right-To-Left-Override control character (U+202E) | No | N/A | ASCII strings |
| SWC-131 | Presence of unused variables | Yes | ✅ | No material dead variables |
| SWC-132 | Unexpected Ether balance | Yes | ✅ | Forced ETH = `surplusETH()`; `rescueETH` surplus only; ledger intact |
| SWC-133 | Hash Collisions With Multiple Variable Length Arguments | No | N/A | No custom multi-dynamic hashing |
| SWC-134 | Message call with hardcoded gas amount | No | N/A | `.call{value}` without `{gas: …}` |
| SWC-135 | Code With No Effects | No | N/A | No relevant empty statements |
| SWC-136 | Unencrypted Private Data On-Chain | Partial | ✅ | Private ledger via mapping; public `balanceOf` reads by design |

---

## Informational risks

### SWC-114 — `approve` front-running (external ERC-20)

The vault does not manage allowances. The user must `approve(vault, amount)` on the token before `depositERC20`. That `approve` inherits the classic ERC-20 race.

**Product mitigation:** `approve(0)` before changing the allowance, or tokens with `permit` used only on the token (not on the vault).

### SWC-132 — Unexpected ETH

If ETH is forced into the vault without going through `depositETH`/`receive`, the physical balance rises but the ledger does not. That excess is `surplusETH()` and only the owner can rescue it with `rescueETH` (never above the surplus). User withdrawals remain limited to the ledger.

### Non-standard tokens

See full details in [`LIMITACIONES-EN.md`](./LIMITACIONES-EN.md).

- **Fee-on-transfer (deposit):** mitigated — `depositERC20` credits the actual `balanceOf` delta; `received == 0` → `DepositFailed`.
- **Fee-on-transfer (withdrawal):** the user may receive less than the `amount` debited from the ledger (token behavior). Accepted / documented.
- **Rebasing / malicious ERC-20:** only allowlisted tokens can be deposited. Delisting does not block already-credited withdrawals.
- **Residual risk:** an allowlisted token that rebases or lies in `balanceOf` remains dangerous; the allowlist is trust in the owner.

---

## SWC → tests mapping

| SWC | Test(s) |
|-----|---------|
| SWC-101 | `test_AttackD_*`, fuzz, invariant |
| SWC-104 / 113 | `test_AttackA_WithdrawETH_RejectingReceiver` |
| SWC-105 | `test_AttackA_*` (own ledger only) |
| SWC-107 | `test_Attack_ReentrancyOnWithdrawETH_*`, `test_AttackE_ReentrancyBlocked` |
| SWC-114 | `test_AttackC1_ApproveOverwriteWithoutZeroing` (documentary) |
| SWC-132 | `test_AttackE_ForcedEthDoesNotCreditLedger`, `test_AttackA12_*`, `test_RescueETH_*` |

---

## References

- [SWC Registry](https://swcregistry.io/)
- Campaigns: [`ATAQUES-EN.md`](./ATAQUES-EN.md)
- Gas / tokens: [`GAS-EN.md`](./GAS-EN.md)
- Accepted limitations: [`LIMITACIONES-EN.md`](./LIMITACIONES-EN.md)
