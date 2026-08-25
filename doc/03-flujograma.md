# Flujograma — Crypto Bank Vault

Diagramas de decisión (sí/no) para las operaciones críticas del vault y del frontend. Ver también el [diagrama de flujo / secuencias](./02-diagrama-flujo.md).

---

## 1. Flujograma general: depósito (ETH o ERC-20)

```mermaid
flowchart TD
    A([Inicio: Usuario quiere depositar]) --> B{Wallet conectada?}
    B -->|No| C[Solicitar conexión MetaMask]
    C --> B
    B -->|Sí| D{Red correcta?}
    D -->|No| E[Mostrar: cambiar de red]
    E --> D
    D -->|Sí| F[Ingresar monto y activo]
    F --> G{Zod: amount > 0?}
    G -->|No| H[Error ZeroAmount en UI]
    H --> F
    G -->|Sí| I{¿Activo es ETH?}
    I -->|Sí| J[Enviar depositETH con value]
    I -->|No| K{¿Allowance suficiente?}
    K -->|No| L[Tx approve]
    L --> M{Approve OK?}
    M -->|No| N[Mostrar error approve]
    N --> F
    M -->|Sí| O[Tx depositERC20]
    K -->|Sí| O
    J --> P{Contrato: paused?}
    O --> P
    P -->|Sí| Q[Revert / EnPaused]
    Q --> R([Fin con error])
    P -->|No| S{amount > 0 on-chain?}
    S -->|No| T[Revert ZeroAmount]
    T --> R
    S -->|Sí| U[Actualizar ledger - Effects]
    U --> V{¿ETH o ERC-20?}
    V -->|ETH| W[Ya recibido msg.value]
    V -->|ERC-20| X[transferFrom]
    X --> Y{Transfer OK?}
    Y -->|No| Z[Revert SafeERC20 / TransferFailed]
    Z --> R
    Y -->|Sí| AA[Emit Deposited]
    W --> AA
    AA --> AB[UI refresca balanceOf]
    AB --> AC([Fin OK])
```

---

## 2. Flujograma: retiro ETH

```mermaid
flowchart TD
    A([Inicio: withdrawETH]) --> B{paused?}
    B -->|Sí| C[Revert EnPaused]
    C --> Z([Fin error])
    B -->|No| D{ReentrancyGuard libre?}
    D -->|No| E[Revert ReentrancyGuard]
    E --> Z
    D -->|Sí| F[Lock guard]
    F --> G{amount > 0?}
    G -->|No| H[Revert ZeroAmount]
    H --> Y[Unlock / revert]
    Y --> Z
    G -->|Sí| I{balances user NATIVE >= amount?}
    I -->|No| J[Revert InsufficientVaultBalance]
    J --> Y
    I -->|Sí| K[Effects: restar ledger]
    K --> L["Interactions: call value amount"]
    L --> M{call success?}
    M -->|No| N[Revert TransferFailed]
    N --> Y
    M -->|Sí| O[Emit Withdrawn]
    O --> P[Unlock guard]
    P --> Q([Fin OK])
```

---

## 3. Flujograma: retiro ERC-20

```mermaid
flowchart TD
    A([Inicio: withdrawERC20]) --> B{paused?}
    B -->|Sí| C[Revert]
    C --> Z([Fin error])
    B -->|No| D{nonReentrant OK?}
    D -->|No| C
    D -->|Sí| E{amount > 0 y saldo ledger OK?}
    E -->|No| F[Revert ZeroAmount / Insufficient]
    F --> Z
    E -->|Sí| G[Effects: restar balances user token]
    G --> H[Interactions: token.transfer user]
    H --> I{transfer OK?}
    I -->|No| J[Revert TransferFailed]
    J --> Z
    I -->|Sí| K[Emit Withdrawn]
    K --> L([Fin OK])
```

---

## 4. Flujograma: frontend — envío de transacción

```mermaid
flowchart TD
    A([Usuario confirma acción]) --> B[Parsear inputs con Zod]
    B --> C{Schema válido?}
    C -->|No| D[Mostrar errores de campo]
    D --> A
    C -->|Sí| E[Crear BrowserProvider + getSigner]
    E --> F[Instanciar Contract ABI+address]
    F --> G[estimateGas / sendTransaction]
    G --> H{Usuario firmó?}
    H -->|No| I[Código: ACTION_REJECTED]
    I --> J([Cancelado])
    H -->|Sí| K[Esperar receipt]
    K --> L{status == 1?}
    L -->|No| M[Decodificar custom error si posible]
    M --> N[Toast / UI de error]
    N --> O([Fin error])
    L -->|Sí| P[Refetch balanceOf y allowance]
    P --> Q([Fin éxito])
```

---

## 5. Flujograma: operación owner — pausa

```mermaid
flowchart TD
    A([Owner solicita pause]) --> B{msg.sender == owner?}
    B -->|No| C[Revert OwnableUnauthorized]
    C --> Z([Fin error])
    B -->|Sí| D{¿Ya paused?}
    D -->|Sí| E[Revert EnPaused / no-op según OZ]
    E --> Z
    D -->|No| F[_pause]
    F --> G[Emit Paused / EmergencyPaused]
    G --> H([Depósitos y retiros bloqueados])
```

---

## 6. Leyenda rápida

| Símbolo | Significado |
|---------|-------------|
| Óvalo | Inicio / fin |
| Rectángulo | Proceso o efecto de estado |
| Rombo | Decisión |
| CEI | Checks → Effects → Interactions, en ese orden |
| Guard | `nonReentrant` evita reentrada durante `call` |
