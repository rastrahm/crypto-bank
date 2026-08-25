# 02 — Crypto Bank Vault

Vault multi-activo (ETH + ERC-20) con ledger interno, pausa de emergencia, CEI y protección contra reentrancy. Frontend demo: Next.js + ethers.js v6.

## Stack

- Solidity `0.8.24` (pragma fijo)
- Foundry (`forge`, `cast`, `anvil`)
- OpenZeppelin Contracts v5.2.0

## Documentación

Ver [`doc/00-plan-implementacion.md`](doc/00-plan-implementacion.md).

Seguridad:

- [`doc/SWC-AUDIT.md`](doc/SWC-AUDIT.md) — matriz SWC-100–136
- [`doc/ATAQUES.md`](doc/ATAQUES.md) — campañas defensivas A–E
- [`doc/LIMITACIONES.md`](doc/LIMITACIONES.md) — límites aceptados (demo mint, fee en retiro, allowlist)

```shell
forge test --match-test test_Attack
```

## Uso rápido

```shell
forge build
forge test
forge fmt
```

Fuzz (configurado en `foundry.toml`): `runs = 1000`.

## Estructura

```
src/           # Contratos e interfaces
script/        # Scripts de deploy
test/          # unit / attack / fuzz / invariant
frontend/      # Next.js + ethers.js (Fase 4)
doc/           # Plan y diagramas
```

## Frontend (Fase 4)

```shell
cd frontend
cp .env.example .env.local
npm install   # Node >= 20
npm run dev
npm test
```

Detalle: [`frontend/README.md`](frontend/README.md).

## Deploy (Fase 3)

Ver playbook completo: [`doc/DEPLOY.md`](doc/DEPLOY.md).

```shell
anvil   # terminal A
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
./script/export-abi.sh
```

## Entorno

Copia `.env.example` a `.env` para scripts Foundry.  
Frontend: `frontend/.env.example` → `.env.local` con `NEXT_PUBLIC_ASSETS=ETH:native,mUSD:0x...:18`.

**Límites demo:** login por firma es UX local (no SIWE/server); decimals por asset en el env (default 18).
