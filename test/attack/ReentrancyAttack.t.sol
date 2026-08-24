// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";

import {CryptoBankVault} from "../../src/CryptoBankVault.sol";
import {ReentrancyAttacker} from "./ReentrancyAttacker.sol";

/// @title ReentrancyAttackTest
/// @notice Valida que un receptor malicioso no puede drenar el vault vía reentrancy.
contract ReentrancyAttackTest is Test {
    CryptoBankVault internal vault;
    ReentrancyAttacker internal attacker;

    address internal owner;
    address internal victim;

    function setUp() public {
        owner = makeAddr("owner");
        victim = makeAddr("victim");

        vault = new CryptoBankVault(owner);
        attacker = new ReentrancyAttacker(vault);

        vm.deal(victim, 10 ether);
        vm.deal(address(attacker), 5 ether);

        vm.prank(victim);
        vault.depositETH{value: 10 ether}();
    }

    /// @notice La reentrada hace fallar el `.call`; la tx revierte y el vault no se drena.
    function test_Attack_ReentrancyOnWithdrawETH_RevertsAndDoesNotDrain() public {
        vm.prank(address(attacker));
        vault.depositETH{value: 5 ether}();
        assertEq(address(vault).balance, 15 ether);

        // Inner `withdrawETH` revierte por guard → `receive` revierte → `.call` retorna false
        // → el vault hace `revert TransferFailed()` y deshace el retiro externo.
        vm.expectRevert(CryptoBankVault.TransferFailed.selector);
        attacker.triggerWithdraw();

        assertEq(address(vault).balance, 15 ether);
        assertEq(vault.balanceOf(victim, address(0)), 10 ether);
        assertEq(vault.balanceOf(address(attacker), address(0)), 5 ether);
    }
}
