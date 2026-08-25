# Limitaciones conocidas — CryptoBankVault

Decisiones de diseño **aceptadas** (no son bugs abiertos). Complementa [`SWC-AUDIT.md`](./SWC-AUDIT.md) y [`DEPLOY.md`](./DEPLOY.md).

---

## 1. Deploy de demo acuña MockERC20 al broadcaster

**Qué pasa:** `script/Deploy.s.sol` despliega `MockERC20`, acuña supply de prueba al `msg.sender` (broadcaster) y, si es owner, lo allowlistea en el vault.

**Por qué está bien:** el script es para **local / testnet / demo** (Anvil, Sepolia de práctica). Facilita probar depósitos ERC-20 sin un faucet aparte.

**Qué no hacer:** no reutilizar este flujo “tal cual” en **mainnet** con valor real. En producción:

- No hace falta (o no conviene) un mock con `mint` público.
- Usar tokens reales ya desplegados y allowlistarlos con cuidado.
- `INITIAL_OWNER` = multisig / timelock (ver [`DEPLOY.md`](./DEPLOY.md)).

---

## 2. Fee-on-transfer en el retiro

**Depósito:** mitigado. `depositERC20` acredita el **delta** real de `balanceOf` (no el `amount` pedido). Si no llega nada → `DepositFailed`.

**Retiro:** el vault debita `amount` del ledger y hace `safeTransfer(user, amount)`. Si el token cobra fee en la transferencia **saliente**:

- el ledger del usuario baja `amount`;
- el usuario puede **recibir menos** que `amount`;
- la solvencia del vault vs ledger se mantiene (sale del vault lo debitado contablemente, según el modelo del token).

**Mitigación de producto:** no allowlistar tax tokens; o aceptar el comportamiento y documentarlo en la UI.

Tests de referencia: `test_DepositERC20_FeeOnTransfer_*`, `test_AttackA10_*`.

---

## 3. Rebase / `balanceOf` mentiroso en tokens allowlisted

**Mitigación parcial:** solo tokens en allowlist (`setTokenAllowed`, solo owner) pueden depositarse. Tokens arbitrarios no entran al ledger por depósito.

**Riesgo residual (política del owner):** si se allowlista un token que:

- **rebasea** a la baja sin transferencias → `Σ ledger` puede quedar por encima del `balanceOf(vault)` y los retiros fallan para quien llegue tarde; o
- **miente en `balanceOf`** → el delta del depósito puede inflar el ledger.

La allowlist es **confianza en el owner**, no una prueba de que el token es “honesto”.

**Mitigación operativa:** no listar rebase / tokens opacos; revisar el token antes de `setTokenAllowed(true)`; delistar no bloquea retiros de saldos ya acreditados.

---

## Resumen

| Limitación | Nivel | Acción típica |
|------------|--------|----------------|
| Mint mock → broadcaster | Demo | No usar el script de demo en mainnet |
| Fee en retiro | Token | No allowlistar tax tokens, o avisar en UX |
| Rebase / `balanceOf` mentiroso | Owner | Allowlist estricta; no listar tokens dudosos |
