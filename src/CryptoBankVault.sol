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
/// @dev Gas: subtract `unchecked` tras check; delta `balanceOf` en ERC-20 (fee-on-transfer);
///      pause chequeado una sola vez en `receive`; `msg.sender` cacheado en paths calientes.
/// @dev ERC-20: solo depósitos allowlisted. Rescue solo del excedente físico vs `_totalBalances`.
/// @dev Producción: el `initialOwner` debería ser un multisig y/o TimelockController (pause congela retiros).
contract CryptoBankVault is ICryptoBankVault, Ownable2Step, Pausable, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    /// @inheritdoc ICryptoBankVault
    /// @dev `constant` se inlinea en bytecode (sin SLOAD).
    address public constant NATIVE = address(0);

    // ============ State ============

    /// @dev Ledger interno: usuario → token → saldo contable.
    mapping(address user => mapping(address token => uint256 amount)) private _balances;

    /// @dev Suma de ledgers por token (`NATIVE` = ETH). Base para calcular surplus rescatable.
    mapping(address token => uint256 amount) private _totalBalances;

    /// @dev ERC-20 permitidos para `depositERC20`. ETH nativo no usa esta mapping.
    mapping(address token => bool allowed) private _allowedTokens;

    // ============ Constructor ============

    /// @notice Despliega el vault e inicializa el owner en dos pasos (Ownable2Step).
    /// @param initialOwner Preferí multisig/timelock en producción (pausa / allowlist / rescue / ownership).
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ============ Receive ============

    /// @notice Acepta ETH directo y lo acredita como depósito del `msg.sender`.
    /// @dev Equivalente a `depositETH()`. `nonReentrant` unifica la superficie con retiros/ERC-20
    ///      (evita reentrar depósitos desde un `receive` durante `withdrawETH`).
    receive() external payable nonReentrant {
        if (paused()) {
            revert EnforcedPause();
        }
        _credit(msg.sender, NATIVE, msg.value);
    }

    // ============ External ============

    /// @inheritdoc ICryptoBankVault
    /// @dev `nonReentrant` por superficie uniforme (no hay call externo aquí).
    function depositETH() external payable whenNotPaused nonReentrant {
        _credit(msg.sender, NATIVE, msg.value);
    }

    /// @inheritdoc ICryptoBankVault
    /// @dev Acredita el delta real de `balanceOf` (fee-on-transfer). Require allowlist.
    /// @dev Checks → Interactions → Effects bajo `nonReentrant` (el crédito depende del monto recibido).
    function depositERC20(address token, uint256 amount) external whenNotPaused nonReentrant {
        if (token == NATIVE) {
            revert InvalidToken();
        }
        if (!_allowedTokens[token]) {
            revert TokenNotAllowed();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        address account = msg.sender;
        IERC20 erc20 = IERC20(token);

        // Interactions — medir delta (fee-on-transfer / tax tokens).
        uint256 balanceBefore = erc20.balanceOf(address(this));
        erc20.safeTransferFrom(account, address(this), amount);
        uint256 balanceAfter = erc20.balanceOf(address(this));
        if (balanceAfter <= balanceBefore) {
            revert DepositFailed();
        }

        uint256 received;
        unchecked {
            received = balanceAfter - balanceBefore;
        }

        _credit(account, token, received);
    }

    /// @inheritdoc ICryptoBankVault
    function withdrawETH(uint256 amount) external whenNotPaused nonReentrant {
        address account = msg.sender;
        _debit(account, NATIVE, amount);

        emit Withdrawn(account, NATIVE, amount);

        (bool ok,) = account.call{value: amount}("");
        if (!ok) {
            revert TransferFailed();
        }
    }

    /// @inheritdoc ICryptoBankVault
    /// @dev No exige allowlist: si el token se delista, los usuarios pueden seguir retirando.
    function withdrawERC20(address token, uint256 amount) external whenNotPaused nonReentrant {
        if (token == NATIVE) {
            revert InvalidToken();
        }

        address account = msg.sender;
        _debit(account, token, amount);

        emit Withdrawn(account, token, amount);

        IERC20(token).safeTransfer(account, amount);
    }

    /// @inheritdoc ICryptoBankVault
    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        if (token == NATIVE) {
            revert InvalidToken();
        }
        _allowedTokens[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }

    /// @inheritdoc ICryptoBankVault
    /// @dev Solo el excedente `balance - totalBalance(NATIVE)`. No toca fondos del ledger.
    function rescueETH(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) {
            revert InvalidRecipient();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }
        if (amount > surplusETH()) {
            revert RescueExceedsSurplus();
        }

        emit Rescued(NATIVE, to, amount);

        (bool ok,) = to.call{value: amount}("");
        if (!ok) {
            revert TransferFailed();
        }
    }

    /// @inheritdoc ICryptoBankVault
    /// @dev Solo el excedente físico vs ledger. No exige allowlist (tokens enviados por error).
    function rescueERC20(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        if (token == NATIVE) {
            revert InvalidToken();
        }
        if (to == address(0)) {
            revert InvalidRecipient();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }
        if (amount > surplusERC20(token)) {
            revert RescueExceedsSurplus();
        }

        emit Rescued(token, to, amount);

        IERC20(token).safeTransfer(to, amount);
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

    /// @inheritdoc ICryptoBankVault
    function totalBalance(address token) external view returns (uint256 amount) {
        return _totalBalances[token];
    }

    /// @inheritdoc ICryptoBankVault
    function isTokenAllowed(address token) external view returns (bool allowed) {
        return _allowedTokens[token];
    }

    /// @inheritdoc ICryptoBankVault
    function surplusETH() public view returns (uint256 amount) {
        uint256 bal = address(this).balance;
        uint256 accounted = _totalBalances[NATIVE];
        unchecked {
            return bal > accounted ? bal - accounted : 0;
        }
    }

    /// @inheritdoc ICryptoBankVault
    function surplusERC20(address token) public view returns (uint256 amount) {
        if (token == NATIVE) {
            return 0;
        }
        uint256 bal = IERC20(token).balanceOf(address(this));
        uint256 accounted = _totalBalances[token];
        unchecked {
            return bal > accounted ? bal - accounted : 0;
        }
    }

    // ============ Internal ============

    /// @dev Acredita `amount` en el ledger de `user` para `token` (incluye `NATIVE`). Emite `Deposited`.
    /// @dev Caller debe haber validado pausa / allowlist / amount > 0 según el path.
    function _credit(address user, address token, uint256 amount) internal {
        if (amount == 0) {
            revert ZeroAmount();
        }

        _balances[user][token] += amount;
        _totalBalances[token] += amount;
        emit Deposited(user, token, amount);
    }

    /// @dev Debita `amount` del ledger. Revierte si `amount == 0` o saldo insuficiente.
    function _debit(address user, address token, uint256 amount) internal {
        if (amount == 0) {
            revert ZeroAmount();
        }

        uint256 bal = _balances[user][token];
        if (bal < amount) {
            revert InsufficientVaultBalance();
        }

        unchecked {
            _balances[user][token] = bal - amount;
            _totalBalances[token] -= amount;
        }
    }
}
