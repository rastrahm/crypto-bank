// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";

import {CryptoBankVault} from "../../src/CryptoBankVault.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {VaultHandler} from "./VaultHandler.sol";

/// @title CryptoBankVaultInvariantTest
/// @notice Invariantes de solvencia bajo deposit/withdraw + pause + allowlist.
contract CryptoBankVaultInvariantTest is StdInvariant, Test {
    CryptoBankVault internal vault;
    MockERC20 internal token;
    VaultHandler internal handler;

    address internal owner;

    function setUp() public {
        owner = makeAddr("owner");
        vault = new CryptoBankVault(owner);
        token = new MockERC20("Mock USD", "mUSD");
        handler = new VaultHandler(vault, token, owner);

        vm.prank(owner);
        vault.setTokenAllowed(address(token), true);

        targetContract(address(handler));

        bytes4[] memory selectors = new bytes4[](6);
        selectors[0] = VaultHandler.depositETH.selector;
        selectors[1] = VaultHandler.withdrawETH.selector;
        selectors[2] = VaultHandler.depositERC20.selector;
        selectors[3] = VaultHandler.withdrawERC20.selector;
        selectors[4] = VaultHandler.flipPause.selector;
        selectors[5] = VaultHandler.flipAllowlist.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// @notice ETH físico ≥ suma ledger; ghosts alineados con `totalBalance`.
    function invariant_NativeSolvency() public view {
        assertGe(address(vault).balance, handler.ghostNativeSum());
        assertEq(handler.ghostNativeSum(), _sumNativeLedger());
        assertEq(vault.totalBalance(address(0)), handler.ghostNativeSum());
        assertEq(address(vault).balance, vault.totalBalance(address(0)) + vault.surplusETH());
    }

    /// @notice Balance ERC-20 del vault ≥ suma ledger del mock.
    function invariant_TokenSolvency() public view {
        assertGe(token.balanceOf(address(vault)), handler.ghostTokenSum());
        assertEq(handler.ghostTokenSum(), _sumTokenLedger());
        assertEq(vault.totalBalance(address(token)), handler.ghostTokenSum());
        assertEq(
            token.balanceOf(address(vault)), vault.totalBalance(address(token)) + vault.surplusERC20(address(token))
        );
    }

    /// @notice Sin ETH forzado en el handler: surplus nativo permanece 0.
    function invariant_NoNativeSurplusUnderHandler() public view {
        assertEq(vault.surplusETH(), 0);
    }

    function _sumNativeLedger() internal view returns (uint256 sum) {
        address[] memory actors = handler.actors();
        for (uint256 i = 0; i < actors.length; ++i) {
            sum += vault.balanceOf(actors[i], address(0));
        }
    }

    function _sumTokenLedger() internal view returns (uint256 sum) {
        address[] memory actors = handler.actors();
        for (uint256 i = 0; i < actors.length; ++i) {
            sum += vault.balanceOf(actors[i], address(token));
        }
    }
}
