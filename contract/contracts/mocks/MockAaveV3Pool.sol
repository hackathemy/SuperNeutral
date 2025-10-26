// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockAaveV3Pool
 * @notice Mock Aave V3 Pool for local testing
 * @dev Implements supply() and withdraw() without actual Aave logic
 */
contract MockAaveV3Pool {
    // Mock aToken that gets minted on supply
    MockAToken public immutable aWETH;
    IERC20 public immutable WETH;

    constructor(address _weth, address _aWETH) {
        WETH = IERC20(_weth);
        aWETH = MockAToken(_aWETH);
    }

    /**
     * @dev Supply WETH and receive aWETH
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /* referralCode */
    ) external {
        require(asset == address(WETH), "Only WETH supported");
        require(amount > 0, "Zero amount");

        // Transfer WETH from user
        WETH.transferFrom(msg.sender, address(this), amount);

        // Mint aWETH to user
        aWETH.mint(onBehalfOf, amount);
    }

    /**
     * @dev Withdraw WETH by burning aWETH
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(asset == address(WETH), "Only WETH supported");
        require(amount > 0, "Zero amount");

        // Burn aWETH from caller
        aWETH.burn(msg.sender, amount);

        // Transfer WETH to recipient
        WETH.transfer(to, amount);

        return amount;
    }
}

/**
 * @title MockAToken
 * @notice Mock aToken (Aave interest-bearing token)
 */
contract MockAToken is ERC20 {
    address public immutable pool;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        pool = msg.sender;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == pool, "Only pool");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == pool, "Only pool");
        _burn(from, amount);
    }

    function scaledBalanceOf(address account) external view returns (uint256) {
        return balanceOf(account);
    }
}
