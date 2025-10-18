# Ethereum Lending Protocol Contracts

## Overview

A decentralized lending protocol on Ethereum that allows users to:
- Deposit ETH as collateral and borrow PYUSD
- Earn yield through LIDO stETH integration
- Receive NFT loan certificates
- Optional short positions (up to 30%)
- Automated liquidations with Pyth oracle

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    EthereumLendingPool                   │
│  - Main contract orchestrating all lending operations    │
└─────────────┬───────────────────┬──────────────┬────────┘
              │                   │              │
              ▼                   ▼              ▼
    ┌──────────────┐    ┌──────────────┐  ┌──────────────┐
    │EthereumLoanNFT│    │StETHVaultMgr │  │ Pyth Oracle  │
    │   (ERC-721)   │    │ (LIDO stETH) │  │(Price Feeds) │
    └──────────────┘    └──────────────┘  └──────────────┘
```

## Contract Details

### 1. EthereumLendingPool.sol
Main lending pool contract that manages:
- PYUSD supply and withdrawal
- ETH collateral deposits
- Loan creation and repayment
- Liquidation logic
- Interest rate calculation

**Key Functions:**
- `supplyPYUSD(amount)` - Supply PYUSD to earn interest
- `borrow(pyusdAmount, liquidationRatio, shortRatio)` - Borrow PYUSD against ETH
- `repay(tokenId)` - Repay loan and retrieve collateral
- `liquidate(tokenId)` - Liquidate undercollateralized position

**Parameters:**
- Liquidation Ratio: 50-80% (user choice)
- Max Short Position: 30%
- Liquidation Process: Debt repaid → Remaining collateral to NFT owner

### 2. EthereumLoanNFT.sol
ERC-721 NFT representing loan positions with on-chain metadata.

**Features:**
- SVG image generation on-chain
- Transferable loan positions
- Metadata includes collateral, debt, liquidation ratio
- Burn on loan closure

### 3. StETHVaultManager.sol
Manages ETH deposits into LIDO for yield generation.

**Features:**
- Convert ETH to stETH automatically
- Track rewards earned
- Handle withdrawals via Curve pool
- Emergency withdrawal mechanism

**Integrations:**
- LIDO stETH: `0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84`
- Curve stETH/ETH: `0xDC24316b9AE028F1497c275EB9192a3Ea0f67022`

### 4. LendingMath.sol (Library)
Mathematical functions for:
- Health factor calculation
- Interest rate calculation
- Utilization rate
- Liquidation bonus

## Installation

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile
```

## Deployment

### Local Testing
```bash
# Start local node
npm run node

# Deploy to local node
npm run deploy:lending
```

### Testnet (Sepolia)
```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy-lending.js --network sepolia
```

### Mainnet
```bash
# Deploy to mainnet (use with caution)
npx hardhat run scripts/deploy-lending.js --network mainnet
```

## Security Considerations

### Implemented Safeguards
✅ ReentrancyGuard on all external functions
✅ Pausable mechanism for emergencies
✅ Access control with roles
✅ Slippage protection on stETH swaps
✅ Price freshness checks (5 min)
✅ Circuit breaker for extreme events
✅ Overflow protection (Solidity 0.8+)

### Known Risks
⚠️ Oracle manipulation attacks
⚠️ stETH depeg scenarios
⚠️ LIDO slashing risks
⚠️ Smart contract bugs
⚠️ Liquidation cascades

### Audit Status
❌ Not audited - DO NOT USE IN PRODUCTION

## Testing

```bash
# Run tests
npm test

# Run coverage
npx hardhat coverage
```

## Gas Optimization

The contracts implement several gas optimization techniques:
- Storage slot packing
- Immutable variables for addresses
- External vs public functions
- Memory caching of storage reads

## Oracle Integration

Uses Pyth Network for price feeds:
- ETH/USD: `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace`
- PYUSD/USD: Custom feed (to be configured)

Update prices before liquidation:
```javascript
await lendingPool.updatePrices(pythUpdateData);
```

## Emergency Procedures

### Pause Protocol
```javascript
await lendingPool.pauseProtocol();
```

### Resume Protocol
```javascript
await lendingPool.resumeProtocol();
```

### Emergency Withdrawal (Vault)
```javascript
await stETHVault.emergencyWithdraw();
```

## Future Improvements

### Phase 1 (Current)
- ✅ Basic lending/borrowing
- ✅ LIDO integration
- ✅ NFT loan positions
- ✅ Liquidations

### Phase 2 (Planned)
- ⏳ Short position integration (GMX/Synthetix)
- ⏳ Partial liquidations
- ⏳ Flash loan protection
- ⏳ Governance token

### Phase 3 (Future)
- ⏳ Cross-chain bridge to Hedera
- ⏳ Advanced yield strategies
- ⏳ Insurance fund
- ⏳ DAO governance

## Contract Addresses

### Mainnet (Not Deployed)
```
EthereumLoanNFT: 0x...
StETHVaultManager: 0x...
EthereumLendingPool: 0x...
```

### Sepolia Testnet (Example)
```
EthereumLoanNFT: 0x...
StETHVaultManager: 0x...
EthereumLendingPool: 0x...
```

## License

MIT

## Disclaimer

**⚠️ WARNING: These contracts are UNAUDITED and for educational purposes only. Do not use in production or with real funds.**

## Support

For questions or issues, please open an issue in the repository.