# Implementation plan — Crypto Bank Vault (Module 02)
> 🇪🇸 [Versión en español](./00-plan-implementacion-ES.md)

Master document for the module. It defines phases, deliverables, acceptance criteria and the agreed stack for the contracts + demo frontend on a Google server.

---

## 1. Module objective

Build a secure, gas-optimized **decentralized banking vault** that:

- Accepts deposits of **native ETH** and **ERC-20 tokens**.
- Keeps an **internal ledger** per user and asset.
- Applies **Checks-Effects-Interactions (CEI)** and **reentrancy** protection.
- Includes an **emergency pause** with ownership control.
- Exposes a **Next.js frontend** (demo) with **ethers.js v6** to interact with the vault.
- Is deployable as a showcase on a **VPS / Google server**.

---

## 2. Agreed stack

| Layer | Technology | Notes |
|------|------------|--------|
| Contracts | Solidity `0.8.24` (fixed pragma) | No floating pragma |
| On-chain tooling | Foundry (`forge`, `cast`, `anvil`) | Unit, fuzz, invariant, gas |
| Libraries | OpenZeppelin v5.x (Ownable2Step / Pausable depending on design) | Only audited OZ contracts |
| Frontend | Next.js (App Router) + TypeScript | `nextjs.cursorrules` rules |
| Web3 in UI | **ethers.js v6** | `BrowserProvider` + `Contract` |
| UI validation | Zod | Forms, env, params |
| UI tests | Vitest + React Testing Library | Interaction TDD |
| Demo server | Node.js + reverse proxy (Nginx) on a Google VPS | Static build or `next start` |
| Demo network | Local Anvil / Sepolia (or another testnet) | Configurable via `.env` |

**Out of scope in v1:** bridges, yield, liquidations, advanced multisig, indexers (The Graph), native mobile.

---

## 3. Logical architecture (summary)

```
User (MetaMask)
       │
       ▼
Next.js App (ethers.js v6)  ──RPC──►  Node / Anvil / Testnet
       │                                    │
       │                                    ▼
       └──────── ABI + address ──────► CryptoBankVault
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              User ledger         Vault balances         Pause / Owner
           (user→token→amt)      (token→total)         Ownable2Step
```

Detailed diagrams:

- [Class diagram](./01-diagrama-clases-EN.md)
- [Flow diagram](./02-diagrama-flujo-EN.md)
- [Flowchart](./03-flujograma-EN.md)

---

## 4. Planned repository structure

```
02-crypto-bank/
├── .cursorrules
├── doc/                          # Plan and diagrams (this directory)
├── foundry.toml
├── remappings.txt
├── src/
│   ├── CryptoBankVault.sol
│   ├── interfaces/ICryptoBankVault.sol
│   └── errors/CryptoBankErrors.sol   # or errors inline in the contract
├── script/
│   ├── Deploy.s.sol
│   └── DeployMockToken.s.sol         # test ERC-20 for the demo
├── test/
│   ├── unit/CryptoBankVault.t.sol
│   ├── attack/ReentrancyAttack.t.sol
│   ├── fuzz/CryptoBankVault.fuzz.t.sol
│   └── invariant/CryptoBankVault.invariant.t.sol
└── frontend/                     # Next.js + ethers.js
    ├── app/
    ├── components/
    ├── lib/contracts.ts          # ABI, address, ethers helpers
    ├── lib/schemas.ts            # Zod
    ├── abi/
    ├── .env.example
    └── ...
```

---

## 5. Implementation phases

### Phase 0 — Module bootstrap (Foundry + docs)

**Estimated duration:** 0.5 day

| Task | Deliverable |
|-------|------------|
| Initialize Foundry (`forge init` / config) | `foundry.toml`, `lib/`, OZ remappings |
| Pin Solidity `0.8.24` | Clean compilation |
| Install OpenZeppelin v5 | Pinned dependency |
| Confirm `doc/` layout | Plan + diagrams reviewed |

**Exit criterion:** `forge build` OK; folder structure ready.

---

