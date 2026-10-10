# Deploy playbook — Crypto Bank Vault (Phase 3)
> 🇪🇸 [Versión en español](./DEPLOY-ES.md)

Commands to deploy the vault + mock ERC-20 and export ABIs to the frontend.

## Prerequisites

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cp .env.example .env   # fill in PRIVATE_KEY if you are not using Anvil's
```

## 1. Anvil (local demo)

Terminal A:

```bash
anvil
```

Anvil exposes `http://127.0.0.1:8545`, chain id `31337`.  
Account #0 (default):

- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

Terminal B — deploy with broadcast:

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

Copy the logged addresses (`MockERC20`, `CryptoBankVault`) into `frontend/.env.local`:

```bash
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_VAULT_ADDRESS=0x...
# SYM:native[:decimals] | SYM:0xToken[:decimals] — decimals optional (default 18)
NEXT_PUBLIC_ASSETS=ETH:native,mUSD:0x...:18
```

## 2. Export ABIs

```bash
chmod +x script/export-abi.sh
./script/export-abi.sh
```

Generates:

- `frontend/abi/CryptoBankVault.json`
- `frontend/abi/MockERC20.json`
- `frontend/abi/ICryptoBankVault.json`

## 3. Testnet (optional, e.g. Sepolia)

```bash
# .env
PRIVATE_KEY=<tu_clave>
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>

source .env
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --verify   # requires ETHERSCAN_API_KEY
```

Record the resulting addresses in this file or in `frontend/.env.local` (do not commit secrets).

## Ownership in production

`pause()` freezes deposits **and** withdrawals. Do not use an EOA as `INITIAL_OWNER` on mainnet:

1. Deploy / configure a **Safe (multisig)** or OpenZeppelin's `TimelockController`.
2. Pass that address as `INITIAL_OWNER` to the deploy.
3. Complete the second step of `Ownable2Step` (`acceptOwnership`) if you transfer ownership afterwards.

Local demo: an Anvil EOA is fine.

## Mock mint (demo only)

`Deploy.s.sol` **mints** the MockERC20 to the broadcaster and allowlists it if the broadcaster is the owner. This is intentional, to test the frontend on Anvil/testnet.

**Do not** use that automatic mint as a mainnet model. Details: [`LIMITACIONES-EN.md`](./LIMITACIONES-EN.md) §1.

## 5. Quick post-deploy verification

```bash
cast call <VAULT> "owner()(address)" --rpc-url http://127.0.0.1:8545
cast call <VAULT> "paused()(bool)" --rpc-url http://127.0.0.1:8545
cast call <MOCK_TOKEN> "balanceOf(address)(uint256)" <TU_EOA> --rpc-url http://127.0.0.1:8545
```

## Artifacts

| Path | Purpose |
|------|---------|
| `broadcast/Deploy.s.sol/<chainId>/run-latest.json` | Foundry deploy history |
| `frontend/abi/*.json` | ABI for ethers.js |
| `frontend/.env.example` | Frontend env template |
