# Diagrama de flujo — Crypto Bank Vault

Secuencias de interacción entre **usuario**, **frontend (ethers.js)** y **contratos**. Complementa el [flujograma de decisiones](./03-flujograma.md).

---

## 1. Depósito de ETH

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant UI as Next.js (ethers v6)
    participant W as Wallet (MetaMask)
    participant V as CryptoBankVault

    U->>UI: Ingresa monto ETH
    UI->>UI: Valida con Zod (amount > 0)
    U->>UI: Confirma Depositar
    UI->>W: eth_requestAccounts / sendTransaction
    W->>U: Firma / confirma tx
    W->>V: depositETH{value: amount}()
    Note over V: Checks: !paused, amount > 0
    Note over V: Effects: balances[msg.sender][NATIVE] += amount
    V-->>W: success + evento Deposited
    W-->>UI: receipt
    UI->>V: balanceOf(user, NATIVE) [eth_call]
    V-->>UI: nuevo saldo
    UI-->>U: Muestra saldo actualizado
```

---

## 2. Retiro de ETH (CEI + call)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant UI as Next.js (ethers v6)
    participant W as Wallet
    participant V as CryptoBankVault

    U->>UI: Ingresa monto a retirar
    UI->>UI: Zod + saldo suficiente (lectura previa)
    U->>UI: Confirma Retirar
    UI->>W: write withdrawETH(amount)
    W->>V: withdrawETH(amount)
    Note over V: nonReentrant + !paused
    Note over V: Checks: amount > 0, balance >= amount
    Note over V: Effects: balances[user][NATIVE] -= amount
    Note over V: Interactions: user.call{value: amount}("")
    alt call falla
        V-->>W: revert TransferFailed
        W-->>UI: error
        UI-->>U: Mensaje de fallo
    else call OK
        V-->>W: success + Withdrawn
        W-->>UI: receipt
        UI-->>U: Saldo UI refrescado
    end
```

---

## 3. Depósito ERC-20 (approve + deposit)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant UI as Next.js
    participant W as Wallet
    participant T as IERC20 (Mock)
    participant V as CryptoBankVault

    U->>UI: Monto + token
    UI->>UI: Validación Zod
    UI->>W: approve(vault, amount)
    W->>T: approve(vault, amount)
    T-->>W: Approval
    UI->>W: depositERC20(token, amount)
    W->>V: depositERC20(token, amount)
    Note over V: Checks: !paused, amount > 0
    Note over V: Effects: balances[user][token] += amount
    Note over V: Interactions: transferFrom(user, vault, amount)
    alt transferFrom falla / shortfall
        V-->>W: revert SafeERC20 / TransferFailed
    else OK
        V-->>W: Deposited
        W-->>UI: receipt
        UI-->>U: Ledger actualizado
    end
```

> **Nota CEI:** el orden exacto effects↔`transferFrom` debe quedar fijado en implementación y tests. Para tokens honestos, un patrón seguro es: checks → effects (crédito) → `transferFrom` → si falla, revert (rollback de la tx). Alternativa conservadora: `transferFrom` midiendo delta de balance y luego effects; documentar la elección en NatSpec.

---

## 4. Ataque de reentrancy (debe fallar)

```mermaid
sequenceDiagram
    autonumber
    participant A as AttackerContract
    participant V as CryptoBankVault

    A->>V: withdrawETH(amount)
    Note over V: Effects: balance reducida
    V->>A: call{value} (fallback/receive)
    A->>V: withdrawETH(amount) otra vez
    Note over V: nonReentrant O balance ya 0
    V-->>A: revert (guard / InsufficientBalance)
    Note over A: No drena el vault
```

---

## 5. Pausa de emergencia (owner)

```mermaid
sequenceDiagram
    autonumber
    actor O as Owner
    participant UI as Panel Admin (opcional)
    participant W as Wallet
    participant V as CryptoBankVault

    O->>UI: Pausar depósitos/retiros
    UI->>W: pause()
    W->>V: pause()
    Note over V: onlyOwner → _pause()
    V-->>W: paused = true
    Note over V: deposit*/withdraw* revierten cuando paused
    O->>W: unpause() cuando sea seguro
    W->>V: unpause()
```

---

## 6. Flujo de despliegue demo (VPS Google)

```mermaid
sequenceDiagram
    participant Dev as Desarrollador
    participant Forge as Foundry
    participant Chain as Anvil / Testnet
    participant FE as Next.js build
    participant VPS as Servidor Google

    Dev->>Forge: forge script Deploy
    Forge->>Chain: deploy Vault (+ MockERC20)
    Chain-->>Dev: addresses
    Dev->>FE: copiar ABI + env NEXT_PUBLIC_*
    Dev->>FE: next build
    Dev->>VPS: rsync / CI deploy
    VPS->>VPS: pm2/systemd next start + Nginx
    Note over VPS: Demo pública lista
```
