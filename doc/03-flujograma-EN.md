# Flowchart — Crypto Bank Vault
> 🇪🇸 [Versión en español](./03-flujograma-ES.md)

Decision diagrams (yes/no) for the critical operations of the vault and the frontend. See also the [flow / sequence diagram](./02-diagrama-flujo-EN.md).

---

## 1. General flowchart: deposit (ETH or ERC-20)

```mermaid
flowchart TD
    A([Start: User wants to deposit]) --> B{Wallet connected?}
    B -->|No| C[Request MetaMask connection]
    C --> B
    B -->|Yes| D{Correct network?}
    D -->|No| E[Show: switch network]
    E --> D
    D -->|Yes| F[Enter amount and asset]
    F --> G{Zod: amount > 0?}
    G -->|No| H[ZeroAmount error in UI]
    H --> F
    G -->|Yes| I{Is the asset ETH?}
    I -->|Yes| J[Send depositETH with value]
    I -->|No| K{Sufficient allowance?}
    K -->|No| L[approve tx]
    L --> M{Approve OK?}
    M -->|No| N[Show approve error]
    N --> F
    M -->|Yes| O[depositERC20 tx]
    K -->|Yes| O
    J --> P{Contract: paused?}
    O --> P
    P -->|Yes| Q[Revert / EnforcedPause]
    Q --> R([End with error])
    P -->|No| S{amount > 0 on-chain?}
    S -->|No| T[Revert ZeroAmount]
    T --> R
    S -->|Yes| U[Update ledger - Effects]
    U --> V{ETH or ERC-20?}
    V -->|ETH| W[msg.value already received]
    V -->|ERC-20| X[transferFrom]
    X --> Y{Transfer OK?}
    Y -->|No| Z[Revert SafeERC20 / TransferFailed]
    Z --> R
    Y -->|Yes| AA[Emit Deposited]
    W --> AA
    AA --> AB[UI refreshes balanceOf]
    AB --> AC([End OK])
```

---

## 2. Flowchart: ETH withdrawal

```mermaid
flowchart TD
    A([Start: withdrawETH]) --> B{paused?}
    B -->|Yes| C[Revert EnforcedPause]
    C --> Z([End error])
    B -->|No| D{ReentrancyGuard free?}
    D -->|No| E[Revert ReentrancyGuard]
    E --> Z
    D -->|Yes| F[Lock guard]
    F --> G{amount > 0?}
    G -->|No| H[Revert ZeroAmount]
    H --> Y[Unlock / revert]
    Y --> Z
    G -->|Yes| I{balances user NATIVE >= amount?}
    I -->|No| J[Revert InsufficientVaultBalance]
    J --> Y
    I -->|Yes| K[Effects: subtract from ledger]
    K --> L["Interactions: call value amount"]
    L --> M{call success?}
    M -->|No| N[Revert TransferFailed]
    N --> Y
    M -->|Yes| O[Emit Withdrawn]
    O --> P[Unlock guard]
    P --> Q([End OK])
```

---

## 3. Flowchart: ERC-20 withdrawal

```mermaid
flowchart TD
    A([Start: withdrawERC20]) --> B{paused?}
    B -->|Yes| C[Revert]
    C --> Z([End error])
    B -->|No| D{nonReentrant OK?}
    D -->|No| C
    D -->|Yes| E{amount > 0 and ledger balance OK?}
    E -->|No| F[Revert ZeroAmount / Insufficient]
    F --> Z
    E -->|Yes| G[Effects: subtract balances user token]
    G --> H[Interactions: token.transfer user]
    H --> I{transfer OK?}
    I -->|No| J[Revert TransferFailed]
    J --> Z
    I -->|Yes| K[Emit Withdrawn]
    K --> L([End OK])
```

---

## 4. Flowchart: frontend — transaction submission

```mermaid
flowchart TD
    A([User confirms action]) --> B[Parse inputs with Zod]
    B --> C{Valid schema?}
    C -->|No| D[Show field errors]
    D --> A
    C -->|Yes| E[Create BrowserProvider + getSigner]
    E --> F[Instantiate Contract ABI+address]
    F --> G[estimateGas / sendTransaction]
    G --> H{User signed?}
    H -->|No| I[Code: ACTION_REJECTED]
    I --> J([Cancelled])
    H -->|Yes| K[Wait for receipt]
    K --> L{status == 1?}
    L -->|No| M[Decode custom error if possible]
    M --> N[Toast / error UI]
    N --> O([End error])
    L -->|Yes| P[Refetch balanceOf and allowance]
    P --> Q([End success])
```

---

## 5. Flowchart: owner operation — pause

```mermaid
flowchart TD
    A([Owner requests pause]) --> B{msg.sender == owner?}
    B -->|No| C[Revert OwnableUnauthorized]
    C --> Z([End error])
    B -->|Yes| D{Already paused?}
    D -->|Yes| E[Revert EnforcedPause / no-op per OZ]
    E --> Z
    D -->|No| F[_pause]
    F --> G[Emit Paused / EmergencyPaused]
    G --> H([Deposits and withdrawals blocked])
```

---

## 6. Quick legend

| Symbol | Meaning |
|---------|-------------|
| Oval | Start / end |
| Rectangle | Process or state effect |
| Diamond | Decision |
| CEI | Checks → Effects → Interactions, in that order |
| Guard | `nonReentrant` prevents reentry during `call` |
