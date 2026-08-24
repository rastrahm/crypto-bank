# 02 — Crypto Bank Vault

Vault multi-activo (ETH + ERC-20) con ledger interno, pausa de emergencia, CEI y protección contra reentrancy. Frontend demo: Next.js + ethers.js v6.

## Stack

- Solidity `0.8.24` (pragma fijo)
- Foundry (`forge`, `cast`, `anvil`)
- OpenZeppelin Contracts v5.2.0

## Documentación

Ver [`doc/00-plan-implementacion.md`](doc/00-plan-implementacion.md).

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
frontend/      # Next.js (Fase 4)
doc/           # Plan y diagramas
```

## Entorno

Copia `.env.example` a `.env` y completa `PRIVATE_KEY` / `RPC_URL` cuando vayas a desplegar (Fase 3).
