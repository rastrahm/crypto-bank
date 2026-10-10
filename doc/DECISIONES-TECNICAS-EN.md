# Technical decisions, logic and gas — CryptoBankVault
> 🇪🇸 [Versión en español](./DECISIONES-TECNICAS-ES.md)

A document to understand **what was built**, **why** it was designed that way, **how** the system flows, and **what could be improved in gas** without compromising security.

Contract: [`src/CryptoBankVault.sol`](../src/CryptoBankVault.sol)  
Complements: [`GAS-EN.md`](./GAS-EN.md), [`LIMITACIONES-EN.md`](./LIMITACIONES-EN.md), [`SWC-AUDIT-EN.md`](./SWC-AUDIT-EN.md).

---

## 1. What it is (in one sentence)

A **multi-asset vault** that holds ETH and ERC-20 tokens, keeps an **internal accounting ledger** per user/token, and only allows withdrawing what has been credited — with emergency pause, a token allowlist, and reentrancy protection.

---

## 2. Technical decisions (and why)

### 2.1 On-chain stack

| Decision | Choice | Reason |
|----------|--------|--------|
| Compiler | Fixed `pragma solidity 0.8.24` | Avoids floating pragma (SWC-103); native overflow checks |
| EVM | Cancun (`evm_version = "cancun"`) | Enables EIP-1153 (transient storage) |
| Access control | OpenZeppelin `Ownable2Step` | Two-step ownership transfer (fewer operational mistakes) |
| Emergency | `Pausable` | Freezes deposits **and** withdrawals under owner control |
| Reentrancy | `ReentrancyGuardTransient` | Cheaper than the classic storage-based guard |
| ERC-20 | `SafeERC20` | Tokens that don't return `bool` don't break the vault |
| Errors | Custom errors | Cheaper and typed compared to `require("string")` |
| ETH out | `.call{value}("")` + check | Current standard; reverts if the receiver rejects |

### 2.2 Funds model: ledger ≠ physical balance

There are **two layers**:

1. **Physical:** ETH in `address(this).balance` / tokens in `balanceOf(vault)`.
2. **Accounting:** `_balances[user][token]` and its sum `_totalBalances[token]`.

**Golden rule:** a user can only withdraw what they have in the ledger.  
If someone sends ETH/tokens “by force” (e.g. `selfdestruct` / direct `transfer`), the physical balance goes up but the ledger does **not** → that is **surplus**, and only the owner can rescue it (`rescueETH` / `rescueERC20`), never above the surplus.

### 2.3 Native sentinel

`NATIVE = address(0)` represents ETH in the same mapping as ERC-20 tokens.  
This avoids a separate mapping and unifies `_credit` / `_debit`.

### 2.4 ERC-20 allowlist

Only tokens with `_allowedTokens[token] == true` can be **deposited**.  
**Withdrawals do not require the allowlist:** if the owner delists a token, anyone who already had a balance can still withdraw.

**Tradeoff:** the allowlist is owner policy (trust), not a cryptographic proof that the token is “honest” (rebasing / lying `balanceOf`). See [`LIMITACIONES-EN.md`](./LIMITACIONES-EN.md).

### 2.5 Order of operations (security)

| Path | Pattern | Why |
|------|---------|-----|
| `withdrawETH` / `withdrawERC20` | **Effects → Interactions** (CEI) | Debit the ledger **before** the `.call` / `transfer` (reentrancy) |
| `depositERC20` | Interactions → Effects | The received **delta** must be measured; the credit depends on what actually arrived |
| All value paths | `nonReentrant` | Uniform surface (also `receive` / rescue) |
| ETH deposit | `whenNotPaused` / check in `receive` | Emergency handling without a modifier on `receive` |

### 2.6 Fee-on-transfer

- **Deposit:** `balanceAfter - balanceBefore` is credited (not the requested `amount`). If nothing arrives → `DepositFailed`.
- **Withdrawal:** `amount` is debited and `amount` is transferred. If the token charges a fee on the way out, the user may receive less (accepted / documented limitation).

### 2.7 Frontend (product decisions)

