# Handoff — Crypto Bank Vault

Guía corta para que un tercero levante la demo **solo** con este repo (sin contexto de chat).

---

## En 15 minutos (local)

### A. Contratos

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cd 02-crypto-bank
forge install   # si aún no tenés lib/
forge test
```

### B. Cadena local + deploy

```bash
anvil   # dejar corriendo
```

En otra terminal:

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
./script/export-abi.sh
```

Anotá del log: address de `MockERC20` y `CryptoBankVault`.

### C. Frontend

```bash
cd frontend
cp .env.example .env.local
```

Editá `.env.local`:

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

Abrí http://localhost:3000  

1. Leé el aviso de **versión de prueba**.  
2. Opcional: [`/ayuda.html`](../frontend/public/ayuda.html).  
3. MetaMask → red Anvil `31337`, cuenta #0 de Anvil (tiene ETH + el mint del mock).  
4. Login → depositar / retirar.

---

## Checklist de aceptación (tercero)

- [ ] `forge test` verde  
- [ ] UI carga; disclaimer visible  
- [ ] Deposit / withdraw ETH OK  
- [ ] Deposit / withdraw mUSD OK (approve + deposit)  
- [ ] Owner ve panel admin (cuenta #0 tras deploy)  
- [ ] Manual de ayuda accesible  

---

## Producción / VPS

1. Deploy contratos en testnet ([`DEPLOY.md`](./DEPLOY.md)).  
2. Seguir [`VPS.md`](./VPS.md) (env de build, PM2, Nginx).  

---

## Qué no esperar

| Tema | Realidad |
|------|----------|
| Login firmado | UX demo local; no auth de servidor |
| Mainnet con valor | Fuera de alcance; ver disclaimer + [`LIMITACIONES.md`](./LIMITACIONES.md) |
| URL pública | Hay que desplegar en tu VM |

---

## Contacto de docs

| Si necesitás… | Abrí… |
|---------------|--------|
| Límites del diseño | [`LIMITACIONES.md`](./LIMITACIONES.md) |
| Ataques / SWC | [`ATAQUES.md`](./ATAQUES.md), [`SWC-AUDIT.md`](./SWC-AUDIT.md) |
| Mejoras futuras | [`MEJORAS.md`](./MEJORAS.md) |
| Gas | [`GAS.md`](./GAS.md) |