### Phase 1 — On-chain design and TDD (contracts first)

**Estimated duration:** 1–2 days  
**Principle:** write Foundry tests **before** or immediately in parallel with the implementation (TDD).

#### 1.1 Data model

- `mapping(address user => mapping(address token => uint256 balance))` ledger.
- Convention: `address(0)` (or a `NATIVE` constant) for ETH.
- Vault totals per token (optionally explicit, or derived from invariants).

#### 1.2 Contract surface

| Function | Description |
|---------|-------------|
| `depositETH()` / `receive` | ETH deposit; update the ledger **before** any external logic |
| `depositERC20(token, amount)` | `transferFrom` after effects / user approve |
| `withdrawETH(amount)` | CEI + `.call{value}("")` + success check |
| `withdrawERC20(token, amount)` | CEI + safe transfer |
| `pause` / `unpause` | Owner only |
| `transferOwnership` (2-step) | Ownable2Step |
| Views | `balanceOf(user, token)`, `paused()`, `owner()` |

#### 1.3 Custom errors (minimum)

- `ZeroAmount()`
- `InsufficientVaultBalance()` / `InsufficientBalance()`
- `TransferFailed()`
- `DepositFailed()` — **reserved** (not emitted today; SafeERC20 reverts on its own)
- OZ pause/ownable errors depending on inheritance

#### 1.4 Security

- ReentrancyGuard (OZ or custom uint256/transient) **and/or** strict CEI.
- Update balances **before** `.call` / `transfer` / `transferFrom` according to the flow (CEI).
- ETH only via `.call{value: amount}("")`; never `transfer`/`send`.

**Exit criterion:** interface + skeleton + red/green test suite under way; NatSpec on public/external functions.

---

### Phase 2 — Full vault implementation + tests

**Estimated duration:** 2–3 days

| Test type | What it covers |
|--------------|-----------|
| Unit | ETH and ERC-20 deposit/withdraw; pause; zero amount; insufficient balance |
| Reentrancy | Malicious contract that re-enters `withdrawETH` |
| Fuzz | `bound()` on amounts; deposit↔balance properties |
| Invariant | Sum of ledger ≤ actual contract balance per asset |
| Gas report | `forge test --gas-report` (documented baseline) |

**Exit criterion:**

