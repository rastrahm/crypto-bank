# 02 — Crypto Bank Vault

Vault multi-activo (ETH + ERC-20 allowlisted) con ledger interno, pausa de emergencia, CEI y protección contra reentrancy. Demo web: Next.js 15 + ethers.js v6.

**Estado del módulo:** Fases 0–6 completas (código + docs + empaquetado VPS). La URL pública depende de aplicar [`doc/VPS.md`](doc/VPS.md) en tu VM.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Contratos | Solidity `0.8.24`, OpenZeppelin v5.2, Cancun (`ReentrancyGuardTransient`) |
| Tooling | Foundry (`forge` / `cast` / `anvil`) |
| Frontend | Next.js 15, ethers v6, Zod, Vitest |
| Ops demo | Nginx + PM2 (o systemd) — [`deploy/vps/`](deploy/vps/) |

---

## Mapa de documentación

| Documento | Contenido |
|-----------|-----------|
| [`doc/HANDOFF.md`](doc/HANDOFF.md) | Arranque en 15 min para un tercero |
| [`doc/00-plan-implementacion.md`](doc/00-plan-implementacion.md) | Plan por fases |
| [`doc/DEPLOY.md`](doc/DEPLOY.md) | Deploy Anvil / testnet + ABI |
| [`doc/VPS.md`](doc/VPS.md) | Demo en VPS Google |
| [`doc/LIMITACIONES.md`](doc/LIMITACIONES.md) | Límites aceptados (no bugs) |
| [`doc/MEJORAS.md`](doc/MEJORAS.md) | Roadmap / mejoras futuras |
| [`doc/GAS.md`](doc/GAS.md) | Notas de gas |
| [`doc/SWC-AUDIT.md`](doc/SWC-AUDIT.md) | Matriz SWC |
| [`doc/ATAQUES.md`](doc/ATAQUES.md) | Campañas defensivas A–E |
| [`doc/01-diagrama-clases.md`](doc/01-diagrama-clases.md) | Clases on-chain + FE |
| [`doc/02-diagrama-flujo.md`](doc/02-diagrama-flujo.md) / [`03-flujograma.md`](doc/03-flujograma.md) | Flujos |
| [`frontend/public/ayuda.html`](frontend/public/ayuda.html) | Manual de usuario (UI) |

---

## Estructura del repo

```
src/           # CryptoBankVault, interfaz, mocks
script/        # Deploy + export-abi.sh
test/          # unit / attack / fuzz / invariant
frontend/      # Next.js demo
deploy/vps/    # PM2, Nginx, systemd, setup.sh
doc/           # Plan, seguridad, ops, handoff
```

---

## 1. Contratos — build y tests

```bash
export PATH="$HOME/.foundry/bin:$PATH"
forge build
forge test
forge test --match-test test_Attack   # campañas defensivas
forge test --gas-report               # regenerar números de doc/GAS.md
forge fmt
```

Fuzz: `runs = 1000` en `foundry.toml`.

---

## 2. Deploy local (Anvil) + frontend

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
# Pegá VAULT + token en NEXT_PUBLIC_ASSETS (ver logs del deploy)
npm install   # Node >= 20 (.nvmrc)
npm run dev
```

Detalle: [`doc/DEPLOY.md`](doc/DEPLOY.md), [`frontend/README.md`](frontend/README.md).

Formato assets: `NEXT_PUBLIC_ASSETS=ETH:native,mUSD:0x...:18`

---

## 3. Frontend — tests y build

```bash
cd frontend
npm test
npm run build
```

- Login EIP-6963 + firma (UX demo, no SIWE de servidor).
- Aviso de **versión de prueba** + enlace a `/ayuda.html`.
- Owner: pause / allowlist / rescue según ABI.

---

## 4. Demo VPS (Google)

Playbook: [`doc/VPS.md`](doc/VPS.md). Resumen: build con `.env.production` → PM2 `next start` en `127.0.0.1:3000` → Nginx → (opcional) Let’s Encrypt.

---

## 5. Seguridad (resumen)

- CEI + `ReentrancyGuardTransient` + pause + Ownable2Step.
- ERC-20: allowlist de depósitos; delta `balanceOf` en deposit; rescue solo de surplus.
- **No** uses wallets con valor real en la demo.
- Owner en producción: multisig / timelock (pause congela retiros).

---

## Entorno

| Archivo | Uso |
|---------|-----|
| `.env.example` | Foundry (`PRIVATE_KEY`, `RPC_URL`) |
| `frontend/.env.example` | Demo local |
| `frontend/.env.production.example` | Build VPS |

No commitear `.env`, `.env.local` ni `.env.production`.

---

## Definition of Done (módulo)

1. `pragma solidity 0.8.24`
2. CEI + reentrancy; ataques no drenan
3. ETH con `.call` + check; custom errors
4. Pause + Ownable2Step
5. Suite unit + attack + fuzz + invariant
6. Frontend deposit/withdraw con wallet
7. Empaquetado VPS documentado
8. `doc/` + README alineados al código
