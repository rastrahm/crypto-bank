# Future improvements — Crypto Bank Vault
> 🇪🇸 [Versión en español](./MEJORAS-ES.md)

Ideas **out of scope** for module 02 (Phases 0–6). Suggested priority for a fork / v2.

---

## On-chain

| Improvement | Value | Complexity |
|-------------|-------|------------|
| **ERC-2612 Permit** on ERC-20 deposit | A single signature (approve+deposit) | Medium |
| **Multisig / Timelock** as documented `initialOwner` in prod script | Pause does not depend on an EOA | Low (ops) + medium (script) |
| Per-user / TVL cap | Concentration risk | Medium |
| Separate roles (`AccessControl`): pauser ≠ allowlist ≠ rescue | Less concentrated privilege | Medium |
| Also measure delta on fee-on-transfer **withdraw** | Fairer UX with tax tokens | Medium (gas + design) |
| Indexable events + subgraph | Deposit explorer | High (off-chain) |
| Granular pausable (deposits only) | Owner can freeze inflows without blocking withdrawals | Medium (product change) |

---

## Frontend / product

| Improvement | Value | Complexity |
|-------------|-------|------------|
| SIWE / server-verified session | Real auth | High |
| Read `decimals()` on-chain if missing from env | Less manual config | Low |
| Tx history (explorer links) | UX trust | Low |
| Read-only mode without login | View public vault | Low |
| EN/ES i18n | Wider audience | Medium |
| Wagmi/Viem (optional) | React ecosystem | Medium (rewrites client) |

---

## Ops / demo

| Improvement | Value | Complexity |
|-------------|-------|------------|
| Docker Compose (frontend + optional anvil) | 1-command onboarding | Medium |
| CI: `forge test` + `npm test` + `npm run build` | Quality on every PR | Low (partial workflow already exists) |
| Automatic Sepolia staging | Always-live demo | High |

---

## Do not prioritize (for this demo)

- Mainnet with real funds without an external audit.  
- Full in-house indexer.  
- Native mobile app.  
