# Gas optimization — CryptoBankVault (Phase 2)
> 🇪🇸 [Versión en español](./GAS-ES.md)

## Applied changes

| Optimization | Tradeoff | Expected effect |
|--------------|----------|-----------------|
| `ReentrancyGuardTransient` (EIP-1153) | Requires EVM Cancun+ (`evm_version = "cancun"`) | Cheaper guard (transient vs storage) |
| `unchecked` in ledger subtractions after `bal >= amount` | Only valid as long as the preceding check is kept | Saves the overflow-check gas on subtraction |
| Caching `msg.sender` in deposit/withdraw paths | None | Fewer repeated `CALLER` opcodes |
| No `balanceOf` before/after in `depositERC20` | **Obsolete (fee-aware phase):** the delta is now measured | See the next section |
| Pause checked only once (`whenNotPaused` / check in `receive`) | `_creditNative` assumes the caller already validated the pause | Avoids a duplicate SLOAD of `paused` |
| Custom errors (already in Phase 1) | — | Cheaper than `require` with a string |

## Baseline (Phase 1, pre-opt) vs post-opt (unit gas-report)

Measured with `forge test --match-contract CryptoBankVaultTest --gas-report`.

| Metric | Before (Phase 1) | After (Phase 2) | Δ |
|--------|------------------|-----------------|---|
| Deployment Cost | 806 457 | 749 800 | **−56 657** |
| Deployment Size | 3559 | 3396 | −163 bytes |
| `depositETH` avg | 43 753 | 43 634 | −119 |
| `withdrawETH` avg | 31 810 | 29 132 | **−2 678** |
| `depositERC20` avg | 57 956 | 53 655 | **−4 301** |
| `withdrawERC20` avg | 40 690 | 37 340 | **−3 350** |

> `gas-report.txt` is in `.gitignore`; regenerate it with the command above.

## Out of scope (intentionally not optimized)

- Fee-on-transfer on **withdrawal** and allowlisted rebasing / lying-`balanceOf` tokens: see [`LIMITACIONES-EN.md`](./LIMITACIONES-EN.md).
- Allowlist + `_totalBalances` + rescue: storage/read cost in exchange for solvency and ops; do not “de-optimize” without measuring.
- Assembly in the ETH `.call`: marginal savings vs readability.
- Extra storage packing: the ledger is already a nested mapping (one slot per user+token).

## Fee-on-transfer on deposit (mitigated)

`depositERC20` calls `balanceOf` before/after and credits only the delta. Cost: ~2 extra external calls per deposit vs the Phase 2 “honest only” version. Tradeoff accepted to avoid accounting insolvency. **Withdrawal** does not re-measure the delta (documented limitation).
