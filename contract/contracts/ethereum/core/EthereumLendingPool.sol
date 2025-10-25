// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ILendingPool.sol";
import "../interfaces/ILoanNFT.sol";
import "../interfaces/IStETHVault.sol";
import "../libraries/LendingMath.sol";
import "./EthereumLoanNFT.sol";
import "../tokens/StakedPYUSD.sol";

// Pyth Oracle Interface
interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint publishTime;
    }

    function getPriceUnsafe(bytes32 id) external view returns (Price memory price);
    function updatePriceFeeds(bytes[] calldata updateData) external payable;
}

/**
 * @title EthereumLendingPool
 * @notice Main lending pool contract for ETH collateral and PYUSD borrowing
 * @dev Integrates with LIDO for yield generation and Pyth for price feeds
 */
contract EthereumLendingPool is ILendingPool, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    using LendingMath for uint256;

    // Constants
    uint256 public constant MIN_LIQUIDATION_RATIO = 5000; // 50% in basis points
    uint256 public constant MAX_LIQUIDATION_RATIO = 8000; // 80% in basis points
    uint256 public constant MAX_SHORT_RATIO = 3000; // 30% in basis points
    uint256 public constant LIQUIDATION_BONUS = 10; // 0.1% bonus for liquidators
    uint256 public constant BASIS_POINTS = 10000;

    // Pyth price feed IDs (testnet - Sepolia)
    bytes32 public constant ETH_USD_PRICE_FEED = 0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6;
    bytes32 public constant PYUSD_USD_PRICE_FEED = 0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722;

    // Contract references
    IERC20 public immutable PYUSD;
    ILoanNFT public immutable loanNFT;
    IStETHVault public immutable stETHVault;
    IPyth public immutable pythOracle;
    StakedPYUSD public immutable stakedPYUSD;

    // State variables
    uint256 public nextTokenId = 1;
    uint256 public totalPYUSDSupplied;
    uint256 public totalPYUSDBorrowed;
    uint256 public totalETHCollateral;

    // Mappings
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public userLoanIds;

    // Circuit breaker
    bool public emergencyMode = false;
    uint256 public maxPriceDeviation = 2000; // 20% max price change

    modifier notEmergency() {
        require(!emergencyMode, "Emergency mode active");
        _;
    }

    constructor(
        address _pyusd,
        address _loanNFT,
        address _stETHVault,
        address _pythOracle,
        address _stakedPYUSD
    ) Ownable(msg.sender) {
        require(_pyusd != address(0), "Invalid PYUSD address");
        require(_loanNFT != address(0), "Invalid NFT address");
        require(_stETHVault != address(0), "Invalid vault address");
        require(_pythOracle != address(0), "Invalid oracle address");
        require(_stakedPYUSD != address(0), "Invalid sPYUSD address");

        PYUSD = IERC20(_pyusd);
        loanNFT = ILoanNFT(_loanNFT);
        stETHVault = IStETHVault(_stETHVault);
        pythOracle = IPyth(_pythOracle);
        stakedPYUSD = StakedPYUSD(_stakedPYUSD);
    }

    /**
     * @dev Supply PYUSD to the lending pool and receive sPYUSD
     * @param amount Amount of PYUSD to supply
     * @param onBehalfOf Address to mint the sPYUSD to (address(0) for msg.sender)
     * @return spyusdAmount Amount of sPYUSD minted
     */
    function supplyPYUSD(uint256 amount, address onBehalfOf) external override nonReentrant whenNotPaused returns (uint256 spyusdAmount) {
        require(amount > 0, "Zero supply");

        // Determine the actual recipient address
        address recipient = onBehalfOf == address(0) ? msg.sender : onBehalfOf;

        // Transfer PYUSD from msg.sender (always the one paying)
        PYUSD.safeTransferFrom(msg.sender, address(this), amount);

        // Mint sPYUSD to recipient based on current exchange rate
        spyusdAmount = stakedPYUSD.mint(recipient, amount);

        // Update total supplied
        totalPYUSDSupplied += amount;

        emit PYUSDSupplied(recipient, amount);

        return spyusdAmount;
    }

    /**
     * @dev Withdraw PYUSD from the lending pool by burning sPYUSD
     * @param spyusdAmount Amount of sPYUSD to burn
     * @return pyusdAmount Amount of PYUSD withdrawn
     */
    function withdrawPYUSD(uint256 spyusdAmount) external override nonReentrant returns (uint256 pyusdAmount) {
        require(spyusdAmount > 0, "Zero withdrawal");

        // Calculate PYUSD to return based on exchange rate
        pyusdAmount = stakedPYUSD.burn(msg.sender, spyusdAmount);

        // Check available liquidity
        uint256 availableLiquidity = totalPYUSDSupplied - totalPYUSDBorrowed;
        require(availableLiquidity >= pyusdAmount, "Insufficient liquidity");

        // Update total supplied
        totalPYUSDSupplied -= pyusdAmount;

        // Transfer PYUSD to user
        PYUSD.safeTransfer(msg.sender, pyusdAmount);

        emit PYUSDWithdrawn(msg.sender, pyusdAmount);

        return pyusdAmount;
    }

    /**
     * @dev Borrow PYUSD against ETH collateral
     * @param pyusdAmount Amount of PYUSD to borrow
     * @param liquidationRatio Liquidation ratio in basis points (5000-8000)
     * @param shortRatio Short position ratio in basis points (0-3000)
     * @param onBehalfOf Address to mint the loan NFT to (address(0) for msg.sender)
     * @return tokenId The NFT token ID representing the loan
     */
    function borrow(
        uint256 pyusdAmount,
        uint256 liquidationRatio,
        uint256 shortRatio,
        address onBehalfOf
    ) external payable override nonReentrant whenNotPaused notEmergency returns (uint256 tokenId) {
        // Determine the actual borrower address
        address borrower = onBehalfOf == address(0) ? msg.sender : onBehalfOf;
        require(msg.value > 0, "Zero collateral");
        require(pyusdAmount > 0, "Zero borrow");
        require(liquidationRatio >= MIN_LIQUIDATION_RATIO && liquidationRatio <= MAX_LIQUIDATION_RATIO, "Invalid liquidation ratio");
        require(shortRatio <= MAX_SHORT_RATIO, "Short ratio too high");

        // Check collateral ratio based on liquidation ratio
        uint256 ethPrice = getETHPrice();
        uint256 collateralValueUSD = (msg.value * ethPrice) / 1e18;
        uint256 borrowValueUSD = pyusdAmount; // PYUSD is 1:1 with USD (6 decimals)

        // Required collateral = borrowValue / liquidationRatio
        // e.g., 50% liquidation ratio requires 200% collateral (1/0.5)
        uint256 requiredCollateral = (borrowValueUSD * BASIS_POINTS) / liquidationRatio;
        require(collateralValueUSD >= requiredCollateral, "Insufficient collateral");

        // Check available liquidity
        require(totalPYUSDSupplied - totalPYUSDBorrowed >= pyusdAmount, "Insufficient liquidity");

        // Create loan
        tokenId = nextTokenId++;
        loans[tokenId] = Loan({
            borrower: borrower,
            collateralAmount: msg.value,
            borrowAmount: pyusdAmount,
            liquidationRatio: liquidationRatio,
            shortPositionRatio: shortRatio,
            borrowTimestamp: block.timestamp,
            accruedInterest: 0,
            isActive: true
        });

        // Mint NFT
        loanNFT.mint(borrower, tokenId);

        // Store metadata in NFT
        EthereumLoanNFT(address(loanNFT)).setLoanMetadata(
            tokenId,
            msg.value,
            pyusdAmount,
            liquidationRatio,
            borrower
        );

        userLoanIds[borrower].push(tokenId);

        // Update totals
        totalETHCollateral += msg.value;
        totalPYUSDBorrowed += pyusdAmount;

        // Deposit ETH to stETH vault
        stETHVault.depositETH{value: msg.value}();

        // Transfer PYUSD to borrower
        PYUSD.safeTransfer(borrower, pyusdAmount);

        emit Borrowed(borrower, tokenId, msg.value, pyusdAmount);

        return tokenId;
    }

    /**
     * @dev Repay a loan and retrieve collateral
     * @param tokenId The NFT token ID of the loan
     */
    function repay(uint256 tokenId) external override nonReentrant {
        require(loanNFT.exists(tokenId), "Loan does not exist");
        require(loanNFT.ownerOf(tokenId) == msg.sender, "Not loan owner");

        Loan storage loan = loans[tokenId];
        require(loan.isActive, "Loan not active");

        // Calculate total repayment
        uint256 interest = calculateInterest(tokenId);
        uint256 totalRepayment = loan.borrowAmount + interest;

        // Transfer PYUSD from borrower
        PYUSD.safeTransferFrom(msg.sender, address(this), totalRepayment);

        // Update totals
        totalPYUSDBorrowed -= loan.borrowAmount;
        totalETHCollateral -= loan.collateralAmount;

        // Distribute interest to sPYUSD holders by increasing exchange rate
        if (interest > 0) {
            // Add interest to total supplied (increases exchange rate)
            totalPYUSDSupplied += interest;

            // Update sPYUSD totalPYUSD to reflect interest earned
            // This automatically increases the exchange rate for all sPYUSD holders
            stakedPYUSD.updateTotalPYUSD(totalPYUSDSupplied);
        }

        // Mark loan as repaid
        loan.isActive = false;
        loan.accruedInterest = interest;

        // Withdraw collateral from vault
        uint256 ethToReturn = stETHVault.withdrawETH(loan.collateralAmount);

        // Burn NFT
        loanNFT.burn(tokenId);

        // Return collateral to borrower
        (bool success, ) = msg.sender.call{value: ethToReturn}("");
        require(success, "ETH transfer failed");

        emit Repaid(tokenId, totalRepayment);
    }

    /**
     * @dev Add additional collateral to a loan
     * @param tokenId The NFT token ID of the loan
     */
    function addCollateral(uint256 tokenId) external payable override nonReentrant whenNotPaused {
        require(msg.value > 0, "Zero collateral");
        require(loanNFT.exists(tokenId), "Loan does not exist");
        require(loanNFT.ownerOf(tokenId) == msg.sender, "Not loan owner");

        Loan storage loan = loans[tokenId];
        require(loan.isActive, "Loan not active");

        loan.collateralAmount += msg.value;
        totalETHCollateral += msg.value;

        // Deposit additional ETH to vault
        stETHVault.depositETH{value: msg.value}();

        emit CollateralAdded(tokenId, msg.value);
    }

    /**
     * @dev Liquidate an undercollateralized loan
     * @param tokenId The NFT token ID of the loan to liquidate
     */
    function liquidate(uint256 tokenId) external override nonReentrant whenNotPaused {
        require(loanNFT.exists(tokenId), "Loan does not exist");

        Loan storage loan = loans[tokenId];
        require(loan.isActive, "Loan not active");
        require(isLiquidatable(tokenId), "Loan not liquidatable");

        // Calculate liquidation amounts
        uint256 debtToRepay = loan.borrowAmount + calculateInterest(tokenId);
        uint256 collateralAmount = loan.collateralAmount;

        // Liquidator pays the debt
        PYUSD.safeTransferFrom(msg.sender, address(this), debtToRepay);

        // Update totals
        totalPYUSDBorrowed -= loan.borrowAmount;
        totalETHCollateral -= collateralAmount;

        // Mark loan as liquidated
        loan.isActive = false;

        // Get current NFT owner
        address nftOwner = loanNFT.ownerOf(tokenId);

        // Withdraw collateral from vault
        uint256 ethFromVault = stETHVault.withdrawETH(collateralAmount);

        // Calculate liquidation amounts with bonus
        uint256 ethPrice = getETHPrice();
        uint256 debtInETH = (debtToRepay * 1e18) / ethPrice;

        // Add 0.1% bonus to incentivize liquidators
        uint256 bonusETH = (debtInETH * LIQUIDATION_BONUS) / BASIS_POINTS;
        uint256 liquidatorETH = debtInETH + bonusETH;

        // Calculate remaining ETH for borrower
        uint256 remainingETH = ethFromVault > liquidatorETH ? ethFromVault - liquidatorETH : 0;

        // Burn NFT
        loanNFT.burn(tokenId);

        // Send debt + bonus to liquidator
        if (liquidatorETH > 0 && liquidatorETH <= ethFromVault) {
            (bool successLiquidator, ) = msg.sender.call{value: liquidatorETH}("");
            require(successLiquidator, "Liquidator payment failed");
        } else if (ethFromVault > 0) {
            // If not enough collateral, send all to liquidator (bad debt scenario)
            (bool successLiquidator, ) = msg.sender.call{value: ethFromVault}("");
            require(successLiquidator, "Liquidator payment failed");
        }

        // Send remaining collateral to NFT owner (if any)
        if (remainingETH > 0) {
            (bool successOwner, ) = nftOwner.call{value: remainingETH}("");
            require(successOwner, "Owner payment failed");
        }

        emit Liquidated(tokenId, msg.sender, debtToRepay, collateralAmount);
    }

    /**
     * @dev Calculate interest for a loan
     * @param tokenId The loan token ID
     * @return Interest amount in PYUSD
     */
    function calculateInterest(uint256 tokenId) public view returns (uint256) {
        Loan memory loan = loans[tokenId];
        if (!loan.isActive) return loan.accruedInterest;

        uint256 timeElapsed = block.timestamp - loan.borrowTimestamp;
        uint256 utilizationRate = getUtilizationRate();
        uint256 interestRate = utilizationRate.calculateInterestRate();

        return loan.borrowAmount.calculateAccruedInterest(interestRate, timeElapsed);
    }

    /**
     * @dev Get the health factor of a loan
     * @param tokenId The loan token ID
     * @return Health factor with 18 decimals precision
     */
    function getHealthFactor(uint256 tokenId) public view override returns (uint256) {
        Loan memory loan = loans[tokenId];
        if (!loan.isActive) return type(uint256).max;

        uint256 ethPrice = getETHPrice();
        uint256 collateralValueUSD = (loan.collateralAmount * ethPrice) / 1e18;
        uint256 debtValueUSD = loan.borrowAmount + calculateInterest(tokenId);

        return collateralValueUSD.calculateHealthFactor(debtValueUSD, loan.liquidationRatio);
    }

    /**
     * @dev Check if a loan is liquidatable
     * @param tokenId The loan token ID
     * @return True if liquidatable
     */
    function isLiquidatable(uint256 tokenId) public view override returns (bool) {
        return getHealthFactor(tokenId) < 1e18; // Health factor < 1
    }

    /**
     * @dev Get ETH price from Pyth oracle
     * @return ETH price in USD with 18 decimals
     */
    function getETHPrice() public view returns (uint256) {
        IPyth.Price memory price = pythOracle.getPriceUnsafe(ETH_USD_PRICE_FEED);
        require(price.publishTime > block.timestamp - 300, "Price too old");

        // Convert Pyth price to 18 decimals
        int256 normalizedPrice = int256(price.price) * int256(10 ** uint256(uint32(18 + price.expo)));
        require(normalizedPrice > 0, "Invalid price");

        return uint256(normalizedPrice);
    }

    /**
     * @dev Get loan details
     * @param tokenId The loan token ID
     * @return Loan struct
     */
    function getLoan(uint256 tokenId) external view override returns (Loan memory) {
        return loans[tokenId];
    }

    /**
     * @dev Get total PYUSD supply
     * @return Total PYUSD supplied
     */
    function getTotalSupply() external view override returns (uint256) {
        return totalPYUSDSupplied;
    }

    /**
     * @dev Get total PYUSD borrowed
     * @return Total PYUSD borrowed
     */
    function getTotalBorrowed() external view override returns (uint256) {
        return totalPYUSDBorrowed;
    }

    /**
     * @dev Get utilization rate
     * @return Utilization rate in basis points
     */
    function getUtilizationRate() public view override returns (uint256) {
        return totalPYUSDBorrowed.calculateUtilizationRate(totalPYUSDSupplied);
    }

    /**
     * @dev Get current interest rate
     * @return Interest rate in basis points
     */
    function getCurrentInterestRate() external view override returns (uint256) {
        return getUtilizationRate().calculateInterestRate();
    }

    /**
     * @dev Emergency pause
     */
    function pauseProtocol() external onlyOwner {
        _pause();
        emergencyMode = true;
    }

    /**
     * @dev Resume protocol
     */
    function resumeProtocol() external onlyOwner {
        _unpause();
        emergencyMode = false;
    }

    /**
     * @dev Update Pyth oracle prices
     * @param priceUpdateData Price update data from Pyth
     */
    function updatePrices(bytes[] calldata priceUpdateData) external payable {
        pythOracle.updatePriceFeeds{value: msg.value}(priceUpdateData);
    }

    receive() external payable {
        // Accept ETH
    }
}