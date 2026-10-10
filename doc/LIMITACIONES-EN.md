# Known limitations — CryptoBankVault
> 🇪🇸 [Versión en español](./LIMITACIONES-ES.md)

**Accepted** design decisions (not open bugs). Complements [`SWC-AUDIT-EN.md`](./SWC-AUDIT-EN.md) and [`DEPLOY-EN.md`](./DEPLOY-EN.md).

---

## 1. Demo deploy mints MockERC20 to the broadcaster

**What happens:** `script/Deploy.s.sol` deploys `MockERC20`, mints a test supply to `msg.sender` (the broadcaster) and, if it is the owner, allowlists it in the vault.

**Why it is fine:** the script is meant for **local / testnet / demo** use (Anvil, practice Sepolia). It makes it easy to test ERC-20 deposits without a separate faucet.

**What not to do:** do not reuse this flow “as is” on **mainnet** with real value. In production:

- A mock with public `mint` is not needed (or not advisable).
- Use real, already-deployed tokens and allowlist them carefully.
- `INITIAL_OWNER` = multisig / timelock (see [`DEPLOY-EN.md`](./DEPLOY-EN.md)).

---

## 2. Fee-on-transfer on withdrawal

**Deposit:** mitigated. `depositERC20` credits the actual `balanceOf` **delta** (not the requested `amount`). If nothing arrives → `DepositFailed`.

**Withdrawal:** the vault debits `amount` from the ledger and calls `safeTransfer(user, amount)`. If the token charges a fee on the **outgoing** transfer:

- the user's ledger decreases by `amount`;
- the user may **receive less** than `amount`;
- vault solvency vs. ledger is preserved (what leaves the vault is what was debited in the accounting, according to the token's model).

**Product mitigation:** do not allowlist tax tokens; or accept the behavior and document it in the UI.

Reference tests: `test_DepositERC20_FeeOnTransfer_*`, `test_AttackA10_*`.

---

## 3. Rebasing / lying `balanceOf` in allowlisted tokens

**Partial mitigation:** only allowlisted tokens (`setTokenAllowed`, owner only) can be deposited. Arbitrary tokens cannot enter the ledger via deposit.

**Residual risk (owner policy):** if a token is allowlisted that:

- **rebases** downward without transfers → `Σ ledger` may end up above `balanceOf(vault)` and withdrawals fail for whoever comes last; or
- **lies in `balanceOf`** → the deposit delta may inflate the ledger.

The allowlist is **trust in the owner**, not proof that the token is “honest”.

**Operational mitigation:** do not list rebasing / opaque tokens; review the token before `setTokenAllowed(true)`; delisting does not block withdrawals of already-credited balances.

---

## Summary

| Limitation | Level | Typical action |
|------------|-------|----------------|
| Mock mint → broadcaster | Demo | Do not use the demo script on mainnet |
| Fee on withdrawal | Token | Do not allowlist tax tokens, or warn in the UX |
| Rebasing / lying `balanceOf` | Owner | Strict allowlist; do not list dubious tokens |
| Signed login (frontend) | Demo UX | Do not treat it as production auth |

---

## 4. Frontend login (local signature)

**What happens:** the user signs a message; the session is stored in `localStorage`. There may be client-side signature verification on restore, but there is **no** backend or server-side SIWE.

**Why it is fine:** it simplifies the multi-wallet demo.

**What not to do:** do not present it as banking-grade authentication nor use it as the sole access control for systems holding value.

The UI shows a test-version notice and the manual at `/ayuda.html`.
