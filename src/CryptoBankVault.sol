// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ICryptoBankVault} from "./interfaces/ICryptoBankVault.sol";

/// @title CryptoBankVault
/// @notice Vault bancario descentralizado con ledger interno para ETH y ERC-20.
/// @dev CEI + `ReentrancyGuardTransient` (EIP-1153) + `Pausable` + `Ownable2Step`.
/// @dev Gas: subtract `unchecked` tras check; sin delta `balanceOf` en ERC-20 (solo tokens honestos);
///      pause chequeado una sola vez en `receive`; `msg.sender` cacheado en paths calientes.
contract CryptoBankVault is ICryptoBankVault, Ownable2Step, Pausable, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    // ============ Errors ============

    /// @dev Se intentó depositar o retirar con `amount == 0` (o `msg.value == 0`).
    error ZeroAmount();

    /// @dev El saldo del ledger del usuario es insuficiente para el retiro.
    error InsufficientVaultBalance();

    /// @dev Falló la transferencia nativa ETH (`.call`).
    error TransferFailed();

    /// @dev Falló el depósito ERC-20 (reservado / shortfall de tokens no estándar).
    error DepositFailed();

    /// @dev Se usó `address(0)` donde se esperaba un ERC-20, o un token inválido.
    error InvalidToken();

    // ============ Events ============

    /// @notice Emitido cuando un usuario deposita un activo en el vault.
    /// @param user Cuenta acreditada en el ledger.
    /// @param token Activo (`address(0)` = ETH).
    /// @param amount Cantidad depositada.
    event Deposited(address indexed user, address indexed token, uint256 amount);

    /// @notice Emitido cuando un usuario retira un activo del vault.
    /// @param user Cuenta debitada en el ledger.
    /// @param token Activo (`address(0)` = ETH).
    /// @param amount Cantidad retirada.
    event Withdrawn(address indexed user, address indexed token, uint256 amount);

    // ============ Constants ============

    /// @notice Sentinel para ETH nativo en el ledger (`balances[user][NATIVE]`).
    /// @dev `constant` se inlinea en bytecode (sin SLOAD).
    address public constant NATIVE = address(0);

    // ============ State ============

    /// @dev Ledger interno: usuario → token → saldo contable.
    mapping(address user => mapping(address token => uint256 amount)) private _balances;

    // ============ Constructor ============

    /// @notice Despliega el vault e inicializa el owner en dos pasos (Ownable2Step).
    /// @param initialOwner Cuenta propietaria inicial (pausa / ownership).
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ============ Receive ============

    /// @notice Acepta ETH directo y lo acredita como depósito del `msg.sender`.
    /// @dev Equivalente a `depositETH()`; el check de pausa vive aquí (no hay modifier en `receive`).
    receive() external payable {
        if (paused()) {
            revert EnforcedPause();
        }
        _creditNative(msg.sender, msg.value);
    }

    // ============ External ============

    /// @inheritdoc ICryptoBankVault
    function depositETH() external payable whenNotPaused {
        _creditNative(msg.sender, msg.value);
    }

    /// @inheritdoc ICryptoBankVault
    /// @dev Asume ERC-20 honestos (sin fee-on-transfer). No se hacen `balanceOf` extra a propósito (gas).
    function depositERC20(address token, uint256 amount) external whenNotPaused nonReentrant {
        if (token == NATIVE) {
            revert InvalidToken();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        address account = msg.sender;

        // Effects
        _balances[account][token] += amount;

        // Interactions
        IERC20(token).safeTransferFrom(account, address(this), amount);

        emit Deposited(account, token, amount);
    }

    /// @inheritdoc ICryptoBankVault
    function withdrawETH(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) {
            revert ZeroAmount();
        }

        address account = msg.sender;
        uint256 bal = _balances[account][NATIVE];
        if (bal < amount) {
            revert InsufficientVaultBalance();
        }

        // Effects — `unchecked` seguro: `bal >= amount` ya verificado.
        unchecked {
            _balances[account][NATIVE] = bal - amount;
        }

        // Interactions
        (bool ok,) = account.call{value: amount}("");
        if (!ok) {
            revert TransferFailed();
        }

        emit Withdrawn(account, NATIVE, amount);
    }

    /// @inheritdoc ICryptoBankVault
    function withdrawERC20(address token, uint256 amount) external whenNotPaused nonReentrant {
        if (token == NATIVE) {
            revert InvalidToken();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        address account = msg.sender;
        uint256 bal = _balances[account][token];
        if (bal < amount) {
            revert InsufficientVaultBalance();
        }

        // Effects
        unchecked {
            _balances[account][token] = bal - amount;
        }

        // Interactions
        IERC20(token).safeTransfer(account, amount);

        emit Withdrawn(account, token, amount);
    }

    /// @inheritdoc ICryptoBankVault
    function pause() external onlyOwner {
        _pause();
    }

    /// @inheritdoc ICryptoBankVault
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Views ============

    /// @inheritdoc ICryptoBankVault
    function balanceOf(address user, address token) external view returns (uint256 balance) {
        return _balances[user][token];
    }

    // ============ Internal ============

    /// @dev Acredita ETH en el ledger. Caller debe haber validado `!paused` (`whenNotPaused` o check en `receive`).
    function _creditNative(address user, uint256 amount) internal {
        if (amount == 0) {
            revert ZeroAmount();
        }

        _balances[user][NATIVE] += amount;
        emit Deposited(user, NATIVE, amount);
    }
}
