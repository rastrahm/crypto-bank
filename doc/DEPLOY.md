# Deploy playbook — Crypto Bank Vault (Fase 3)

Comandos para desplegar el vault + mock ERC-20 y exportar ABIs al frontend.

## Prerrequisitos

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cp .env.example .env   # completar PRIVATE_KEY si no usas la de Anvil
```

## 1. Anvil (demo local)

Terminal A:

```bash
anvil
```

Anvil expone `http://127.0.0.1:8545`, chain id `31337`.  
Cuenta #0 (default):

- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

Terminal B — deploy con broadcast:

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

Copia las addresses logueadas (`MockERC20`, `CryptoBankVault`) a `frontend/.env.local`:

```bash
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_VAULT_ADDRESS=0x...
# SYM:native[:decimals] | SYM:0xToken[:decimals] — decimals opcional (default 18)
NEXT_PUBLIC_ASSETS=ETH:native,mUSD:0x...:18
```

## 2. Exportar ABIs

```bash
chmod +x script/export-abi.sh
./script/export-abi.sh
```

Genera:

- `frontend/abi/CryptoBankVault.json`
- `frontend/abi/MockERC20.json`
- `frontend/abi/ICryptoBankVault.json`

## 3. Testnet (opcional, ej. Sepolia)

```bash
# .env
PRIVATE_KEY=<tu_clave>
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>

source .env
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --verify   # requiere ETHERSCAN_API_KEY
```

Documenta las addresses resultantes en este archivo o en `frontend/.env.local` (no commitear secretos).

## Ownership en producción

`pause()` congela depósitos **y** retiros. No uses una EOA como `INITIAL_OWNER` en mainnet:

1. Desplegar / configurar un **Safe (multisig)** o `TimelockController` de OpenZeppelin.
2. Pasar esa address como `INITIAL_OWNER` al deploy.
3. Completar el segundo paso de `Ownable2Step` (`acceptOwnership`) si transferís ownership después.

Demo local: EOA de Anvil está bien.

## Mock mint (solo demo)

`Deploy.s.sol` **acuña** el MockERC20 al broadcaster y lo allowlistea si el broadcaster es owner. Eso es intencional para probar el frontend en Anvil/testnet.

**No** uses ese mint automático como modelo de mainnet. Detalle: [`LIMITACIONES.md`](./LIMITACIONES.md) §1.

## 5. Verificación rápida post-deploy

```bash
cast call <VAULT> "owner()(address)" --rpc-url http://127.0.0.1:8545
cast call <VAULT> "paused()(bool)" --rpc-url http://127.0.0.1:8545
cast call <MOCK_TOKEN> "balanceOf(address)(uint256)" <TU_EOA> --rpc-url http://127.0.0.1:8545
```

## Artefactos

| Ruta | Uso |
|------|-----|
| `broadcast/Deploy.s.sol/<chainId>/run-latest.json` | Historial Foundry del deploy |
| `frontend/abi/*.json` | ABI para ethers.js |
| `frontend/.env.example` | Plantilla de env del frontend |
