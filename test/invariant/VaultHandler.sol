// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";

import {CryptoBankVault} from "../../src/CryptoBankVault.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";

/// @title VaultHandler
/// @notice Handler para invariant testing: deposit/withdraw + pause + allowlist; ghost balances.
contract VaultHandler is Test {
    CryptoBankVault public immutable vault;
    MockERC20 public immutable token;
    address public immutable owner;

    address[] public actorsList;
    mapping(address => bool) public isActor;

    uint256 public ghostNativeSum;
    uint256 public ghostTokenSum;

    constructor(CryptoBankVault vault_, MockERC20 token_, address owner_) {
        vault = vault_;
        token = token_;
        owner = owner_;

        _addActor(makeAddr("actor0"));
        _addActor(makeAddr("actor1"));
        _addActor(makeAddr("actor2"));

        for (uint256 i = 0; i < actorsList.length; ++i) {
            address a = actorsList[i];
            vm.deal(a, 1_000 ether);
            token.mint(a, 1_000_000 ether);
        }
    }

    function actors() external view returns (address[] memory) {
        return actorsList;
    }

    function depositETH(uint256 actorSeed, uint256 amount) external {
        if (vault.paused()) {
            return;
        }

        address actor = _actor(actorSeed);
        amount = bound(amount, 0, actor.balance);
        if (amount == 0) {
            return;
        }

        vm.prank(actor);
        vault.depositETH{value: amount}();
        ghostNativeSum += amount;
    }

    function withdrawETH(uint256 actorSeed, uint256 amount) external {
        if (vault.paused()) {
            return;
        }

        address actor = _actor(actorSeed);
        uint256 ledger = vault.balanceOf(actor, address(0));
        if (ledger == 0) {
            return;
        }

        amount = bound(amount, 1, ledger);

        vm.prank(actor);
        vault.withdrawETH(amount);
        ghostNativeSum -= amount;
    }

    function depositERC20(uint256 actorSeed, uint256 amount) external {
        if (vault.paused() || !vault.isTokenAllowed(address(token))) {
            return;
        }

        address actor = _actor(actorSeed);
        uint256 walletBal = token.balanceOf(actor);
        amount = bound(amount, 0, walletBal);
        if (amount == 0) {
            return;
        }

        vm.startPrank(actor);
        token.approve(address(vault), amount);
        vault.depositERC20(address(token), amount);
        vm.stopPrank();

        ghostTokenSum += amount;
    }

    function withdrawERC20(uint256 actorSeed, uint256 amount) external {
        if (vault.paused()) {
            return;
        }

        address actor = _actor(actorSeed);
        uint256 ledger = vault.balanceOf(actor, address(token));
        if (ledger == 0) {
            return;
        }

        amount = bound(amount, 1, ledger);

        vm.prank(actor);
        vault.withdrawERC20(address(token), amount);
        ghostTokenSum -= amount;
    }

    /// @notice Alterna pause/unpause (solo owner). Los paths de usuario no-op si está pausado.
    function flipPause(uint256 seed) external {
        bool wantPause = seed % 2 == 0;
        if (wantPause && !vault.paused()) {
            vm.prank(owner);
            vault.pause();
        } else if (!wantPause && vault.paused()) {
            vm.prank(owner);
            vault.unpause();
        }
    }

    /// @notice Alterna allowlist del mock. Delistar no bloquea retiros ni rompe ghosts.
    function flipAllowlist(uint256 seed) external {
        bool allowed = seed % 2 == 0;
        vm.prank(owner);
        vault.setTokenAllowed(address(token), allowed);
    }

    function _addActor(address actor) internal {
        if (!isActor[actor]) {
            isActor[actor] = true;
            actorsList.push(actor);
        }
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actorsList[seed % actorsList.length];
    }
}
