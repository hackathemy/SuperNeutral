# Cross-Chain Borrow Guide

## 🌉 Overview

This implementation enables users to borrow PYUSD from **Arbitrum Sepolia** by bridging ETH to **Sepolia** and executing the borrow function in a single atomic operation using **Avail Nexus SDK**.

## 🏗️ Architecture

### Key Components

1. **Source Chain**: Arbitrum Sepolia (Chain ID: 421614)
2. **Destination Chain**: Sepolia (Chain ID: 11155111)
3. **Bridge**: Avail Nexus SDK
4. **Contracts**: EthereumLendingPool on Sepolia (no new contracts needed!)

### Flow Diagram

```
┌─────────────────────┐
│ User on Arbitrum    │
│ Sepolia             │
└──────────┬──────────┘
           │
           │ 1. Initiate Cross-Chain Borrow
           │
           ▼
┌─────────────────────┐
│ Nexus SDK           │
│ bridgeAndExecute()  │
└──────────┬──────────┘
           │
           │ 2. Bridge ETH
           │    Arbitrum → Sepolia
           │
           ▼
┌─────────────────────┐
│ Sepolia Network     │
└──────────┬──────────┘
           │
           │ 3. Execute borrow()
           │    with onBehalfOf
           │
           ▼
┌─────────────────────┐
│ Loan NFT Minted     │
│ PYUSD Sent to User  │
└─────────────────────┘
```

## 📝 Implementation Details

### 1. Nexus SDK Integration

```typescript
const result = await nexusSdk.bridgeAndExecute({
  toChainId: sepolia.id,        // Destination: Sepolia
  token: "ETH",                  // Bridge ETH
  amount: collateral,            // Amount to bridge
  execute: {
    contractAddress: CONTRACTS.LendingPool,
    contractAbi: EthereumLendingPoolABI,
    functionName: "borrow",
    buildFunctionParams: (token, bridgedAmount, chainId, userAddress) => {
      return {
        functionParams: [
          pyusdAmount,              // Amount of PYUSD to borrow
          liquidationRatio,         // 50-80% (in basis points)
          shortRatio,               // 0-30% (in basis points)
          userAddress,              // onBehalfOf - NFT goes to original user!
        ],
        value: collateralWei.toString(),  // ETH collateral for payable function
      };
    },
    enableTransactionPolling: true,
    waitForReceipt: true,
    receiptTimeout: 120000,
  },
});
```

### 2. Key Features

#### Dynamic Parameter Builder

The `buildFunctionParams` function is called **after bridging** with the actual bridged amounts:

```typescript
type DynamicParamBuilder = (
  token: SUPPORTED_TOKENS,      // "ETH"
  amount: string,               // Actual bridged amount after fees
  chainId: SUPPORTED_CHAINS_IDS, // Destination chain ID
  userAddress: `0x${string}`    // User's address
) => {
  functionParams: readonly unknown[];
  value?: string;               // ETH value for payable functions
};
```

#### onBehalfOf Parameter

The `onBehalfOf` parameter ensures the Loan NFT is minted to the original user on Arbitrum Sepolia:

```solidity
function borrow(
    uint256 pyusdAmount,
    uint256 liquidationRatio,
    uint256 shortRatio,
    address onBehalfOf  // NFT recipient
) external payable returns (uint256 tokenId)
```

### 3. No Contract Changes Required

✅ **Zero contract modifications needed!**

The existing Sepolia contracts already support:
- ✅ `onBehalfOf` parameter in `borrow()` function
- ✅ Payable function accepting ETH collateral
- ✅ Cross-chain compatible design

## 🚀 Usage Guide

### Prerequisites

1. **Wallets**:
   - MetaMask or compatible wallet
   - Configured for Arbitrum Sepolia and Sepolia

2. **Testnet Tokens**:
   - ETH on Arbitrum Sepolia (for collateral + gas)
   - Some ETH on Sepolia (for gas to claim PYUSD - optional)

3. **Faucets**:
   - Arbitrum Sepolia: https://faucet.quicknode.com/arbitrum/sepolia
   - Sepolia: https://sepoliafaucet.com/

### Step-by-Step Instructions

#### 1. Get Testnet ETH

```bash
# Get Arbitrum Sepolia ETH
Visit: https://faucet.quicknode.com/arbitrum/sepolia
Enter your address and claim ETH
```

#### 2. Access Cross-Chain Borrow Page

```
Navigate to: http://localhost:3000/borrow-crosschain
or
Click "Cross-Chain Borrow" on homepage
```

#### 3. Connect Wallet

- Click "Connect Wallet"
- Select Arbitrum Sepolia network
- Approve connection

#### 4. Configure Borrow Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| **ETH Collateral** | > 0 | Amount to bridge and use as collateral |
| **Liquidation Ratio** | 50-80% | Higher = riskier but more borrowing power |
| **Short Ratio** | 0-30% | Short position against ETH |
| **Borrow Amount** | <= Max | PYUSD to borrow on Sepolia |