- `forge test` green.
- High branch coverage (suite target: ~100% of the vault's explicit paths).
- Reentrancy attack **fails** (revert / not drained).

---

### Phase 3 — Deploy scripts and on-chain demo environment

**Estimated duration:** 0.5–1 day

| Task | Deliverable |
|-------|------------|
| `Deploy.s.sol` | Deploy vault + (optional) mock ERC-20 |
| Variables | `PRIVATE_KEY`, `RPC_URL` in `.env` (never commit secrets) |
| Export ABI | `out/.../CryptoBankVault.json` → `frontend/abi/` |
| Anvil playbook | Commands for the local demo |
| Testnet (optional) | Sepolia or another; documented address |

**Exit criterion:** reproducible deploy; ABI + address available to the frontend.

---

### Phase 4 — Next.js frontend + ethers.js v6 (UI TDD)

**Estimated duration:** 2–3 days

#### 4.1 UI principles

- Explicit `'use client'` / `'use server'`.
- Zero `any`; typed props; Zod on inputs (amount, token address).
- JSDoc on components/hooks/utilities.
- ethers on the client only: `BrowserProvider`, `JsonRpcProvider`, `Contract`, `parseEther` / `formatEther`.

#### 4.2 Minimum demo screens / features

1. **Connect wallet** (MetaMask / EIP-1193).
2. **View network and address** of the configured vault.
3. **Deposit ETH** / **Withdraw ETH**.
4. **Deposit / withdraw ERC-20** (mock token + approve).
5. **View balance** in the ledger (`balanceOf`).
6. **Paused state** (read-only; optional owner actions in a simple admin panel).
7. Transaction error handling (user reject, custom error revert).

#### 4.3 Frontend tests

- Vitest + RTL: forms, Zod validation, buttons by role/accessibility.
- Mocks of `ethers` / provider so CI does not depend on MetaMask.

**Exit criterion:** happy-path deposit/withdraw flow documented; `next build` OK; complete `.env.example`.

---

### Phase 5 — Packaging and deployment on a Google server (demo)

**Estimated duration:** 1 day

| Step | Detail |
|------|---------|
| Build | `next build` (+ `next start` or export depending on strategy) |
| Process | PM2 / systemd for Node |
| Proxy | Nginx → `localhost:3000` (HTTPS with Let’s Encrypt if there is a domain) |
| Prod env | `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_VAULT_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_ASSETS` |
| Firewall | Only 80/443 (+ restricted SSH) |
| Demo checklist | Wallet on the correct network; faucet/test ETH; mock token minted |

**Exit criterion:** stable public showcase URL; operations README (startup, logs, redeploy).

**Deliverables in repo:** [`doc/VPS-EN.md`](./VPS-EN.md) + [`deploy/vps/`](../deploy/vps/) (PM2, Nginx, systemd, `setup.sh`). The public URL is obtained by applying the playbook on your Google VM.

---

### Phase 6 — Hardening, final documentation and handoff

**Estimated duration:** 0.5–1 day

- Module README (how to test, deploy, frontend, VPS).
- Review diagrams against the final code (update if there were deviations).
- Gas notes / known limitations.
- List of future improvements (ERC-2612 permit, events indexer, Ownable multisig, etc.).

**Exit criterion:** demo usable by a third party following only `doc/` + README.

**Deliverables:** [`README-EN.md`](../README-EN.md), [`HANDOFF-EN.md`](./HANDOFF-EN.md), [`MEJORAS-EN.md`](./MEJORAS-EN.md), diagrams and limitations aligned.

---

## 6. Recommended work order (checklist)

```text
[x] Phase 0  Foundry bootstrap
[x] Phase 1  Design + initial tests (TDD)
[x] Phase 2  Full vault + reentrancy/fuzz/invariant
[x] Phase 3  Deploy scripts + ABI export
[x] Phase 4  Next.js frontend + ethers v6
[x] Phase 5  Google VPS deploy (artifacts + doc/VPS-EN.md; public URL = apply on your VM)
[x] Phase 6  Final docs + handoff
```

---

## 7. Environment variables (reference)

### Foundry / deploy

```bash
PRIVATE_KEY=
RPC_URL=
ETHERSCAN_API_KEY=   # optional verify
```

### Frontend (`frontend/.env.example`)

```bash
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_ASSETS=ETH:native,mUSD:0x...:18
```

---

## 8. Global acceptance criteria (Definition of Done)

1. Compiles with `pragma solidity 0.8.24`.
2. CEI + reentrancy protected; attack tests pass (attack does not drain funds).
3. ETH via `.call` with success check; custom errors.
4. Pause + 2-step ownership (or an explicit equivalent).
5. Foundry suite: unit + reentrancy + fuzz + invariant.
6. Next.js frontend with ethers.js v6 connects a wallet and performs deposit/withdraw.
7. Demo deployable on a Google server with documented env.
8. `doc/` aligned with the final implementation.

---

## 9. Risks and mitigations

| Risk | Mitigation |
|--------|------------|
| Reentrancy in ETH withdraw | CEI + ReentrancyGuard + malicious test |
| Non-standard tokens (fee-on-transfer) | Document: only “honest” ERC-20s in v1; or measure the balance delta |
| Frontend SSR + window.ethereum | ethers logic only in client components |
| Unstable RPC on the VPS | Public fallback RPC + clear error message |
| Secrets in git | `.gitignore` + only `NEXT_PUBLIC_*` on the client |

---

## 10. Immediate next step

**Status:** Phases **0–6** closed in the repo.

For a public demo: apply [`VPS-EN.md`](./VPS-EN.md) on the Google VM.  
For a local third party: follow [`HANDOFF-EN.md`](./HANDOFF-EN.md).  
Optional roadmap: [`MEJORAS-EN.md`](./MEJORAS-EN.md).
