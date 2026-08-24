// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";

import {CryptoBankVault} from "../../src/CryptoBankVault.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {VaultHandler} from "./VaultHandler.sol";

/// @title CryptoBankVaultInvariantTest
/// @notice Invariantes: solvencia ETH/ERC-20 (suma ledger ≤ balance real del vault).
contract CryptoBankVaultInvariantTest is StdInvariant, Test {
    CryptoBankVault internal vault;
    MockERC20 internal token;
    VaultHandler internal handler;

    address internal owner;

    function setUp() public {
        owner = makeAddr("owner");
        vault = new CryptoBankVault(owner);
        token = new MockERC20("Mock USD", "mUSD");
        handler = new VaultHandler(vault, token);

        targetContract(address(handler));

        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = VaultHandler.depositETH.selector;
        selectors[1] = VaultHandler.withdrawETH.selector;
        selectors[2] = VaultHandler.depositERC20.selector;
        selectors[3] = VaultHandler.withdrawERC20.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// @notice El ETH físico del vault cubre (como mínimo) la suma del ledger nativo trackeada.
    function invariant_NativeSolvency() public view {
        assertGe(address(vault).balance, handler.ghostNativeSum());
        assertEq(handler.ghostNativeSum(), _sumNativeLedger());
    }

    /// @notice El balance ERC-20 del vault cubre la suma del ledger del mock token.
    function invariant_TokenSolvency() public view {
        assertGe(token.balanceOf(address(vault)), handler.ghostTokenSum());
        assertEq(handler.ghostTokenSum(), _sumTokenLedger());
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
