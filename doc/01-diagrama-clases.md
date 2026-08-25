# Diagrama de clases — Crypto Bank Vault

Vista estática de tipos, responsabilidades y relaciones entre contratos on-chain y la capa frontend (ethers.js). Alineado a la implementación final (Fase 6).

---

## 1. Diagrama de clases (on-chain + frontend)

```mermaid
classDiagram
    direction TB

    class ICryptoBankVault {
        <<interface>>
        +NATIVE() address
        +depositETH() payable
        +depositERC20(token, amount)
        +withdrawETH(amount)
        +withdrawERC20(token, amount)
        +setTokenAllowed(token, allowed)
        +rescueETH(to, amount)
        +rescueERC20(token, to, amount)
        +balanceOf(user, token) view
        +totalBalance(token) view
        +isTokenAllowed(token) view
        +surplusETH() view
        +surplusERC20(token) view
        +pause()
        +unpause()
    }

    class CryptoBankVault {
        -mapping balances
        -mapping totalBalances
        -mapping allowedTokens
        +receive() payable
        -_creditNative(user, amount)
    }

    class Ownable2Step {
        <<OpenZeppelin>>
    }

    class Pausable {
        <<OpenZeppelin>>
    }

    class ReentrancyGuardTransient {
        <<OpenZeppelin EIP-1153>>
    }

    class IERC20 {
        <<OpenZeppelin>>
    }

    class MockERC20 {
        +mint(to, amount)
    }

    class CryptoBankErrors {
        <<errors>>
        ZeroAmount()
        InsufficientVaultBalance()
        TransferFailed()
        DepositFailed()
        InvalidToken()
        TokenNotAllowed()
        InvalidRecipient()
        RescueExceedsSurplus()
    }

    class VaultClient {
        <<frontend ethers v6>>
        +connectWallet()
        +getBalances()
        +depositAsset()
        +withdrawAsset()
        +pause()
        +unpause()
        +setTokenAllowed()
        +rescueETH()
        +rescueERC20()
    }

    class AmountForm {
        <<React>>
    }

    class AssetSelect {
        <<React>>
    }

    class WalletLogin {
        <<React EIP-6963>>
    }

    class DemoDisclaimer {
        <<React>>
    }

    class useVaultApp {
        <<React hook>>
    }

    ICryptoBankVault <|.. CryptoBankVault
    Ownable2Step <|-- CryptoBankVault
    Pausable <|-- CryptoBankVault
    ReentrancyGuardTransient <|-- CryptoBankVault
    CryptoBankVault ..> IERC20
    CryptoBankVault ..> CryptoBankErrors
    MockERC20 --|> IERC20
    VaultClient ..> ICryptoBankVault
    VaultClient ..> IERC20
    AmountForm --> useVaultApp
    AssetSelect --> useVaultApp
    WalletLogin --> useVaultApp
    DemoDisclaimer --> useVaultApp : UI shell
    useVaultApp --> VaultClient
```

---

## 2. Notas de diseño

### 2.1 Ledger

- `balances[user][token]`; ETH = `NATIVE` (`address(0)`).
- `_totalBalances[token]` para surplus / rescue.

### 2.2 ERC-20

- Depósitos solo si `isTokenAllowed(token)`.
- `depositERC20` acredita **delta** de `balanceOf` (fee-on-transfer en depósito).
- Retiros no exigen allowlist (saldos ya acreditados).

### 2.3 Herencia OZ

- Ownable2Step + Pausable + ReentrancyGuardTransient (Cancun).

### 2.4 Frontend

- `VaultClient` + `useVaultApp`; assets desde `NEXT_PUBLIC_ASSETS` (`SYM:native[:d]` / `SYM:0x…[:d]`).
- Disclaimer de prueba + `/ayuda.html`.
- Login firmado = UX demo (no SIWE server).

### 2.5 Eventos

`Deposited`, `Withdrawn`, `TokenAllowlistUpdated`, `Rescued`, más `Paused`/`Unpaused` de OZ.

---

## 3. Convención de layout Solidity

1. Imports  
2. Errores / eventos (en interfaz + impl según diseño actual)  
3. Constantes  
4. Estado  
5. Constructor  
6. `receive`  
7. Externals → views → internals  
