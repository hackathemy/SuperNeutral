// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPYUSD
 * @notice Mock PYUSD token for testing on Sepolia
 * @dev Mintable ERC20 token with 6 decimals (like real PYUSD)
 */
contract MockPYUSD is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6;

    constructor() ERC20("Mock PayPal USD", "mPYUSD") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**_DECIMALS); // 1M PYUSD
    }

    /**
     * @dev Returns the number of decimals (6 for PYUSD compatibility)
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @dev Mint new tokens (for testing)
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Faucet function for testing
     * Anyone can get 10000 mPYUSD for testing
     */
    function faucet() external {
        _mint(msg.sender, 10000 * 10**_DECIMALS);
    }
}