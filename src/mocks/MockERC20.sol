// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title MockERC20
/// @notice ERC-20 de prueba con `mint` + EIP-2612 `permit` para la suite Foundry y la demo.
contract MockERC20 is ERC20, ERC20Permit {
    /// @notice Despliega un mock con nombre y símbolo configurables.
    /// @param name_ Nombre del token (también dominio EIP-712).
    /// @param symbol_ Símbolo del token.
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) ERC20Permit(name_) {}

    /// @notice Acuña `amount` tokens a `to` (solo para tests/demo).
    /// @param to Destinatario.
    /// @param amount Cantidad a acuñar.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
