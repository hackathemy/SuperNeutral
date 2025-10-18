// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakedPYUSD (sPYUSD)
 * @notice Interest-bearing token representing PYUSD deposits in the lending pool
 * @dev Exchange rate increases over time as protocol earns interest
 *
 * Key Concepts:
 * - Users deposit PYUSD and receive sPYUSD
 * - sPYUSD value increases as protocol earns interest
 * - Users can burn sPYUSD to withdraw PYUSD + accrued interest
 *
 * Exchange Rate Formula:
 * exchangeRate = totalPYUSD / totalSupply(sPYUSD)
 *
 * Mint: sPYUSD_amount = PYUSD_amount / exchangeRate
 * Burn: PYUSD_amount = sPYUSD_amount * exchangeRate
 */
contract StakedPYUSD is ERC20, Ownable {
    // Precision for exchange rate calculations (18 decimals)
    uint256 public constant EXCHANGE_RATE_PRECISION = 1e18;

    // Initial exchange rate: 1 sPYUSD = 1 PYUSD
    uint256 public constant INITIAL_EXCHANGE_RATE = 1e18;

    // Lending pool address (only address that can mint/burn)
    address public lendingPool;

    // Total PYUSD deposited in the protocol
    uint256 public totalPYUSDDeposited;

    // Events
    event LendingPoolSet(address indexed lendingPool);
    event Minted(address indexed user, uint256 pyusdAmount, uint256 spyusdAmount, uint256 exchangeRate);
    event Burned(address indexed user, uint256 spyusdAmount, uint256 pyusdAmount, uint256 exchangeRate);
    event ExchangeRateUpdated(uint256 newTotalPYUSD, uint256 exchangeRate);

    modifier onlyLendingPool() {
        require(msg.sender == lendingPool, "Only lending pool");
        _;
    }

    constructor() ERC20("Staked PYUSD", "sPYUSD") Ownable(msg.sender) {}

    /**
     * @dev Set the lending pool address (one-time operation)
     * @param _lendingPool Address of the lending pool contract
     */
    function setLendingPool(address _lendingPool) external onlyOwner {
        require(lendingPool == address(0), "Lending pool already set");
        require(_lendingPool != address(0), "Invalid lending pool");

        lendingPool = _lendingPool;
        emit LendingPoolSet(_lendingPool);
    }

    /**
     * @dev Get current exchange rate
     * @return Exchange rate with 18 decimals precision
     *
     * Formula: totalPYUSDDeposited / totalSupply()
     * Returns 1e18 (1.0) initially when no tokens exist
     */
    function exchangeRate() public view returns (uint256) {
        uint256 supply = totalSupply();

        // If no sPYUSD exists, return initial rate
        if (supply == 0) {
            return INITIAL_EXCHANGE_RATE;
        }

        // Exchange Rate = Total PYUSD / Total sPYUSD
        return (totalPYUSDDeposited * EXCHANGE_RATE_PRECISION) / supply;
    }

    /**
     * @dev Calculate sPYUSD to mint for given PYUSD amount
     * @param pyusdAmount Amount of PYUSD being deposited
     * @return Amount of sPYUSD to mint
     *
     * Formula: sPYUSD = PYUSD / exchangeRate
     */
    function calculateMintAmount(uint256 pyusdAmount) public view returns (uint256) {
        require(pyusdAmount > 0, "Zero amount");

        uint256 rate = exchangeRate();

        // sPYUSD to mint = PYUSD amount / exchange rate
        return (pyusdAmount * EXCHANGE_RATE_PRECISION) / rate;
    }

    /**
     * @dev Calculate PYUSD to return for given sPYUSD amount
     * @param spyusdAmount Amount of sPYUSD being burned
     * @return Amount of PYUSD to return
     *
     * Formula: PYUSD = sPYUSD × exchangeRate
     */
    function calculateBurnAmount(uint256 spyusdAmount) public view returns (uint256) {
        require(spyusdAmount > 0, "Zero amount");

        uint256 rate = exchangeRate();

        // PYUSD to return = sPYUSD amount × exchange rate
        return (spyusdAmount * rate) / EXCHANGE_RATE_PRECISION;
    }

    /**
     * @dev Mint sPYUSD when user deposits PYUSD
     * @param to Address to mint sPYUSD to
     * @param pyusdAmount Amount of PYUSD deposited
     * @return Amount of sPYUSD minted
     */
    function mint(address to, uint256 pyusdAmount) external onlyLendingPool returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(pyusdAmount > 0, "Zero amount");

        // Calculate sPYUSD to mint based on current exchange rate
        uint256 spyusdAmount = calculateMintAmount(pyusdAmount);
        require(spyusdAmount > 0, "Mint amount too small");

        // Update total PYUSD deposited
        totalPYUSDDeposited += pyusdAmount;

        // Mint sPYUSD tokens
        _mint(to, spyusdAmount);

        emit Minted(to, pyusdAmount, spyusdAmount, exchangeRate());

        return spyusdAmount;
    }

    /**
     * @dev Burn sPYUSD when user withdraws PYUSD
     * @param from Address to burn sPYUSD from
     * @param spyusdAmount Amount of sPYUSD to burn
     * @return Amount of PYUSD to return
     */
    function burn(address from, uint256 spyusdAmount) external onlyLendingPool returns (uint256) {
        require(from != address(0), "Invalid address");
        require(spyusdAmount > 0, "Zero amount");
        require(balanceOf(from) >= spyusdAmount, "Insufficient balance");

        // Calculate PYUSD to return based on current exchange rate
        uint256 pyusdAmount = calculateBurnAmount(spyusdAmount);
        require(pyusdAmount > 0, "Burn amount too small");
        require(pyusdAmount <= totalPYUSDDeposited, "Insufficient PYUSD");

        // Update total PYUSD deposited
        totalPYUSDDeposited -= pyusdAmount;

        // Burn sPYUSD tokens
        _burn(from, spyusdAmount);

        emit Burned(from, spyusdAmount, pyusdAmount, exchangeRate());

        return pyusdAmount;
    }

    /**
     * @dev Update total PYUSD when interest is accrued
     * @param newTotalPYUSD New total PYUSD amount (including interest)
     *
     * Called by lending pool when:
     * - Interest is paid by borrowers
     * - Interest is accrued
     *
     * This increases the exchange rate, making all sPYUSD more valuable
     */
    function updateTotalPYUSD(uint256 newTotalPYUSD) external onlyLendingPool {
        require(newTotalPYUSD >= totalPYUSDDeposited, "Cannot decrease total");

        totalPYUSDDeposited = newTotalPYUSD;

        emit ExchangeRateUpdated(newTotalPYUSD, exchangeRate());
    }

    /**
     * @dev Get current value of sPYUSD holdings in PYUSD
     * @param account Address to check
     * @return PYUSD value of sPYUSD holdings
     */
    function balanceInPYUSD(address account) external view returns (uint256) {
        uint256 spyusdBalance = balanceOf(account);
        if (spyusdBalance == 0) return 0;

        return calculateBurnAmount(spyusdBalance);
    }

    /**
     * @dev Override decimals to match PYUSD (6 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
