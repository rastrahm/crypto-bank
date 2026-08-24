// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";

import {CryptoBankVault} from "../../src/CryptoBankVault.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";

/// @title CryptoBankVaultFuzzTest
/// @notice Fuzzing de depósitos/retiros con `bound()` sobre montos.
contract CryptoBankVaultFuzzTest is Test {
    CryptoBankVault internal vault;
    MockERC20 internal token;

    address internal owner;
    address internal user;

    function setUp() public {
        owner = makeAddr("owner");
        user = makeAddr("user");
        vault = new CryptoBankVault(owner);
        token = new MockERC20("Mock USD", "mUSD");

        vm.deal(user, 1000 ether);
        token.mint(user, 1_000_000 ether);
    }

    function testFuzz_DepositWithdrawETH(uint256 depositAmount, uint256 withdrawAmount) public {
        depositAmount = bound(depositAmount, 1, 100 ether);
        withdrawAmount = bound(withdrawAmount, 1, depositAmount);

        vm.startPrank(user);
        vault.depositETH{value: depositAmount}();
        vault.withdrawETH(withdrawAmount);
        vm.stopPrank();

        assertEq(vault.balanceOf(user, address(0)), depositAmount - withdrawAmount);
        assertEq(address(vault).balance, depositAmount - withdrawAmount);
    }

    function testFuzz_DepositWithdrawERC20(uint256 depositAmount, uint256 withdrawAmount) public {
        depositAmount = bound(depositAmount, 1, 100_000 ether);
        withdrawAmount = bound(withdrawAmount, 1, depositAmount);

        vm.startPrank(user);
        token.approve(address(vault), depositAmount);
        vault.depositERC20(address(token), depositAmount);
        vault.withdrawERC20(address(token), withdrawAmount);
        vm.stopPrank();

        assertEq(vault.balanceOf(user, address(token)), depositAmount - withdrawAmount);
        assertEq(token.balanceOf(address(vault)), depositAmount - withdrawAmount);
    }

    function testFuzz_DepositETH_CreditsExactAmount(uint256 amount) public {
        amount = bound(amount, 1, user.balance);

        uint256 beforeLedger = vault.balanceOf(user, address(0));
        uint256 beforeVault = address(vault).balance;

        vm.prank(user);
        vault.depositETH{value: amount}();

        assertEq(vault.balanceOf(user, address(0)), beforeLedger + amount);
        assertEq(address(vault).balance, beforeVault + amount);
    }
}
