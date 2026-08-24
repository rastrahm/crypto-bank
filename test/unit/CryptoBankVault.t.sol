// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {CryptoBankVault} from "../../src/CryptoBankVault.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";

/// @title CryptoBankVaultTest
/// @notice Tests unitarios TDD (Fase 1): depósitos/retiros ETH y ERC-20, pausa y errores.
contract CryptoBankVaultTest is Test {
    CryptoBankVault internal vault;
    MockERC20 internal token;

    address internal owner;
    address internal alice;
    address internal bob;

    function setUp() public {
        owner = makeAddr("owner");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        vault = new CryptoBankVault(owner);
        token = new MockERC20("Mock USD", "mUSD");

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        token.mint(alice, 1_000_000 ether);
        token.mint(bob, 1_000_000 ether);
    }

    // ============ Deploy ============

    function test_Deploy_SetsOwner() public view {
        assertEq(vault.owner(), owner);
        assertFalse(vault.paused());
        assertEq(vault.NATIVE(), address(0));
    }

    // ============ depositETH ============

    function test_DepositETH_CreditsLedger() public {
        vm.prank(alice);
        vault.depositETH{value: 1 ether}();

        assertEq(vault.balanceOf(alice, vault.NATIVE()), 1 ether);
        assertEq(address(vault).balance, 1 ether);
    }

    function test_DepositETH_EmitsDeposited() public {
        vm.expectEmit(true, true, false, true);
        emit CryptoBankVault.Deposited(alice, address(0), 2 ether);

        vm.prank(alice);
        vault.depositETH{value: 2 ether}();
    }

    function test_DepositETH_RevertWhen_ZeroValue() public {
        vm.prank(alice);
        vm.expectRevert(CryptoBankVault.ZeroAmount.selector);
        vault.depositETH{value: 0}();
    }

    function test_Receive_CreditsLedger() public {
        vm.prank(alice);
        (bool ok,) = address(vault).call{value: 3 ether}("");
        assertTrue(ok);
        assertEq(vault.balanceOf(alice, address(0)), 3 ether);
    }

    // ============ withdrawETH ============

    function test_WithdrawETH_UpdatesLedgerAndSendsEth() public {
        vm.prank(alice);
        vault.depositETH{value: 5 ether}();

        uint256 beforeBal = alice.balance;

        vm.prank(alice);
        vault.withdrawETH(2 ether);

        assertEq(vault.balanceOf(alice, address(0)), 3 ether);
        assertEq(alice.balance, beforeBal + 2 ether);
        assertEq(address(vault).balance, 3 ether);
    }

    function test_WithdrawETH_EmitsWithdrawn() public {
        vm.prank(alice);
        vault.depositETH{value: 1 ether}();

        vm.expectEmit(true, true, false, true);
        emit CryptoBankVault.Withdrawn(alice, address(0), 1 ether);

        vm.prank(alice);
        vault.withdrawETH(1 ether);
    }

    function test_WithdrawETH_RevertWhen_ZeroAmount() public {
        vm.prank(alice);
        vault.depositETH{value: 1 ether}();

        vm.prank(alice);
        vm.expectRevert(CryptoBankVault.ZeroAmount.selector);
        vault.withdrawETH(0);
    }

    function test_WithdrawETH_RevertWhen_InsufficientBalance() public {
        vm.prank(alice);
        vault.depositETH{value: 1 ether}();

        vm.prank(alice);
        vm.expectRevert(CryptoBankVault.InsufficientVaultBalance.selector);
        vault.withdrawETH(2 ether);
    }

    // ============ ERC-20 ============

    function test_DepositERC20_CreditsLedger() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100 ether);
        vault.depositERC20(address(token), 100 ether);
        vm.stopPrank();

        assertEq(vault.balanceOf(alice, address(token)), 100 ether);
        assertEq(token.balanceOf(address(vault)), 100 ether);
    }

    function test_WithdrawERC20_UpdatesLedgerAndTransfers() public {
        vm.startPrank(alice);
        token.approve(address(vault), 50 ether);
        vault.depositERC20(address(token), 50 ether);

        uint256 beforeBal = token.balanceOf(alice);
        vault.withdrawERC20(address(token), 20 ether);
        vm.stopPrank();

        assertEq(vault.balanceOf(alice, address(token)), 30 ether);
        assertEq(token.balanceOf(alice), beforeBal + 20 ether);
    }

    function test_DepositERC20_RevertWhen_ZeroAmount() public {
        vm.startPrank(alice);
        token.approve(address(vault), 1);
        vm.expectRevert(CryptoBankVault.ZeroAmount.selector);
        vault.depositERC20(address(token), 0);
        vm.stopPrank();
    }

    function test_DepositERC20_RevertWhen_NativeToken() public {
        vm.prank(alice);
        vm.expectRevert(CryptoBankVault.InvalidToken.selector);
        vault.depositERC20(address(0), 1 ether);
    }

    function test_WithdrawERC20_RevertWhen_InsufficientBalance() public {
        vm.prank(alice);
        vm.expectRevert(CryptoBankVault.InsufficientVaultBalance.selector);
        vault.withdrawERC20(address(token), 1 ether);
    }

    // ============ Pause ============

    function test_Pause_BlocksDepositETH() public {
        vm.prank(owner);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.depositETH{value: 1 ether}();
    }

    function test_Pause_BlocksWithdrawETH() public {
        vm.prank(alice);
        vault.depositETH{value: 1 ether}();

        vm.prank(owner);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.withdrawETH(1 ether);
    }

    function test_Unpause_AllowsDepositAgain() public {
        vm.prank(owner);
        vault.pause();
        vm.prank(owner);
        vault.unpause();

        vm.prank(alice);
        vault.depositETH{value: 1 ether}();
        assertEq(vault.balanceOf(alice, address(0)), 1 ether);
    }

    function test_Pause_RevertWhen_NotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.pause();
    }

    // ============ Isolation ============

    function test_Balances_ArePerUser() public {
        vm.prank(alice);
        vault.depositETH{value: 1 ether}();
        vm.prank(bob);
        vault.depositETH{value: 4 ether}();

        assertEq(vault.balanceOf(alice, address(0)), 1 ether);
        assertEq(vault.balanceOf(bob, address(0)), 4 ether);
    }
}
