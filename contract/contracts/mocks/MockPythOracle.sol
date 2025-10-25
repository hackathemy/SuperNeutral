// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockPythOracle
 * @notice Mock Pyth Oracle for testing
 * @dev Returns fixed prices for testing purposes
 */
contract MockPythOracle {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint publishTime;
    }

    // Mock prices (can be updated)
    mapping(bytes32 => Price) public prices;

    // Mock price feed IDs
    bytes32 public constant ETH_USD_FEED = 0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6;
    bytes32 public constant PYUSD_USD_FEED = 0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722;

    constructor() {
        // Set default prices
        // ETH/USD = $2000 (expo = -8, so price = 2000 * 10^8)
        prices[ETH_USD_FEED] = Price({
            price: 200000000000, // $20000 with 8 decimals
            conf: 2000000000,     // $20 confidence
            expo: -8,
            publishTime: block.timestamp
        });

        // PYUSD/USD = $1.00 (expo = -8, so price = 1 * 10^8)
        prices[PYUSD_USD_FEED] = Price({
            price: 100000000,    // $1.00 with 8 decimals
            conf: 10000,         // $0.0001 confidence
            expo: -8,
            publishTime: block.timestamp
        });
    }

    /**
     * @dev Get price (mimics Pyth's getPriceUnsafe)
     */
    function getPriceUnsafe(bytes32 id) external view returns (Price memory) {
        Price memory price = prices[id];
        require(price.publishTime > 0, "Price not available");
        return price;
    }

    /**
     * @dev Update price feeds (mock implementation)
     */
    function updatePriceFeeds(bytes[] calldata /* updateData */) external payable {
        // Mock implementation - just update timestamp
        prices[ETH_USD_FEED].publishTime = block.timestamp;
        prices[PYUSD_USD_FEED].publishTime = block.timestamp;
    }

    /**
     * @dev Set mock price (for testing)
     */
    function setPrice(bytes32 id, int64 price, int32 expo) external {
        require(price > 0, "Price must be positive");
        prices[id] = Price({
            price: price,
            conf: uint64(uint256(int256(price)) / 100), // 1% confidence
            expo: expo,
            publishTime: block.timestamp
        });
    }

    /**
     * @dev Set ETH price in USD (with 8 decimals)
     * @param priceUSD Price in USD (e.g., 2000 for $2000)
     */
    function setETHPrice(uint256 priceUSD) external {
        require(priceUSD < 1000000, "Price too high"); // Max $1M
        int256 priceWithDecimals = int256(priceUSD) * int256(10**8);
        prices[ETH_USD_FEED] = Price({
            price: int64(priceWithDecimals),
            conf: uint64(priceUSD * 10**6), // 1% confidence
            expo: -8,
            publishTime: block.timestamp
        });
    }

    /**
     * @dev Set PYUSD price in USD (with 8 decimals)
     * @param priceUSD Price in USD (e.g., 1 for $1.00)
     */
    function setPYUSDPrice(uint256 priceUSD) external {
        prices[PYUSD_USD_FEED] = Price({
            price: int64(int256(priceUSD * 10**8)),
            conf: uint64(priceUSD * 10**6), // 1% confidence
            expo: -8,
            publishTime: block.timestamp
        });
    }

    /**
     * @dev Simulate price drop for liquidation testing
     */
    function simulatePriceCrash(uint256 newETHPrice) external {
        this.setETHPrice(newETHPrice);
    }
}
