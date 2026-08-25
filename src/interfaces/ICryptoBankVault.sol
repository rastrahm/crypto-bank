// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ICryptoBankVault
/// @notice Interfaz del vault multi-activo (ETH nativo + ERC-20 allowlisted).
/// @dev Sentinel nativo: `NATIVE() == address(0)` (constante pública en la implementación).
interface ICryptoBankVault {
    // ============ Errors ============

    /// @dev Depósito o retiro con `amount == 0` (o `msg.value == 0`).
    error ZeroAmount();

    /// @dev Saldo de ledger insuficiente para el retiro.
    error InsufficientVaultBalance();

    /// @dev Falló la transferencia nativa ETH (`.call`).
    error TransferFailed();

    /// @dev El vault no recibió tokens tras `transferFrom` (fee 100%, shortfall, etc.).
    error DepositFailed();

    /// @dev `address(0)` u otro token inválido donde se esperaba un ERC-20.
    error InvalidToken();

    /// @dev ERC-20 no allowlisted para depósitos.
    error TokenNotAllowed();

    /// @dev Destinatario de rescue inválido (`address(0)`).
    error InvalidRecipient();

    /// @dev Rescue mayor que el surplus físico no contabilizado.
    error RescueExceedsSurplus();

    // ============ Events ============

    /// @notice Depósito acreditado en el ledger.
    /// @param user Cuenta acreditada.
    /// @param token Activo (`address(0)` = ETH).
    /// @param amount Cantidad acreditada.
    event Deposited(address indexed user, address indexed token, uint256 amount);

    /// @notice Retiro debitado del ledger.
    /// @param user Cuenta debitada.
    /// @param token Activo (`address(0)` = ETH).
    /// @param amount Cantidad debitada.
    event Withdrawn(address indexed user, address indexed token, uint256 amount);

    /// @notice Cambio de allowlist de un ERC-20.
    event TokenAllowlistUpdated(address indexed token, bool allowed);

    /// @notice Rescue de excedente no contabilizado.
    event Rescued(address indexed token, address indexed to, uint256 amount);

    // ============ Functions ============

    /// @notice Sentinel ETH nativo (`address(0)`).
    function NATIVE() external view returns (address);

    /// @notice Credita ETH enviado en `msg.value` al ledger del llamador.
    function depositETH() external payable;

    /// @notice Transfiere `amount` del ERC-20 allowlisted `token` y acredita el delta recibido.
    /// @param token Dirección del ERC-20 (no puede ser `address(0)`; debe estar allowlisted).
    /// @param amount Cantidad solicitada en `transferFrom` (> 0); el ledger usa lo efectivamente recibido.
    function depositERC20(address token, uint256 amount) external;

    /// @notice Debita el ledger y envía ETH nativo al llamador vía `.call`.
    /// @param amount Cantidad a retirar (> 0).
    function withdrawETH(uint256 amount) external;

    /// @notice Debita el ledger y transfiere ERC-20 al llamador (no exige allowlist).
    /// @param token Dirección del ERC-20.
    /// @param amount Cantidad a retirar (> 0).
    function withdrawERC20(address token, uint256 amount) external;

    /// @notice Incluye o excluye un ERC-20 de la allowlist de depósitos (solo owner).
    /// @param token Dirección del ERC-20 (no `address(0)`).
    /// @param allowed `true` para permitir depósitos; `false` para bloquearlos.
    function setTokenAllowed(address token, bool allowed) external;

    /// @notice Rescata ETH no contabilizado en el ledger (p. ej. forzado por `selfdestruct`).
    /// @param to Destinatario (no `address(0)`).
    /// @param amount Cantidad ≤ `surplusETH()`.
    function rescueETH(address to, uint256 amount) external;

    /// @notice Rescata ERC-20 no contabilizado (p. ej. transfer directo al vault).
    /// @param token Dirección del ERC-20.
    /// @param to Destinatario (no `address(0)`).
    /// @param amount Cantidad ≤ `surplusERC20(token)`.
    function rescueERC20(address token, address to, uint256 amount) external;

    /// @notice Saldo contable del usuario para un activo.
    /// @param user Cuenta a consultar.
    /// @param token Activo (`address(0)` = ETH nativo).
    /// @return balance Saldo en el ledger interno.
    function balanceOf(address user, address token) external view returns (uint256 balance);

    /// @notice Suma de saldos de ledger para un activo.
    /// @param token Activo (`address(0)` = ETH nativo).
    /// @return amount Total contabilizado.
    function totalBalance(address token) external view returns (uint256 amount);

    /// @notice Indica si `token` puede usarse en `depositERC20`.
    /// @param token Dirección del ERC-20.
    /// @return allowed `true` si está en la allowlist.
    function isTokenAllowed(address token) external view returns (bool allowed);

    /// @notice ETH físico menos suma del ledger nativo.
    function surplusETH() external view returns (uint256 amount);

    /// @notice Balance ERC-20 físico menos suma del ledger de ese token.
    function surplusERC20(address token) external view returns (uint256 amount);

    /// @notice Pausa depósitos y retiros (solo owner).
    function pause() external;

    /// @notice Reanuda depósitos y retiros (solo owner).
    function unpause() external;
}
