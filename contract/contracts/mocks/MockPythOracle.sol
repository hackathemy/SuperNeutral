// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockPythOracle
 * @notice Mock Pyth Oracle for local testing
 */
contract MockPythOracle {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }

    mapping(bytes32 => Price) public prices;

    function updatePrice(
        bytes32 priceId,
        int64 price,
        uint64 conf,
        int32 expo,
        uint256 publishTime
    ) external {
        prices[priceId] = Price(price, conf, expo, publishTime);
    }

    function getPriceUnsafe(bytes32 id) external view returns (Price memory) {
        return prices[id];
    }

    function getPrice(bytes32 id) external view returns (Price memory) {
        return prices[id];
    }
}