| Decision | Reason |
|----------|--------|
| Next.js + ethers v6 (no Wagmi) | Explicit demo, fewer layers |
| EIP-6963 multi-wallet | Multiple extensions without fighting over `window.ethereum` alone |
| `NEXT_PUBLIC_ASSETS` + decimals | Multi-market from env |
| Signature-based login in `localStorage` | Demo UX; **not** SIWE/server-side |
| Approve `0 → N` (or the token's permit) | Mitigates the SWC-114 race of the external ERC-20 |

---

## 3. Logic the system follows

### 3.1 Mental model diagram

```text
User                       CryptoBankVault                 Token / network
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

### 3.2 ETH deposit

1. `whenNotPaused` + `nonReentrant` (or the pause check in `receive`).
2. `_credit(msg.sender, NATIVE, msg.value)` → increases the ledger and `_totalBalances`.
3. Emits `Deposited`.
4. The physical ETH is already in the contract thanks to `payable`.

Equivalent: sending ETH directly to the vault (`receive`) under the same rules.

### 3.3 ERC-20 deposit

1. Checks: not `NATIVE`, allowlisted, `amount > 0`.
2. `balanceOf(vault)` before → `safeTransferFrom` → `balanceOf` after.
3. `received = after - before` (unchecked after `after > before`).
4. `_credit(account, token, received)`.

### 3.4 ETH / ERC-20 withdrawal

1. `_debit`: if `amount == 0` or `bal < amount` → revert.
2. Updates `_balances` and `_totalBalances` (**before** sending).
3. Emits `Withdrawn`.
4. Sends funds (`.call` / `safeTransfer`). If it fails → the whole tx reverts (state intact).

### 3.5 Admin

| Function | Who | Effect |
|----------|-----|--------|
| `pause` / `unpause` | Owner | Blocks / reopens deposits and withdrawals |
| `setTokenAllowed` | Owner | Adds/removes a token for **new** deposits |
| `rescueETH` / `rescueERC20` | Owner | Withdraws only the surplus (`physical - totalBalance`) |

### 3.6 Invariants the design protects

- Nobody withdraws more than their ledger balance.
- Nobody withdraws someone else's ledger balance.
- Reentrancy on withdraw does not drain funds (CEI + guard).
- “Phantom” ETH/tokens do not inflate the ledger; they only create rescuable surplus.
- Pause stops new user operations.

---

## 4. Gas: what has already been done

Historical measurement (Phase 1 → Phase 2, unit gas-report). Details in [`GAS-EN.md`](./GAS-EN.md):

| Metric | Approximate Δ |
|--------|---------------|
| Deploy | **−56 657** |
| `withdrawETH` avg | **−2 678** |
| `depositERC20` avg | **−4 301** (before the fee-aware delta) |
| `withdrawERC20` avg | **−3 350** |

Techniques applied:

1. `ReentrancyGuardTransient` (EIP-1153).
2. `unchecked` in ledger subtractions after `bal >= amount`.
3. Caching `msg.sender`.
4. Custom errors.
5. Pause validated only once per path (avoids a duplicate SLOAD).

**Deliberate later cost:** `depositERC20` once again pays for ~2 `balanceOf` calls in order to be fee-aware. Accounting safety > micro-savings.

---

## 5. Can gas be improved further?

Yes, but almost everything is a **security / clarity / features tradeoff**. Prioritized:

### 5.1 Realistic improvements (relatively low risk)

| Idea | Expected savings | Risk / cost |
|------|------------------|-------------|
| Remove `nonReentrant` from pure `depositETH` (value only, no external call) | Low–medium | Must re-validate that there is no reentry path via `receive` during other flows; it was unified on purpose |
| `transient` / packing of flags if more boolean state is added | Low | Only worth it if the storage layout grows |
| More compact events (fewer indexed fields) | Low at runtime / deploy | Worse off-chain indexing |
| Solidity optimizer `via_ir` + high runs | Variable | Slower builds; measure before/after |
| Minimal assembly in the ETH `.call` | Marginal | Loses readability; low ROI |

### 5.2 Improvements with a strong tradeoff (think twice)

| Idea | What you gain | What you lose |
|------|---------------|---------------|
| Revert to “honest-only” ERC-20 deposit (no `balanceOf` delta) | Gas on every deposit | Insolvency with fee-on-transfer tokens |
| Remove `_totalBalances` and compute surplus on the fly | Fewer SSTOREs in credit/debit | Impossible (or very expensive) to bound rescue without iterating over users |
| Remove the allowlist | Fewer SLOADs | Any malicious token can enter the ledger |
| Pausable for deposits only (not withdrawals) | Better UX during an emergency | Product change / larger design surface |
| Batch deposit/withdraw | Less tx overhead for power users | Complexity + worst-case gas + UX |

### 5.3 Product improvements that also affect off-chain gas

| Idea | Note |
|------|------|
| EIP-2612 **in the token** + `permit` before `depositERC20` | One fewer `approve` tx for the user (network gas, not the vault's) |
| Multicall / external router | Outside the vault; keeps the core clean |
| Read `decimals()` on-chain in the FE | UX; doesn't change contract gas |

### 5.4 What is **not** worth “optimizing”

- Removing CEI / `nonReentrant` from withdrawals.
- Allowing rescue above the surplus.
- Crediting the requested `amount` instead of the delta in fee-aware deposits.
- Loops over users/tokens in user-facing functions (gas DoS).

**Rule of thumb:** any gas change must pass `forge test` (unit + attack + fuzz + invariant) and a new documented `--gas-report` in [`GAS-EN.md`](./GAS-EN.md).

---

## 6. Quick file map

| Layer | Where |
|-------|-------|
| Contract | `src/CryptoBankVault.sol` |
| Interface | `src/interfaces/ICryptoBankVault.sol` |
| Tests | `test/unit`, `test/attack`, `test/fuzz`, `test/invariant` |
| Frontend | `frontend/` (`VaultClient`, `useVaultApp`) |
| Ops | `doc/VPS-EN.md`, `deploy/vps/` |

---

## 7. Executive summary

1. **Core decision:** accounting ledger + CEI + pause + allowlist + surplus/rescue.  
2. **Logic:** depositing credits; withdrawing debits first and then sends; admin only touches policy and surplus.  
3. **Gas:** a serious pass has already been done (transient guard, unchecked, custom errors). What remains is marginal or requires giving up security/features.  
4. **Next step if optimizing again:** hypothesis → minimal implementation → full suite → gas-report → update this doc and `GAS-EN.md`.
