// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {CryptoBankVault} from "../../src/CryptoBankVault.sol";
import {ICryptoBankVault} from "../../src/interfaces/ICryptoBankVault.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {MockFeeOnTransferERC20} from "../../src/mocks/MockFeeOnTransferERC20.sol";

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

        vm.prank(owner);
        vault.setTokenAllowed(address(token), true);

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
        emit ICryptoBankVault.Deposited(alice, address(0), 2 ether);

        vm.prank(alice);
        vault.depositETH{value: 2 ether}();
    }

    function test_DepositETH_RevertWhen_ZeroValue() public {
        vm.prank(alice);
        vm.expectRevert(ICryptoBankVault.ZeroAmount.selector);
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
        emit ICryptoBankVault.Withdrawn(alice, address(0), 1 ether);

        vm.prank(alice);
        vault.withdrawETH(1 ether);
    }

    function test_WithdrawETH_RevertWhen_ZeroAmount() public {
        vm.prank(alice);
        vault.depositETH{value: 1 ether}();

        vm.prank(alice);
        vm.expectRevert(ICryptoBankVault.ZeroAmount.selector);
        vault.withdrawETH(0);
    }

    function test_WithdrawETH_RevertWhen_InsufficientBalance() public {
        vm.prank(alice);
        vault.depositETH{value: 1 ether}();

        vm.prank(alice);
        vm.expectRevert(ICryptoBankVault.InsufficientVaultBalance.selector);
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
        vm.expectRevert(ICryptoBankVault.ZeroAmount.selector);
        vault.depositERC20(address(token), 0);
        vm.stopPrank();
    }

    function test_DepositERC20_RevertWhen_NativeToken() public {
        vm.prank(alice);
        vm.expectRevert(ICryptoBankVault.InvalidToken.selector);
        vault.depositERC20(address(0), 1 ether);
    }

    function test_DepositERC20_FeeOnTransfer_CreditsReceivedOnly() public {
        MockFeeOnTransferERC20 tax = new MockFeeOnTransferERC20("Tax USD", "tUSD", 1_000); // 10%
        tax.mint(alice, 100 ether);

        vm.prank(owner);
        vault.setTokenAllowed(address(tax), true);

        vm.startPrank(alice);
        tax.approve(address(vault), 100 ether);
        vault.depositERC20(address(tax), 100 ether);
        vm.stopPrank();

        // Vault recibe 90; ledger debe coincidir (no acreditar 100).
        assertEq(vault.balanceOf(alice, address(tax)), 90 ether);
        assertEq(tax.balanceOf(address(vault)), 90 ether);

        vm.prank(alice);
        vault.withdrawERC20(address(tax), 90 ether);
        assertEq(vault.balanceOf(alice, address(tax)), 0);
        // withdraw también paga fee: alice recibe 81 de los 90 del vault.
        assertEq(tax.balanceOf(alice), 81 ether);
        assertEq(tax.balanceOf(address(vault)), 0);
    }

    function test_DepositERC20_RevertWhen_FullFee() public {
        MockFeeOnTransferERC20 tax = new MockFeeOnTransferERC20("Drain", "DRN", 10_000); // 100%
        tax.mint(alice, 10 ether);

        vm.prank(owner);
        vault.setTokenAllowed(address(tax), true);

        vm.startPrank(alice);
        tax.approve(address(vault), 10 ether);
        vm.expectRevert(ICryptoBankVault.DepositFailed.selector);
        vault.depositERC20(address(tax), 10 ether);
        vm.stopPrank();

        assertEq(vault.balanceOf(alice, address(tax)), 0);
        assertEq(tax.balanceOf(address(vault)), 0);
    }

    function test_DepositERC20_RevertWhen_TokenNotAllowed() public {
        MockERC20 other = new MockERC20("Other", "OTH");
        other.mint(alice, 10 ether);

        vm.startPrank(alice);
        other.approve(address(vault), 10 ether);
        vm.expectRevert(ICryptoBankVault.TokenNotAllowed.selector);
        vault.depositERC20(address(other), 10 ether);
        vm.stopPrank();
    }

    function test_SetTokenAllowed_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.setTokenAllowed(address(token), false);
    }

    function test_WithdrawERC20_AfterDelist_StillWorks() public {
        vm.startPrank(alice);
        token.approve(address(vault), 5 ether);
        vault.depositERC20(address(token), 5 ether);
        vm.stopPrank();

        vm.prank(owner);
        vault.setTokenAllowed(address(token), false);

        assertFalse(vault.isTokenAllowed(address(token)));

        vm.prank(alice);
        vault.withdrawERC20(address(token), 5 ether);
        assertEq(vault.balanceOf(alice, address(token)), 0);
    }

    function test_WithdrawERC20_RevertWhen_InsufficientBalance() public {
        vm.prank(alice);
        vm.expectRevert(ICryptoBankVault.InsufficientVaultBalance.selector);
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
        assertEq(vault.totalBalance(address(0)), 5 ether);
    }

    // ============ Rescue ============

    function test_RescueETH_SurplusOnly() public {
        vm.prank(alice);
        vault.depositETH{value: 2 ether}();

        new UnitEthForcedSender{value: 1 ether}(payable(address(vault)));
        assertEq(vault.surplusETH(), 1 ether);
        assertEq(vault.totalBalance(address(0)), 2 ether);

        uint256 ownerBefore = owner.balance;
        vm.prank(owner);
        vault.rescueETH(owner, 1 ether);

        assertEq(owner.balance, ownerBefore + 1 ether);
        assertEq(address(vault).balance, 2 ether);
        assertEq(vault.balanceOf(alice, address(0)), 2 ether);
        assertEq(vault.surplusETH(), 0);
    }

    function test_RescueETH_RevertWhen_TouchesLedger() public {
        vm.prank(alice);
        vault.depositETH{value: 1 ether}();

        vm.prank(owner);
        vm.expectRevert(ICryptoBankVault.RescueExceedsSurplus.selector);
        vault.rescueETH(owner, 1);
    }

    function test_RescueERC20_DirectTransferSurplus() public {
        token.mint(bob, 3 ether);
        vm.prank(bob);
        token.transfer(address(vault), 3 ether);

        assertEq(vault.surplusERC20(address(token)), 3 ether);
        assertEq(vault.totalBalance(address(token)), 0);

        vm.prank(owner);
        vault.rescueERC20(address(token), owner, 3 ether);

        assertEq(token.balanceOf(owner), 3 ether);
        assertEq(vault.surplusERC20(address(token)), 0);
    }
}

/// @dev Fuerza ETH al vault vía selfdestruct (tests de rescue / SWC-132).
contract UnitEthForcedSender {
    constructor(address payable target) payable {
        selfdestruct(target);
    }
}
