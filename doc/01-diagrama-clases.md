# Diagrama de clases — Crypto Bank Vault

Vista estática de tipos, responsabilidades y relaciones entre contratos on-chain y la capa frontend (ethers.js).

---

## 1. Diagrama de clases (on-chain + frontend)

```mermaid
classDiagram
    direction TB

    class ICryptoBankVault {
        <<interface>>
        +depositETH() payable
        +depositERC20(token, amount)
        +withdrawETH(amount)
        +withdrawERC20(token, amount)
        +balanceOf(user, token) view uint256
        +pause()
        +unpause()
    }

    class CryptoBankVault {
        -mapping~address,mapping~address,uint256~~ balances
        +NATIVE address
        +receive() payable
        +depositETH() payable
        +depositERC20(address token, uint256 amount)
        +withdrawETH(uint256 amount)
        +withdrawERC20(address token, uint256 amount)
        +balanceOf(address user, address token) view uint256
        +pause()
        +unpause()
        -_creditNative(address user, uint256 amount)
    }

    class Ownable2Step {
        <<OpenZeppelin>>
        +owner() view address
        +transferOwnership(address)
        +acceptOwnership()
    }

    class Pausable {
        <<OpenZeppelin>>
        +paused() view bool
        #_pause()
        #_unpause()
    }

    class ReentrancyGuardTransient {
        <<OpenZeppelin EIP-1153>>
        #nonReentrant()
    }

    class IERC20 {
        <<OpenZeppelin>>
        +transfer(to, amount) bool
        +transferFrom(from, to, amount) bool
        +approve(spender, amount) bool
        +balanceOf(account) view uint256
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
    }

    class VaultClient {
        <<frontend ethers v6>>
        -provider BrowserProvider
        -signer Signer
        +connectWallet() address
        +getBalances(user) Promise~VaultBalances~
        +depositAsset(asset, amount) Promise~TxResponse~
        +withdrawAsset(asset, amount) Promise~TxResponse~
        +pause() Promise~TxResponse~
        +unpause() Promise~TxResponse~
    }

    class AmountForm {
        <<React client>>
        +op deposit|withdraw
        +onSubmit(op, amount)
    }

    class AssetSelect {
        <<React client>>
        +assets SupportedAsset[]
        +onChange(assetId)
    }

    class WalletLogin {
        <<React client EIP-6963>>
        +onLoggedIn(session, wallet)
    }

    class useVaultApp {
        <<React hook>>
        +session
        +handleAction()
        +handlePause()
    }

    ICryptoBankVault <|.. CryptoBankVault : implements
    Ownable2Step <|-- CryptoBankVault
    Pausable <|-- CryptoBankVault
    ReentrancyGuardTransient <|-- CryptoBankVault
    CryptoBankVault ..> IERC20 : transfer / transferFrom
    CryptoBankVault ..> CryptoBankErrors : reverts
    MockERC20 --|> IERC20
    VaultClient ..> ICryptoBankVault : ABI + address
    VaultClient ..> IERC20 : approve / allowance
    AmountForm --> useVaultApp
    AssetSelect --> useVaultApp
    WalletLogin --> useVaultApp
    useVaultApp --> VaultClient
```

---

## 2. Notas de diseño

### 2.1 Ledger

- Clave compuesta: `balances[user][token]`.
- ETH nativo: token sentinel `address(0)` (`NATIVE`).

### 2.2 Herencia OZ

- **Ownable2Step** + **Pausable** + **ReentrancyGuardTransient** (OpenZeppelin v5 / Cancun).

### 2.3 Frontend

- `VaultClient` encapsula ethers (`BrowserProvider`, `Contract`).
- `useVaultApp` concentra sesión, saldos y txs; los componentes solo renderizan.
- Assets desde `NEXT_PUBLIC_ASSETS` (`SYM:native[:d]` / `SYM:0x…[:d]`).
- Validación de montos con **Zod** antes de firmar txs.
- Login por firma: **demo UX**, no auth de servidor.

### 2.4 Errores

- `DepositFailed`: **reservado** (tokens no estándar / shortfall). Hoy SafeERC20 revierte por su cuenta; el contrato no emite este error.

### 2.5 Eventos

```solidity
event Deposited(address indexed user, address indexed token, uint256 amount);
event Withdrawn(address indexed user, address indexed token, uint256 amount);
```

(Pause usa eventos OZ `Paused` / `Unpaused`.)

---

## 3. Convención de layout Solidity (referencia)

Orden de elementos en `CryptoBankVault.sol`:

1. Interfaces / imports  
2. Errores / eventos  
3. Constantes e immutables  
4. Variables de estado  
5. Modifiers  
6. Constructor  
7. `receive` / `fallback`  
8. Externals → publics → internals → privates  
