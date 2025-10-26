// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../ethereum/interfaces/IERC3156FlashBorrower.sol";
import "../ethereum/interfaces/IERC3156FlashLender.sol";

/**
 * @title FlashLoanReceiver
 * @notice Example contract for receiving flash loans from EthereumLendingPool
 * @dev Implements IERC3156FlashBorrower interface
 */
contract FlashLoanReceiver is IERC3156FlashBorrower {
    using SafeERC20 for IERC20;

    IERC3156FlashLender public immutable lender;
    address public immutable owner;

    // Flash loan callback success constant
    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    // For testing: track flash loan execution
    uint256 public lastLoanAmount;
    uint256 public lastFeeAmount;
    address public lastToken;

    event FlashLoanReceived(address token, uint256 amount, uint256 fee);
    event FlashLoanExecuted(address token, uint256 amount, uint256 fee);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _lender) {
        require(_lender != address(0), "Invalid lender");
        lender = IERC3156FlashLender(_lender);
        owner = msg.sender;
    }

    /**
     * @dev Execute a flash loan
     * @param token The token to borrow
     * @param amount The amount to borrow
     * @param data Additional data for the flash loan
     */
    function executeFlashLoan(
        address token,
        uint256 amount,
        bytes calldata data
    ) external onlyOwner {
        lender.flashLoan(this, token, amount, data);
    }

    /**
     * @dev ERC-3156 callback function
     * @param initiator The initiator of the flash loan
     * @param token The token borrowed
     * @param amount The amount borrowed
     * @param fee The fee to be paid
     * @param data Additional data
     * @return CALLBACK_SUCCESS if successful
     */
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        // Verify the loan is from our lender
        require(msg.sender == address(lender), "Unauthorized lender");
        require(initiator == address(this), "Unauthorized initiator");

        emit FlashLoanReceived(token, amount, fee);

        // Store loan details for testing
        lastToken = token;
        lastLoanAmount = amount;
        lastFeeAmount = fee;

        // In a real scenario, you would:
        // 1. Use the borrowed funds for arbitrage, liquidations, etc.
        // 2. Ensure you have enough to repay loan + fee

        // For testing: just approve the lender to take back loan + fee
        uint256 repaymentAmount = amount + fee;
        IERC20(token).approve(address(lender), repaymentAmount);

        emit FlashLoanExecuted(token, amount, fee);

        return CALLBACK_SUCCESS;
    }

    /**
     * @dev Withdraw tokens (only owner)
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner, amount);
    }

    /**
     * @dev Deposit tokens to this contract for testing
     * @param token Token to deposit
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Get token balance
     * @param token Token address
     * @return Balance of this contract
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
