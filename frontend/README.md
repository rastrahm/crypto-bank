# Frontend — Crypto Bank Vault

Next.js 15 (App Router) + ethers.js v6 + Zod.

## Requisitos

- Node.js **>= 20**
- Vault y mock desplegados (ver `../doc/DEPLOY.md`)
- ABIs en `abi/` (`../script/export-abi.sh`)

## Setup

```bash
cp .env.example .env.local
# ajustar addresses si redeployaste
npm install
npm run dev
```

Abrí http://localhost:3000 — MetaMask en red Anvil (`31337`) con la cuenta #0.

## Assets (`NEXT_PUBLIC_ASSETS`)

```bash
NEXT_PUBLIC_ASSETS=ETH:native,mUSD:0x...:18,USDC:0x...:6
```

Formato: `SYM:native[:decimals]` o `SYM:0xAddress[:decimals]`. Si omitís decimals, se asume **18**.

## Límites de la demo

- **Login:** la firma de mensaje es UX de demostración (persiste en `localStorage`). **No** es autenticación de servidor ni SIWE verificado on-chain; no usar como auth de producción.
- **Decimales:** cada activo declara sus decimals en el env. El ledger on-chain es `uint256` raw; el frontend usa `parseUnits`/`formatUnits` con ese valor.

## Scripts

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desarrollo |
| `npm test` | Vitest + RTL |
| `npm run build` | Build producción |
| `npm start` | Servir build |

## Flujo demo

1. Elegir wallet (EIP-6963) y firmar login  
2. Depositar / retirar ETH u otros assets del select  
3. Ver ledger y `paused`  
4. Si sos owner: pause / unpause  

## Producción / VPS

Ver [`../doc/VPS.md`](../doc/VPS.md). Plantilla: `.env.production.example` → `.env.production` **antes** de `npm run build`.