#### 5. Execute Cross-Chain Borrow

1. Review parameters
2. Check health factor (>100% recommended)
3. Click "Bridge ETH & Borrow PYUSD"
4. Approve transaction in wallet
5. Wait for:
   - ✅ Bridge confirmation (Arbitrum → Sepolia)
   - ✅ Borrow execution on Sepolia
   - ✅ NFT mint confirmation

#### 6. Verify Results

Check on Sepolia:
- **Loan NFT**: Minted to your address
- **PYUSD Balance**: Borrowed amount in your wallet
- **Transaction**: View on Sepolia Etherscan

## 🔍 Testing

### Test Scenarios

#### Scenario 1: Minimum Borrow

```typescript
Collateral: 0.01 ETH (Arbitrum Sepolia)
Liquidation Ratio: 60%
Short Ratio: 0%
Expected: ~$12 PYUSD @ $2000 ETH price
```

#### Scenario 2: Maximum Borrow

```typescript
Collateral: 0.1 ETH (Arbitrum Sepolia)
Liquidation Ratio: 80%
Short Ratio: 30%
Expected: ~$160 PYUSD @ $2000 ETH price
```

#### Scenario 3: Safe Position

```typescript
Collateral: 0.05 ETH (Arbitrum Sepolia)
Liquidation Ratio: 50%
Short Ratio: 0%
Expected: ~$50 PYUSD @ $2000 ETH price
Health Factor: >200%
```

### Debugging

If the transaction fails:

1. **Check Arbitrum Sepolia Balance**
   ```bash
   # Ensure sufficient ETH for gas + collateral
   Minimum: 0.015 ETH (0.01 collateral + 0.005 gas)
   ```

2. **Check Nexus SDK Initialization**
   ```javascript
   console.log("Nexus SDK initialized:", nexusSdk !== null);
   ```

3. **Check Network**
   ```javascript
   console.log("Current chain:", chain?.id);
   console.log("Expected:", arbitrumSepolia.id);
   ```

4. **Check Transaction Logs**
   ```javascript
   // Check browser console for:
   - Bridge transaction hash
   - Execute transaction hash
   - Any error messages
   ```

## 📊 Benefits

### For Users

✅ **True Cross-Chain UX**: Borrow from any supported chain
✅ **Single Transaction**: No manual bridging + borrowing
✅ **Atomic Operation**: Either both succeed or both fail
✅ **Gas Efficient**: Optimized routing via Avail Nexus

### For Protocol

✅ **No New Contracts**: Leverage existing infrastructure
✅ **Liquidity Aggregation**: All liquidity pooled on Sepolia
✅ **Scalable**: Easy to add more source chains
✅ **Secure**: Battle-tested Avail bridge infrastructure

## 🔧 Configuration

### Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Supported Chains

```typescript
export const SUPPORTED_CHAINS = {
  sepolia: 11155111,          // Destination (lending pool)
  arbitrumSepolia: 421614,    // Source (cross-chain entry)
}
```

### Contract Addresses

All contracts deployed on **Sepolia**:

```typescript
LendingPool: "0x29DAC22Ff8Fd47Df08BAA9C14d269cca5DB06DF2"
LoanNFT: "0x8C363c801C4E46301a6e184C632E7699f28f76f2"
MockPYUSD: "0x0B0965002984157446c2300E37A545840BD69195"
StakedPYUSD: "0x511dc3421336B6A6b772e274b5f99b88257da66e"
MockPythOracle: "0x6BaC2D31e74c08cb75117b027c390DeCEDdF6e18"
```

## 🛡️ Security Considerations

### Trust Assumptions

1. **Avail Nexus Bridge**: Trust in Avail's bridge validators
2. **Price Oracle**: Pyth oracle on Sepolia for ETH price
3. **Smart Contracts**: Audited lending pool contracts

### Risk Mitigation

- ✅ Start with small amounts for testing
- ✅ Monitor health factor regularly
- ✅ Understand liquidation risks
- ✅ Keep health factor > 150% for safety

## 📚 Additional Resources

- **Avail Nexus SDK**: https://docs.availproject.org/nexus
- **Arbitrum Sepolia**: https://docs.arbitrum.io/for-devs/concepts/public-chains#arbitrum-sepolia
- **Pyth Oracle**: https://docs.pyth.network/
- **Lending Pool Contract**: contracts/ethereum/core/EthereumLendingPool.sol

## 🐛 Known Issues

1. **Nexus SDK Initialization**: May take a few seconds on first load
2. **Network Switching**: Requires manual approval in wallet
3. **Gas Estimation**: Bridge fees can vary based on network congestion

## 🔮 Future Enhancements

- [ ] Support for more source chains (Optimism, Base, Polygon)
- [ ] Gas estimation preview before transaction
- [ ] Transaction status tracking UI
- [ ] Historical cross-chain borrow analytics
- [ ] Multi-step transaction recovery
