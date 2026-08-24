// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ICryptoBankVault
/// @notice Interfaz del vault multi-activo (ETH nativo + ERC-20).
/// @dev ETH se representa con el sentinel `address(0)` (constante `NATIVE` en la implementación).
interface ICryptoBankVault {
    /// @notice Credita ETH enviado en `msg.value` al ledger del llamador.
    function depositETH() external payable;

    /// @notice Transfiere `amount` del ERC-20 `token` desde el usuario al vault y lo acredita en el ledger.
    /// @param token Dirección del ERC-20 (no puede ser `address(0)`).
    /// @param amount Cantidad a depositar (> 0).
    function depositERC20(address token, uint256 amount) external;

    /// @notice Debita el ledger y envía ETH nativo al llamador vía `.call`.
    /// @param amount Cantidad a retirar (> 0).
    function withdrawETH(uint256 amount) external;

    /// @notice Debita el ledger y transfiere ERC-20 al llamador.
    /// @param token Dirección del ERC-20.
    /// @param amount Cantidad a retirar (> 0).
    function withdrawERC20(address token, uint256 amount) external;

    /// @notice Saldo contable del usuario para un activo.
    /// @param user Cuenta a consultar.
    /// @param token Activo (`address(0)` = ETH nativo).
    /// @return balance Saldo en el ledger interno.
    function balanceOf(address user, address token) external view returns (uint256 balance);

    /// @notice Pausa depósitos y retiros (solo owner).
    function pause() external;

    /// @notice Reanuda depósitos y retiros (solo owner).
    function unpause() external;
}
