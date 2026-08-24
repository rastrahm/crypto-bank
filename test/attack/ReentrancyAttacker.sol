// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {CryptoBankVault} from "../../src/CryptoBankVault.sol";

/// @title ReentrancyAttacker
/// @notice Intenta reentrar en `withdrawETH` desde `receive` (el ataque debe fallar).
contract ReentrancyAttacker {
    CryptoBankVault public immutable vault;
    uint256 public attackAmount;
    bool public attacking;

    constructor(CryptoBankVault vault_) {
        vault = vault_;
    }

    /// @notice Activa el flag y retira todo el saldo ETH del ledger de este contrato.
    function triggerWithdraw() external {
        attackAmount = vault.balanceOf(address(this), vault.NATIVE());
        attacking = true;
        vault.withdrawETH(attackAmount);
        attacking = false;
    }

    receive() external payable {
        if (attacking && address(vault).balance >= attackAmount && attackAmount > 0) {
            // Reentrada: el guard debe impedir un segundo withdraw exitoso.
            vault.withdrawETH(attackAmount);
        }
    }
}
