// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockFeeOnTransferERC20
/// @notice ERC-20 de prueba que cobra fee en cada transfer/transferFrom (simula tax token).
contract MockFeeOnTransferERC20 is ERC20 {
    /// @notice Fee en basis points (100 = 1%).
    uint256 public immutable feeBps;

    /// @param name_ Nombre del token.
    /// @param symbol_ Símbolo del token.
    /// @param feeBps_ Fee en bps (p. ej. 1000 = 10%).
    constructor(string memory name_, string memory symbol_, uint256 feeBps_) ERC20(name_, symbol_) {
        require(feeBps_ <= 10_000, "fee too high");
        feeBps = feeBps_;
    }

    /// @notice Acuña `amount` tokens a `to` (solo tests/demo).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = _msgSender();
        uint256 fee = (amount * feeBps) / 10_000;
        uint256 sendAmount = amount - fee;
        _transfer(owner, to, sendAmount);
        if (fee > 0) {
            _burn(owner, fee);
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        _spendAllowance(from, _msgSender(), amount);
        uint256 fee = (amount * feeBps) / 10_000;
        uint256 sendAmount = amount - fee;
        _transfer(from, to, sendAmount);
        if (fee > 0) {
            _burn(from, fee);
        }
        return true;
    }
}
