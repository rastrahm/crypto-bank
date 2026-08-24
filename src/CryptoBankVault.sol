// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ICryptoBankVault} from "./interfaces/ICryptoBankVault.sol";

/// @title CryptoBankVault
/// @notice Vault bancario descentralizado con ledger interno para ETH y ERC-20.
/// @dev Aplica CEI, `ReentrancyGuard`, `Pausable` y `Ownable2Step`. ETH solo con `.call{value}("")`.
contract CryptoBankVault is ICryptoBankVault, Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Errors ============

    /// @dev Se intentó depositar o retirar con `amount == 0` (o `msg.value == 0`).
    error ZeroAmount();

    /// @dev El saldo del ledger del usuario es insuficiente para el retiro.
    error InsufficientVaultBalance();

    /// @dev Falló la transferencia nativa ETH (`.call`) o el movimiento de tokens.
    error TransferFailed();

    /// @dev Falló el depósito ERC-20 (`transferFrom` / shortfall).
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
    /// @dev Equivalente a `depositETH()`; respeta pausa y `msg.value > 0`.
    receive() external payable {
        _depositETH(msg.sender, msg.value);
    }

    // ============ External ============

    /// @inheritdoc ICryptoBankVault
    function depositETH() external payable whenNotPaused {
        _depositETH(msg.sender, msg.value);
    }

    /// @inheritdoc ICryptoBankVault
    function depositERC20(address token, uint256 amount) external whenNotPaused nonReentrant {
        if (token == NATIVE) {
            revert InvalidToken();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        // Effects
        _balances[msg.sender][token] += amount;

        // Interactions
        uint256 beforeBal = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - beforeBal;
        if (received != amount) {
            revert DepositFailed();
        }

        emit Deposited(msg.sender, token, amount);
    }

    /// @inheritdoc ICryptoBankVault
    function withdrawETH(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) {
            revert ZeroAmount();
        }

        uint256 bal = _balances[msg.sender][NATIVE];
        if (bal < amount) {
            revert InsufficientVaultBalance();
        }

        // Effects
        _balances[msg.sender][NATIVE] = bal - amount;

        // Interactions
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) {
            revert TransferFailed();
        }

        emit Withdrawn(msg.sender, NATIVE, amount);
    }

    /// @inheritdoc ICryptoBankVault
    function withdrawERC20(address token, uint256 amount) external whenNotPaused nonReentrant {
        if (token == NATIVE) {
            revert InvalidToken();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        uint256 bal = _balances[msg.sender][token];
        if (bal < amount) {
            revert InsufficientVaultBalance();
        }

        // Effects
        _balances[msg.sender][token] = bal - amount;

        // Interactions
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, token, amount);
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

    /// @dev Acredita ETH en el ledger. Usado por `depositETH` y `receive`.
    function _depositETH(address user, uint256 amount) internal {
        if (amount == 0) {
            revert ZeroAmount();
        }
        // `receive` no puede usar `whenNotPaused` en la firma; se chequea aquí.
        if (paused()) {
            revert EnforcedPause();
        }

        _balances[user][NATIVE] += amount;
        emit Deposited(user, NATIVE, amount);
    }
}
