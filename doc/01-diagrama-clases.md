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
        -address owner
        -bool paused
        -uint256 locked
        +receive() payable
        +depositETH() payable
        +depositERC20(address token, uint256 amount)
        +withdrawETH(uint256 amount)
        +withdrawERC20(address token, uint256 amount)
        +balanceOf(address user, address token) view uint256
        +pause()
        +unpause()
        -_deposit(address user, address token, uint256 amount)
        -_withdraw(address user, address token, uint256 amount)
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

    class ReentrancyGuard {
        <<OpenZeppelin o custom>>
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
    }

    class VaultClient {
        <<frontend ethers v6>>
        -provider BrowserProvider
        -signer Signer
        -vault Contract
        +connectWallet() address
        +getBalance(user, token) Promise~bigint~
        +depositETH(amount) Promise~TxResponse~
        +withdrawETH(amount) Promise~TxResponse~
        +depositERC20(token, amount) Promise~TxResponse~
        +withdrawERC20(token, amount) Promise~TxResponse~
        +approveToken(token, amount) Promise~TxResponse~
    }

    class DepositForm {
        <<React client>>
        +onSubmit(amount, asset)
    }

    class WithdrawForm {
        <<React client>>
        +onSubmit(amount, asset)
    }

    class WalletButton {
        <<React client>>
        +onConnect()
    }

    ICryptoBankVault <|.. CryptoBankVault : implements
    Ownable2Step <|-- CryptoBankVault
    Pausable <|-- CryptoBankVault
    ReentrancyGuard <|-- CryptoBankVault
    CryptoBankVault ..> IERC20 : transfer / transferFrom
    CryptoBankVault ..> CryptoBankErrors : reverts
    MockERC20 --|> IERC20
    VaultClient ..> ICryptoBankVault : ABI + address
    VaultClient ..> IERC20 : approve / allowance
    DepositForm --> VaultClient
    WithdrawForm --> VaultClient
    WalletButton --> VaultClient
```

---

## 2. Notas de diseño

### 2.1 Ledger

- Clave compuesta: `balances[user][token]`.
- ETH nativo: token sentinel `address(0)` (constante documentada, p. ej. `NATIVE = address(0)`).

### 2.2 Herencia OZ

- Preferir **Ownable2Step** + **Pausable** + **ReentrancyGuard** de OpenZeppelin v5.
- Alternativa permitida por reglas del módulo: guard custom `uint256` / transient, siempre con CEI.

### 2.3 Frontend

- `VaultClient` encapsula ethers (`BrowserProvider`, `Contract`).
- Componentes React no hablan RPC directamente: delegan en `VaultClient` / hooks finos.
- Validación de montos y addresses con **Zod** antes de firmar txs.

### 2.4 Eventos sugeridos (no dibujados arriba)

```solidity
event Deposited(address indexed user, address indexed token, uint256 amount);
event Withdrawn(address indexed user, address indexed token, uint256 amount);
event EmergencyPaused(address indexed account);
event EmergencyUnpaused(address indexed account);
```

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
