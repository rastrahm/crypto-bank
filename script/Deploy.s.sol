// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {CryptoBankVault} from "../src/CryptoBankVault.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

/// @title Deploy
/// @notice Despliega `MockERC20` (demo) + `CryptoBankVault` y acuña supply de prueba al broadcaster.
/// @dev Variables de entorno opcionales:
///      - `INITIAL_OWNER` (default: msg.sender / broadcaster)
///      - `MOCK_TOKEN_NAME` (default: "Mock USD")
///      - `MOCK_TOKEN_SYMBOL` (default: "mUSD")
///      - `MOCK_MINT_AMOUNT` (default: 1_000_000 ether, unidades base)
contract Deploy is Script {
    /// @notice Ejecuta el deploy completo para demo local/testnet.
    /// @return vault Instancia de CryptoBankVault.
    /// @return token Instancia de MockERC20.
    function run() external returns (CryptoBankVault vault, MockERC20 token) {
        address initialOwner = vm.envOr("INITIAL_OWNER", msg.sender);
        string memory tokenName = vm.envOr("MOCK_TOKEN_NAME", string("Mock USD"));
        string memory tokenSymbol = vm.envOr("MOCK_TOKEN_SYMBOL", string("mUSD"));
        uint256 mintAmount = vm.envOr("MOCK_MINT_AMOUNT", uint256(1_000_000 ether));

        vm.startBroadcast();

        token = new MockERC20(tokenName, tokenSymbol);
        vault = new CryptoBankVault(initialOwner);
        token.mint(msg.sender, mintAmount);

        vm.stopBroadcast();

        console2.log("MockERC20 deployed at:", address(token));
        console2.log("CryptoBankVault deployed at:", address(vault));
        console2.log("Vault owner:", initialOwner);
        console2.log("Mock minted to broadcaster:", mintAmount);
    }
}
