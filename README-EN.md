# 02 — Crypto Bank Vault
> 🇪🇸 [Versión en español](./README-ES.md)

Multi-asset vault (ETH + allowlisted ERC-20) with an internal ledger, emergency pause, CEI and reentrancy protection. Web demo: Next.js 15 + ethers.js v6.

**Module status:** Phases 0–6 complete (code + docs + VPS packaging). The public URL depends on applying [`doc/VPS-EN.md`](doc/VPS-EN.md) on your VM.

---

## Stack

| Layer | Technology |
|------|------------|
| Contracts | Solidity `0.8.24`, OpenZeppelin v5.2, Cancun (`ReentrancyGuardTransient`) |
| Tooling | Foundry (`forge` / `cast` / `anvil`) |
| Frontend | Next.js 15, ethers v6, Zod, Vitest |
| Demo ops | Nginx + PM2 (or systemd) — [`deploy/vps/`](deploy/vps/) |

---

## Documentation map

| Document | Contents |
|-----------|-----------|
| [`doc/HANDOFF-EN.md`](doc/HANDOFF-EN.md) | 15-minute onboarding for a third party |
| [`doc/00-plan-implementacion-EN.md`](doc/00-plan-implementacion-EN.md) | Phased plan |
| [`doc/DEPLOY-EN.md`](doc/DEPLOY-EN.md) | Anvil / testnet deploy + ABI |
| [`doc/VPS-EN.md`](doc/VPS-EN.md) | Demo on a Google VPS |
| [`doc/LIMITACIONES-EN.md`](doc/LIMITACIONES-EN.md) | Accepted limitations (not bugs) |
| [`doc/DECISIONES-TECNICAS-EN.md`](doc/DECISIONES-TECNICAS-EN.md) | Decisions, vault logic and gas improvements |
| [`doc/MEJORAS-EN.md`](doc/MEJORAS-EN.md) | Roadmap / future improvements |
| [`doc/GAS-EN.md`](doc/GAS-EN.md) | Gas notes |
| [`doc/SWC-AUDIT-EN.md`](doc/SWC-AUDIT-EN.md) | SWC matrix |
| [`doc/ATAQUES-EN.md`](doc/ATAQUES-EN.md) | Defensive campaigns A–E |
| [`doc/01-diagrama-clases-EN.md`](doc/01-diagrama-clases-EN.md) | On-chain + FE classes |
| [`doc/02-diagrama-flujo-EN.md`](doc/02-diagrama-flujo-EN.md) / [`03-flujograma-EN.md`](doc/03-flujograma-EN.md) | Flows |
| [`frontend/public/ayuda.html`](frontend/public/ayuda.html) | User manual (UI) |
| [`portfolio/`](portfolio/) | Portfolio explainer page (ES/EN) |

---

## Repo structure

```
src/           # CryptoBankVault, interface, mocks
script/        # Deploy + export-abi.sh
test/          # unit / attack / fuzz / invariant
frontend/      # Next.js demo
deploy/vps/    # PM2, Nginx, systemd, setup.sh
doc/           # Plan, security, ops, handoff
```

---

## 1. Contracts — build and tests

```bash
export PATH="$HOME/.foundry/bin:$PATH"
forge build
forge test
forge test --match-test test_Attack   # defensive campaigns
forge test --gas-report               # regenerate the numbers in doc/GAS-EN.md
forge fmt
```

Fuzz: `runs = 1000` in `foundry.toml`.

---

## 2. Local deploy (Anvil) + frontend

```bash
# Terminal A
anvil

# Terminal B
forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
./script/export-abi.sh

cd frontend
cp .env.example .env.local
# Paste VAULT + token into NEXT_PUBLIC_ASSETS (see the deploy logs)
npm install   # Node >= 20 (.nvmrc)
npm run dev
```

Details: [`doc/DEPLOY-EN.md`](doc/DEPLOY-EN.md), [`frontend/README.md`](frontend/README.md).

Assets format: `NEXT_PUBLIC_ASSETS=ETH:native,mUSD:0x...:18`

---

## 3. Frontend — tests and build

```bash
cd frontend
npm test
npm run build
```

- EIP-6963 login + signature (demo UX, not server-side SIWE).
- **Test version** notice + link to `/ayuda.html`.
- Owner: pause / allowlist / rescue according to the ABI.

---

## 4. VPS demo (Google)

Playbook: [`doc/VPS-EN.md`](doc/VPS-EN.md). Summary: build with `.env.production` → PM2 `next start` on `127.0.0.1:3000` → Nginx → (optional) Let’s Encrypt.

---

## 5. Security (summary)

- CEI + `ReentrancyGuardTransient` + pause + Ownable2Step.
- ERC-20: deposit allowlist; `balanceOf` delta on deposit; rescue of surplus only.
- **Do not** use wallets holding real value in the demo.
- Owner in production: multisig / timelock (pause freezes withdrawals).

---

## Environment

| File | Usage |
|---------|-----|
| `.env.example` | Foundry (`PRIVATE_KEY`, `RPC_URL`) |
| `frontend/.env.example` | Local demo |
| `frontend/.env.production.example` | VPS build |

Do not commit `.env`, `.env.local` or `.env.production`.

---

## Definition of Done (module)

1. `pragma solidity 0.8.24`
2. CEI + reentrancy; attacks do not drain funds
3. ETH via `.call` + check; custom errors
4. Pause + Ownable2Step
5. Unit + attack + fuzz + invariant suite
6. Frontend deposit/withdraw with a wallet
7. Documented VPS packaging
8. `doc/` + README aligned with the code
