// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IShortPosition.sol";

/**
 * @title AaveUniswapShort
 * @notice Short position implementation using Aave borrowing + Uniswap V3
 * @dev Works on Sepolia testnet with real Aave V3 and Uniswap V3
 *
 * How it works:
 * 1. Open Short:
 *    - Use ETH as collateral
 *    - Borrow WETH from Aave V3
 *    - Swap WETH → USDC on Uniswap V3
 *    - Hold USDC (betting ETH price goes down)
 *
 * 2. Close Short:
 *    - Swap USDC → WETH on Uniswap V3
 *    - Repay Aave V3 loan
 *    - Return remaining ETH as profit/loss
 */

// Aave V3 Pool Interface
interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256);
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

// Uniswap V3 SwapRouter Interface
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

// WETH Interface
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AaveUniswapShort is IShortPosition, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Sepolia Addresses
    IAavePool public constant AAVE_POOL = IAavePool(0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951);
    ISwapRouter public constant SWAP_ROUTER = ISwapRouter(0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E);
    IWETH public constant WETH = IWETH(0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c);
    IERC20 public constant USDC = IERC20(0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8); // Sepolia USDC

    uint24 public constant POOL_FEE = 3000; // 0.3% Uniswap fee tier

    // Position tracking
    struct Position {
        address owner;
        uint256 collateralETH;      // ETH collateral supplied to Aave
        uint256 borrowedWETH;        // WETH borrowed from Aave
        uint256 usdcReceived;        // USDC from selling WETH
        uint256 openTimestamp;
        bool isActive;
    }

    mapping(uint256 => Position) public positions;
    uint256 public nextPositionId = 1;

    // Access control
    mapping(address => bool) public authorizedCallers;

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor() Ownable(msg.sender) {
        authorizedCallers[msg.sender] = true;
    }

    /**
     * @dev Open a short position
     * @param ethAmount Amount of ETH to use as collateral
     * @param leverage Leverage multiplier (2 = 2x)
     * @param minOutputAmount Minimum USDC to receive (slippage protection)
     */
    function openShort(
        uint256 ethAmount,
        uint256 leverage,
        uint256 minOutputAmount
    ) external payable override onlyAuthorized nonReentrant returns (uint256 positionId) {
        require(msg.value > 0, "Zero ETH sent");
        require(msg.value == ethAmount, "ETH mismatch");
        require(leverage >= 1 && leverage <= 3, "Leverage 1-3x only"); // Conservative for safety

        positionId = nextPositionId++;

        // 1. Wrap ETH to WETH
        WETH.deposit{value: msg.value}();

        // 2. Supply WETH to Aave as collateral
        WETH.approve(address(AAVE_POOL), ethAmount);
        AAVE_POOL.supply(address(WETH), ethAmount, address(this), 0);

        // 3. Borrow WETH from Aave (with leverage)
        // leverageAmount = ethAmount * (leverage - 1)
        // e.g., 1 ETH with 2x = borrow 1 ETH, total 2 ETH exposure
        uint256 borrowAmount = ethAmount * (leverage - 1);

        AAVE_POOL.borrow(
            address(WETH),
            borrowAmount,
            2, // Variable rate
            0,
            address(this)
        );

        // 4. Swap WETH → USDC on Uniswap
        WETH.approve(address(SWAP_ROUTER), borrowAmount);

        uint256 usdcOut = SWAP_ROUTER.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(WETH),
                tokenOut: address(USDC),
                fee: POOL_FEE,
                recipient: address(this),
                amountIn: borrowAmount,
                amountOutMinimum: minOutputAmount,
                sqrtPriceLimitX96: 0
            })
        );

        // 5. Store position
        positions[positionId] = Position({
            owner: msg.sender,
            collateralETH: ethAmount,
            borrowedWETH: borrowAmount,
            usdcReceived: usdcOut,
            openTimestamp: block.timestamp,
            isActive: true
        });

        emit ShortOpened(positionId, msg.sender, ethAmount, leverage, borrowAmount);

        return positionId;
    }

    /**
     * @dev Close a short position
     * @param positionId The position to close
     * @return profitOrLoss Profit (positive) or loss (negative) in ETH
     */
    function closeShort(uint256 positionId)
        external
        override
        onlyAuthorized
        nonReentrant
        returns (int256 profitOrLoss)
    {
        Position storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(position.owner == msg.sender, "Not position owner");

        // 1. Swap USDC → WETH on Uniswap
        USDC.approve(address(SWAP_ROUTER), position.usdcReceived);

        uint256 wethReceived = SWAP_ROUTER.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(USDC),
                tokenOut: address(WETH),
                fee: POOL_FEE,
                recipient: address(this),
                amountIn: position.usdcReceived,
                amountOutMinimum: 0, // Accept any amount (market price)
                sqrtPriceLimitX96: 0
            })
        );

        // 2. Repay Aave loan
        WETH.approve(address(AAVE_POOL), position.borrowedWETH);
        AAVE_POOL.repay(
            address(WETH),
            position.borrowedWETH,
            2, // Variable rate
            address(this)
        );

        // 3. Withdraw collateral from Aave
        uint256 collateralWithdrawn = AAVE_POOL.withdraw(
            address(WETH),
            type(uint256).max, // Withdraw all
            address(this)
        );

        // 4. Unwrap WETH to ETH
        WETH.withdraw(collateralWithdrawn);

        // 5. Calculate P&L
        // Profit = collateralWithdrawn - collateralETH
        profitOrLoss = int256(collateralWithdrawn) - int256(position.collateralETH);

        // 6. Mark position as closed
        position.isActive = false;

        // 7. Return ETH to user
        (bool success, ) = msg.sender.call{value: collateralWithdrawn}("");
        require(success, "ETH transfer failed");

        emit ShortClosed(positionId, msg.sender, profitOrLoss);

        return profitOrLoss;
    }

    /**
     * @dev Get position details
     */
    function getPosition(uint256 positionId)
        external
        view
        override
        returns (
            uint256 collateral,
            uint256 borrowedAmount,
            uint256 currentValue,
            bool isActive
        )
    {
        Position memory position = positions[positionId];
        return (
            position.collateralETH,
            position.borrowedWETH,
            position.usdcReceived,
            position.isActive
        );
    }

    /**
     * @dev Calculate unrealized P&L
     * @dev Estimates current value by simulating USDC → WETH swap
     */
    function getUnrealizedPnL(uint256 positionId)
        external
        view
        override
        returns (int256 pnl)
    {
        Position memory position = positions[positionId];
        if (!position.isActive) return 0;

        // Simplified: assume current USDC can buy back borrowedWETH
        // Real implementation would query Uniswap quoter
        // For now, return 0 (would need quoter integration)
        return 0;
    }

    /**
     * @dev Get strategy name
     */
    function getStrategyName() external view override returns (string memory) {
        return "Aave + Uniswap V3";
    }

    /**
     * @dev Set authorized caller
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    /**
     * @dev Emergency withdrawal
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = owner().call{value: balance}("");
            require(success, "Withdrawal failed");
        }
    }

    receive() external payable {
        // Accept ETH
    }
}
