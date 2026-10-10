# Phase 5 — VPS demo (Google / Ubuntu)
> 🇪🇸 [Versión en español](./VPS-ES.md)

Operations playbook to publish the Next.js frontend behind Nginx, with the process managed by PM2 (or systemd).  
On-chain deploy: see [`DEPLOY-EN.md`](./DEPLOY-EN.md).

**Exit criteria:** stable public URL + this document (startup, logs, redeploy).

---

## Recommended architecture

```text
Internet → Nginx :80/:443 → next start :3000 (PM2)
                ↘ (optional) Anvil :8545 localhost only — DO NOT expose to the Internet
```

| Component | Demo choice |
|-----------|-------------|
| App | `next build` + `next start` (App Router; no `output: export`) |
| Process | **PM2** (alternative: systemd) |
| Proxy | Nginx |
| Chain | **Sepolia** (or another testnet) with a public/Alchemy/Infura RPC |
| Contracts | Deployed on that testnet; addresses in the build env |

> Anvil on the VPS only makes sense for internal demos. If you use it, bind it to `127.0.0.1` and **never** open `:8545` to the world.

---

## 0. Prerequisites on the VM (Ubuntu 22.04/24.04)

- Google Compute Engine VM (or any VPS) with a public IP
- DNS A record pointing to the domain (if you want HTTPS)
- SSH with a sudo user
- GCP firewall: allow **tcp:22** (restricted), **tcp:80**, **tcp:443**

On the machine:

```bash
sudo apt update && sudo apt install -y nginx git curl
# Node 20 via nvm or NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

Or use the script: [`../deploy/vps/setup.sh`](../deploy/vps/setup.sh).

---

## 1. Contracts (testnet)

From your machine or CI (with the `PRIVATE_KEY` of an EOA funded from a Sepolia faucet):

```bash
export PATH="$HOME/.foundry/bin:$PATH"
source .env   # PRIVATE_KEY, RPC_URL=https://...
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
./script/export-abi.sh
```

Write down:

- `CryptoBankVault`
- `MockERC20`
- `chainId` (Sepolia = `11155111`)

Demo mint / allowlist: see [`LIMITACIONES-EN.md`](./LIMITACIONES-EN.md) §1.

---

## 2. Code on the server

```bash
# example
sudo mkdir -p /opt/crypto-bank && sudo chown "$USER:$USER" /opt/crypto-bank
cd /opt/crypto-bank
git clone <TU_REPO_URL> .
# or rsync from local
```

---

## 3. Production env (frontend)

`NEXT_PUBLIC_*` variables are **embedded in the build**. They must exist **before** `npm run build`.

```bash
cd /opt/crypto-bank/frontend
cp .env.production.example .env.production
nano .env.production
```

Sepolia example:

```bash
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<KEY>
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_ASSETS=ETH:native,mUSD:0x...:18
```

Versioned template: [`../frontend/.env.production.example`](../frontend/.env.production.example).  
Do **not** commit `.env.production` or RPC keys.

---

## 4. Build and start (PM2)

```bash
cd /opt/crypto-bank/frontend
npm ci
npm run build
pm2 start ../deploy/vps/ecosystem.config.cjs
pm2 save
pm2 startup   # follow the instructions (systemd user)
```

Useful commands:

```bash
pm2 status
pm2 logs crypto-bank-frontend
pm2 restart crypto-bank-frontend
```

### Alternative: systemd

```bash
sudo cp /opt/crypto-bank/deploy/vps/crypto-bank-frontend.service /etc/systemd/system/
# edit User= and WorkingDirectory= if needed
sudo systemctl daemon-reload
sudo systemctl enable --now crypto-bank-frontend
sudo journalctl -u crypto-bank-frontend -f
```

---

## 5. Nginx

```bash
sudo cp /opt/crypto-bank/deploy/vps/nginx-crypto-bank.conf /etc/nginx/sites-available/crypto-bank
# edit server_name
sudo ln -sf /etc/nginx/sites-available/crypto-bank /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### HTTPS (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d demo.tudominio.com
```

---

## 6. Firewall

**GCP VPC firewall** (console or `gcloud`):

| Direction | Ports | Source |
|-----------|-------|--------|
| Ingress | 80, 443 | `0.0.0.0/0` (or restricted) |
| Ingress | 22 | your IP / bastion |
| Deny | 3000, 8545 | do not publish |

On the VM (`ufw`, optional):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 7. Demo checklist (post-deploy)

- [ ] `https://demo…` loads the UI
- [ ] Wallet on the **same** chainId as the env
- [ ] Sepolia faucet (ETH) on the test EOA
- [ ] Mock token: balance > 0 (deploy mint or manual mint)
- [ ] Deposit / withdraw ETH OK
- [ ] Deposit / withdraw mUSD (approve + deposit) OK
- [ ] Owner sees pause / unpause
- [ ] `pm2 logs` without RPC errors

---

## 8. Redeploy (new code)

```bash
cd /opt/crypto-bank
git pull   # or rsync
cd frontend
# if .env.production changed → edit it before the build
npm ci
npm run build
pm2 restart crypto-bank-frontend
```

If only the ABIs change: `./script/export-abi.sh` on the build machine, commit/sync, rebuild the frontend.

---

## 9. Troubleshooting

| Symptom | What to check |
|---------|---------------|
| 502 Bad Gateway | `pm2 status`; port 3000; `curl -I http://127.0.0.1:3000` |
| Wrong network in the UI | `NEXT_PUBLIC_CHAIN_ID` vs MetaMask; rebuild after changing env |
| RPC failing | Alchemy/Infura quota; URL in `.env.production` |
| Stale env in the browser | `NEXT_PUBLIC_*` only apply after a **new build** |
| Blank / Internal Server Error | Corrupted `.next` → `rm -rf .next && npm run build && pm2 restart …` |

---

## 10. Security (demo)

- Don't upload `PRIVATE_KEY` or the Foundry `.env` to the VPS unless you need to redeploy contracts from there.
- Signature-based login = **demo UX**, not server-side auth ([`LIMITACIONES`](./LIMITACIONES-EN.md) / frontend README).
- Vault owner on testnet: a practice EOA is OK; mainnet → multisig ([`DEPLOY-EN.md`](./DEPLOY-EN.md)).
