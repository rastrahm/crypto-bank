# Flow diagram — Crypto Bank Vault
> 🇪🇸 [Versión en español](./02-diagrama-flujo-ES.md)

Interaction sequences between the **user**, the **frontend (ethers.js)** and the **contracts**. Complements the [decision flowchart](./03-flujograma-EN.md).

---

## 1. ETH deposit

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant UI as Next.js (ethers v6)
    participant W as Wallet (MetaMask)
    participant V as CryptoBankVault

    U->>UI: Enters ETH amount
    UI->>UI: Validates with Zod (amount > 0)
    U->>UI: Confirms Deposit
    UI->>W: eth_requestAccounts / sendTransaction
    W->>U: Signs / confirms tx
    W->>V: depositETH{value: amount}()
    Note over V: Checks: !paused, amount > 0
    Note over V: Effects: balances[msg.sender][NATIVE] += amount
    V-->>W: success + Deposited event
    W-->>UI: receipt
    UI->>V: balanceOf(user, NATIVE) [eth_call]
    V-->>UI: new balance
    UI-->>U: Shows updated balance
```

---

## 2. ETH withdrawal (CEI + call)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant UI as Next.js (ethers v6)
    participant W as Wallet
    participant V as CryptoBankVault

    U->>UI: Enters amount to withdraw
    UI->>UI: Zod + sufficient balance (prior read)
    U->>UI: Confirms Withdraw
    UI->>W: write withdrawETH(amount)
    W->>V: withdrawETH(amount)
    Note over V: nonReentrant + !paused
    Note over V: Checks: amount > 0, balance >= amount
    Note over V: Effects: balances[user][NATIVE] -= amount
    Note over V: Interactions: user.call{value: amount}("")
    alt call fails
        V-->>W: revert TransferFailed
        W-->>UI: error
        UI-->>U: Failure message
    else call OK
        V-->>W: success + Withdrawn
        W-->>UI: receipt
        UI-->>U: UI balance refreshed
    end
```

---

## 3. ERC-20 deposit (approve + deposit)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant UI as Next.js
    participant W as Wallet
    participant T as IERC20 (Mock)
    participant V as CryptoBankVault

    U->>UI: Amount + token
    UI->>UI: Zod validation
    UI->>W: approve(vault, amount)
    W->>T: approve(vault, amount)
    T-->>W: Approval
    UI->>W: depositERC20(token, amount)
    W->>V: depositERC20(token, amount)
    Note over V: Checks: !paused, amount > 0
    Note over V: Effects: balances[user][token] += amount
    Note over V: Interactions: transferFrom(user, vault, amount)
    alt transferFrom fails / shortfall
        V-->>W: revert SafeERC20 / TransferFailed
    else OK
        V-->>W: Deposited
        W-->>UI: receipt
        UI-->>U: Ledger updated
    end
```

> **CEI note:** the exact effects↔`transferFrom` ordering must be pinned down in the implementation and tests. For honest tokens, a safe pattern is: checks → effects (credit) → `transferFrom` → if it fails, revert (tx rollback). Conservative alternative: `transferFrom` measuring the balance delta and then effects; document the choice in NatSpec.

---

## 4. Reentrancy attack (must fail)

```mermaid
sequenceDiagram
    autonumber
    participant A as AttackerContract
    participant V as CryptoBankVault

    A->>V: withdrawETH(amount)
    Note over V: Effects: balance reduced
    V->>A: call{value} (fallback/receive)
    A->>V: withdrawETH(amount) again
    Note over V: nonReentrant OR balance already 0
    V-->>A: revert (guard / InsufficientBalance)
    Note over A: Does not drain the vault
```

---

## 5. Emergency pause (owner)

```mermaid
sequenceDiagram
    autonumber
    actor O as Owner
    participant UI as Admin Panel (optional)
    participant W as Wallet
    participant V as CryptoBankVault

    O->>UI: Pause deposits/withdrawals
    UI->>W: pause()
    W->>V: pause()
    Note over V: onlyOwner → _pause()
    V-->>W: paused = true
    Note over V: deposit*/withdraw* revert when paused
    O->>W: unpause() when safe
    W->>V: unpause()
```

---

## 6. Demo deployment flow (Google VPS)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Forge as Foundry
    participant Chain as Anvil / Testnet
    participant FE as Next.js build
    participant VPS as Google Server

    Dev->>Forge: forge script Deploy
    Forge->>Chain: deploy Vault (+ MockERC20)
    Chain-->>Dev: addresses
    Dev->>FE: copy ABI + env NEXT_PUBLIC_*
    Dev->>FE: next build
    Dev->>VPS: rsync / CI deploy
    VPS->>VPS: pm2/systemd next start + Nginx
    Note over VPS: Public demo ready
```
