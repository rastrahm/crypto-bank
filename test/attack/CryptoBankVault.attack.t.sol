// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {CryptoBankVault} from "../../src/CryptoBankVault.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {ReentrancyAttacker} from "./ReentrancyAttacker.sol";

/// @dev Receptor que rechaza ETH (para forzar fallo del `.call` en withdraw).
contract RejectEther {
    error Reject();

    receive() external payable {
        revert Reject();
    }
}

/// @dev Fuerza ETH al vault vía selfdestruct (bypass de receive/deposit).
contract EthForcedSender {
    constructor(address payable target) payable {
        selfdestruct(target);
    }
}

/// @title CryptoBankVaultAttackTest
/// @notice Campañas defensivas A–E (SWC) adaptadas al vault. Ver `doc/ATAQUES.md`.
contract CryptoBankVaultAttackTest is Test {
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

    // ============ Campaña A — Integridad balances / allowances ============

    function test_AttackA1_WithdrawETH_OverLedger() public {
        vm.prank(alice);
        vault.depositETH{value: 1 ether}();

        vm.prank(alice);
        vm.expectRevert(CryptoBankVault.InsufficientVaultBalance.selector);
        vault.withdrawETH(1 ether + 1);
    }

    function test_AttackA2_WithdrawETH_WithoutDeposit() public {
        vm.prank(alice);
        vm.expectRevert(CryptoBankVault.InsufficientVaultBalance.selector);
        vault.withdrawETH(1 wei);
    }

    function test_AttackA3_DepositERC20_WithoutApprove() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.depositERC20(address(token), 10 ether);
    }

    function test_AttackA4_DepositERC20_PartialAllowanceThenOverspend() public {
        vm.startPrank(alice);
        token.approve(address(vault), 5 ether);
        vault.depositERC20(address(token), 5 ether);

        vm.expectRevert();
        vault.depositERC20(address(token), 1 ether);
        vm.stopPrank();

        assertEq(vault.balanceOf(alice, address(token)), 5 ether);
    }

    function test_AttackA5_CannotWithdrawOtherUsersLedger() public {
        vm.prank(alice);
        vault.depositETH{value: 3 ether}();

        vm.prank(bob);
        vm.expectRevert(CryptoBankVault.InsufficientVaultBalance.selector);
        vault.withdrawETH(1 ether);

        assertEq(vault.balanceOf(alice, address(0)), 3 ether);
        assertEq(vault.balanceOf(bob, address(0)), 0);
    }

    function test_AttackA6_WithdrawERC20_OverLedger() public {
        vm.startPrank(alice);
        token.approve(address(vault), 2 ether);
        vault.depositERC20(address(token), 2 ether);
        vm.expectRevert(CryptoBankVault.InsufficientVaultBalance.selector);
        vault.withdrawERC20(address(token), 3 ether);
        vm.stopPrank();
    }

    function test_AttackA7_DepositERC20_NativeSentinelRejected() public {
        vm.prank(alice);
        vm.expectRevert(CryptoBankVault.InvalidToken.selector);
        vault.depositERC20(address(0), 1 ether);
    }

    function test_AttackA8_WithdrawETH_RejectingReceiver() public {
        RejectEther rejector = new RejectEther();
        vm.deal(address(rejector), 2 ether);

        vm.prank(address(rejector));
        vault.depositETH{value: 2 ether}();

        vm.prank(address(rejector));
        vm.expectRevert(CryptoBankVault.TransferFailed.selector);
        vault.withdrawETH(1 ether);

        assertEq(vault.balanceOf(address(rejector), address(0)), 2 ether);
        assertEq(address(vault).balance, 2 ether);
    }

    function test_AttackA9_Pause_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vault.pause();
    }

    // ============ Campaña B — Permit (N/A en vault) ============

    /// @notice Checklist: el vault no expone `permit` / `nonces` / `DOMAIN_SEPARATOR`.
    function test_AttackB0_NoPermitSurface() public view {
        bytes4 permitSel = bytes4(keccak256("permit(address,address,uint256,uint256,uint8,bytes32,bytes32)"));
        bytes4 noncesSel = bytes4(keccak256("nonces(address)"));
        bytes4 domainSel = bytes4(keccak256("DOMAIN_SEPARATOR()"));

        (bool okPermit,) = address(vault)
            .staticcall(
                abi.encodeWithSelector(permitSel, alice, bob, uint256(0), uint256(0), uint8(0), bytes32(0), bytes32(0))
            );
        (bool okNonces,) = address(vault).staticcall(abi.encodeWithSelector(noncesSel, alice));
        (bool okDomain,) = address(vault).staticcall(abi.encodeWithSelector(domainSel));

        assertFalse(okPermit);
        assertFalse(okNonces);
        assertFalse(okDomain);
    }

    // ============ Campaña C — Orden de transacciones (ERC-20) ============

    /// @notice Documental: overwrite N→M sin `approve(0)` es válido (limitación ERC-20 / SWC-114).
    function test_AttackC1_ApproveOverwriteWithoutZeroing() public {
        vm.startPrank(alice);
        token.approve(address(vault), 100 ether);
        assertEq(token.allowance(alice, address(vault)), 100 ether);

        token.approve(address(vault), 40 ether);
        assertEq(token.allowance(alice, address(vault)), 40 ether);
        vm.stopPrank();
    }

    // ============ Campaña D — unchecked seguro ============

    function test_AttackD1_ExactNativeDrain() public {
        vm.prank(alice);
        vault.depositETH{value: 7 ether}();

        uint256 before = alice.balance;
        vm.prank(alice);
        vault.withdrawETH(7 ether);

        assertEq(vault.balanceOf(alice, address(0)), 0);
        assertEq(alice.balance, before + 7 ether);
        assertEq(address(vault).balance, 0);
    }

    function test_AttackD2_ExactErc20Drain() public {
        vm.startPrank(alice);
        token.approve(address(vault), 11 ether);
        vault.depositERC20(address(token), 11 ether);
        uint256 before = token.balanceOf(alice);
        vault.withdrawERC20(address(token), 11 ether);
        vm.stopPrank();

        assertEq(vault.balanceOf(alice, address(token)), 0);
        assertEq(token.balanceOf(alice), before + 11 ether);
        assertEq(token.balanceOf(address(vault)), 0);
    }

    function test_AttackD3_PartialWithdrawsThenFail() public {
        vm.prank(alice);
        vault.depositETH{value: 10 ether}();

        vm.startPrank(alice);
        vault.withdrawETH(4 ether);
        vault.withdrawETH(6 ether);
        vm.expectRevert(CryptoBankVault.InsufficientVaultBalance.selector);
        vault.withdrawETH(1 wei);
        vm.stopPrank();

        assertEq(vault.balanceOf(alice, address(0)), 0);
    }

    // ============ Campaña E — Superficie ============

    function test_AttackE1_ReentrancyBlockedDoesNotDrain() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker(vault);
        vm.deal(address(attacker), 5 ether);

        vm.prank(alice);
        vault.depositETH{value: 10 ether}();

        vm.prank(address(attacker));
        vault.depositETH{value: 5 ether}();

        vm.expectRevert(CryptoBankVault.TransferFailed.selector);
        attacker.triggerWithdraw();

        assertEq(address(vault).balance, 15 ether);
        assertEq(vault.balanceOf(alice, address(0)), 10 ether);
        assertEq(vault.balanceOf(address(attacker), address(0)), 5 ether);
    }

    function test_AttackE2_ForcedEthDoesNotCreditLedger() public {
        vm.prank(alice);
        vault.depositETH{value: 1 ether}();

        uint256 ledgerBefore = vault.balanceOf(alice, address(0));
        new EthForcedSender{value: 3 ether}(payable(address(vault)));

        assertEq(address(vault).balance, 4 ether);
        assertEq(vault.balanceOf(alice, address(0)), ledgerBefore);
        assertGe(address(vault).balance, vault.balanceOf(alice, address(0)));
    }

    function test_AttackE3_NoSelfdestructOrDelegatecallInSource() public {
        string memory src = vm.readFile("src/CryptoBankVault.sol");
        assertFalse(_contains(src, "selfdestruct"));
        assertFalse(_contains(src, "delegatecall"));
        assertFalse(_contains(src, "suicide("));
    }

    function test_AttackE4_PauseBlocksDepositAndReceive() public {
        vm.prank(owner);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.depositETH{value: 1 ether}();

        vm.prank(alice);
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertFalse(ok);
        assertEq(vault.balanceOf(alice, address(0)), 0);
        assertEq(address(vault).balance, 0);
    }

    function _contains(string memory data, string memory needle) internal pure returns (bool) {
        bytes memory d = bytes(data);
        bytes memory n = bytes(needle);
        if (n.length == 0 || n.length > d.length) {
            return false;
        }
        uint256 end = d.length - n.length;
        for (uint256 i = 0; i <= end; ++i) {
            bool found = true;
            for (uint256 j = 0; j < n.length; ++j) {
                if (d[i + j] != n[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
        return false;
    }
}
