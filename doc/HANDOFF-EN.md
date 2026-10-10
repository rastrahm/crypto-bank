# Handoff — Crypto Bank Vault
> 🇪🇸 [Versión en español](./HANDOFF-ES.md)

Short guide for a third party to bring up the demo using **only** this repo (no chat context).

---

## In 15 minutes (local)

### A. Contracts

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cd 02-crypto-bank
forge install   # if you don't have lib/ yet
forge test
```

### B. Local chain + deploy

```bash
anvil   # leave it running
```

In another terminal:

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
./script/export-abi.sh
```

Note from the log: the addresses of `MockERC20` and `CryptoBankVault`.

### C. Frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_VAULT_ADDRESS=<CryptoBankVault>
NEXT_PUBLIC_ASSETS=ETH:native,mUSD:<MockERC20>:18
```

```bash
npm install   # Node >= 20
npm run dev
```

Open http://localhost:3000  

1. Read the **test version** notice.  
2. Optional: [`/ayuda.html`](../frontend/public/ayuda.html).  
3. MetaMask → Anvil network `31337`, Anvil account #0 (holds ETH + the mock mint).  
4. Login → deposit / withdraw.

---

## Acceptance checklist (third party)

- [ ] `forge test` green  
- [ ] UI loads; disclaimer visible  
- [ ] Deposit / withdraw ETH OK  
- [ ] Deposit / withdraw mUSD OK (approve + deposit)  
- [ ] Owner sees admin panel (account #0 after deploy)  
- [ ] Help manual accessible  

---

## Production / VPS

1. Deploy contracts to testnet ([`DEPLOY-EN.md`](./DEPLOY-EN.md)).  
2. Follow [`VPS-EN.md`](./VPS-EN.md) (build env, PM2, Nginx).  

---

## What not to expect

| Topic | Reality |
|-------|---------|
| Signed login | Local demo UX; no server auth |
| Mainnet with real value | Out of scope; see disclaimer + [`LIMITACIONES-EN.md`](./LIMITACIONES-EN.md) |
| Public URL | You must deploy on your own VM |

---

## Docs directory

| If you need… | Open… |
|--------------|-------|
| Design limits | [`LIMITACIONES-EN.md`](./LIMITACIONES-EN.md) |
| Attacks / SWC | [`ATAQUES-EN.md`](./ATAQUES-EN.md), [`SWC-AUDIT-EN.md`](./SWC-AUDIT-EN.md) |
| Future improvements | [`MEJORAS-EN.md`](./MEJORAS-EN.md) |
| Gas | [`GAS-EN.md`](./GAS-EN.md) |
