# Fase 5 — Demo en VPS (Google / Ubuntu)

Playbook de operación para publicar el frontend Next.js detrás de Nginx, con proceso gestionado por PM2 (o systemd).  
Deploy on-chain: ver [`DEPLOY.md`](./DEPLOY.md).

**Criterio de salida:** URL pública estable + este documento (arranque, logs, redeploy).

---

## Arquitectura recomendada

```text
Internet → Nginx :80/:443 → next start :3000 (PM2)
                ↘ (opcional) Anvil :8545 solo localhost — NO exponer a Internet
```

| Pieza | Elección demo |
|-------|----------------|
| App | `next build` + `next start` (App Router; no `output: export`) |
| Proceso | **PM2** (alternativa: systemd) |
| Proxy | Nginx |
| Cadena | **Sepolia** (o otra testnet) con RPC público/Alchemy/Infura |
| Contratos | Desplegados en esa testnet; addresses en env de build |

> Anvil en el VPS solo tiene sentido para demos internas. Si lo usás, bindeá `127.0.0.1` y **nunca** abras `:8545` al mundo.

---

## 0. Prerrequisitos en la VM (Ubuntu 22.04/24.04)

- VM Google Compute Engine (o cualquier VPS) con IP pública
- DNS A apuntando al dominio (si querés HTTPS)
- SSH con usuario sudo
- Firewall GCP: permitir **tcp:22** (restringido), **tcp:80**, **tcp:443**

En la máquina:

```bash
sudo apt update && sudo apt install -y nginx git curl
# Node 20 via nvm o NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

O usá el script: [`../deploy/vps/setup.sh`](../deploy/vps/setup.sh).

---

## 1. Contratos (testnet)

Desde tu máquina o CI (con `PRIVATE_KEY` de una EOA con faucet Sepolia):

```bash
export PATH="$HOME/.foundry/bin:$PATH"
source .env   # PRIVATE_KEY, RPC_URL=https://...
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
./script/export-abi.sh
```

Anotá:

- `CryptoBankVault`
- `MockERC20`
- `chainId` (Sepolia = `11155111`)

Mint demo / allowlist: ver [`LIMITACIONES.md`](./LIMITACIONES.md) §1.

---

## 2. Código en el servidor

```bash
# ejemplo
sudo mkdir -p /opt/crypto-bank && sudo chown "$USER:$USER" /opt/crypto-bank
cd /opt/crypto-bank
git clone <TU_REPO_URL> .
# o rsync desde local
```

---

## 3. Env de producción (frontend)

Las variables `NEXT_PUBLIC_*` se **incrustan en el build**. Deben existir **antes** de `npm run build`.

```bash
cd /opt/crypto-bank/frontend
cp .env.production.example .env.production
nano .env.production
```

Ejemplo Sepolia:

```bash
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<KEY>
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_ASSETS=ETH:native,mUSD:0x...:18
```

Plantilla versionada: [`../frontend/.env.production.example`](../frontend/.env.production.example).  
**No** commitear `.env.production` ni claves de RPC.

---

## 4. Build y arranque (PM2)

```bash
cd /opt/crypto-bank/frontend
npm ci
npm run build
pm2 start ../deploy/vps/ecosystem.config.cjs
pm2 save
pm2 startup   # seguir instrucciones (systemd user)
```

Comandos útiles:

```bash
pm2 status
pm2 logs crypto-bank-frontend
pm2 restart crypto-bank-frontend
```

### Alternativa: systemd

```bash
sudo cp /opt/crypto-bank/deploy/vps/crypto-bank-frontend.service /etc/systemd/system/
# editar User= y WorkingDirectory= si hace falta
sudo systemctl daemon-reload
sudo systemctl enable --now crypto-bank-frontend
sudo journalctl -u crypto-bank-frontend -f
```

---

## 5. Nginx

```bash
sudo cp /opt/crypto-bank/deploy/vps/nginx-crypto-bank.conf /etc/nginx/sites-available/crypto-bank
# editar server_name
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

**GCP VPC firewall** (consola o `gcloud`):

| Dirección | Puertos | Fuente |
|-----------|---------|--------|
| Ingress | 80, 443 | `0.0.0.0/0` (o restringido) |
| Ingress | 22 | tu IP / bastion |
| Deny | 3000, 8545 | no publicar |

En la VM (`ufw`, opcional):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 7. Checklist demo (post-deploy)

- [ ] `https://demo…` carga el UI
- [ ] Wallet en la **misma** chainId del env
- [ ] Faucet Sepolia (ETH) en la EOA de prueba
- [ ] Mock token: balance > 0 (mint del deploy o mint manual)
- [ ] Deposit / withdraw ETH OK
- [ ] Deposit / withdraw mUSD (approve + deposit) OK
- [ ] Owner ve pause / unpause
- [ ] `pm2 logs` sin errores de RPC

---

## 8. Redeploy (código nuevo)

```bash
cd /opt/crypto-bank
git pull   # o rsync
cd frontend
# si cambió .env.production → editar antes del build
npm ci
npm run build
pm2 restart crypto-bank-frontend
```

Si solo cambian ABIs: `./script/export-abi.sh` en la máquina de build, commit/sync, rebuild frontend.

---

## 9. Troubleshooting

| Síntoma | Qué mirar |
|---------|-----------|
| 502 Bad Gateway | `pm2 status`; puerto 3000; `curl -I http://127.0.0.1:3000` |
| Red incorrecta en UI | `NEXT_PUBLIC_CHAIN_ID` vs MetaMask; rebuild tras cambiar env |
| RPC fallando | cuota Alchemy/Infura; URL en `.env.production` |
| Env viejo en browser | `NEXT_PUBLIC_*` solo aplican tras **nuevo build** |
| Blank / Internal Server Error | `.next` corrupto → `rm -rf .next && npm run build && pm2 restart …` |

---

## 10. Seguridad (demo)

- No subas `PRIVATE_KEY` ni `.env` Foundry al VPS salvo que debas redeployar contratos ahí.
- Login por firma = **UX demo**, no auth de servidor ([`LIMITACIONES`](./LIMITACIONES.md) / README frontend).
- Owner del vault en testnet: EOA de práctica OK; mainnet → multisig ([`DEPLOY.md`](./DEPLOY.md)).
