// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockWETH
 * @notice Mock WETH (Wrapped ETH) for local testing
 */
contract MockWETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    receive() external payable {
        _mint(msg.sender, msg.value);
    }
}
