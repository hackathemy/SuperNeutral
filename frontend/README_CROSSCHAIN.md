# 🌉 Cross-Chain Borrow Feature

## Quick Start

### 1. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit: **http://localhost:3000/borrow-crosschain**

### 2. Get Testnet Tokens

**Arbitrum Sepolia ETH**:
- Faucet: https://faucet.quicknode.com/arbitrum/sepolia
- Amount needed: ~0.015 ETH (0.01 for collateral + 0.005 for gas)

### 3. Execute Cross-Chain Borrow

1. Connect wallet to **Arbitrum Sepolia**
2. Enter collateral amount (ETH)
3. Set liquidation ratio (50-80%)
4. Set short ratio (0-30%)
5. Enter borrow amount (PYUSD)
6. Click "Bridge ETH & Borrow PYUSD"

## How It Works

```
Arbitrum Sepolia (You)  →  Nexus Bridge  →  Sepolia (Lending Pool)
        ↓                         ↓                    ↓
   Send ETH              Bridge + Execute         Borrow PYUSD
                                                  Mint Loan NFT
```

### Technical Flow

1. **User Action**: Initiate borrow on Arbitrum Sepolia
2. **Nexus SDK**: Bridges ETH to Sepolia
3. **Auto-Execute**: Calls `borrow()` on Sepolia with your parameters
4. **Result**: Loan NFT minted to your address on Sepolia

## Key Features

✅ **No Contract Deployment Needed**
- Leverages existing Sepolia contracts
- Uses `onBehalfOf` parameter for cross-chain NFT minting

✅ **Atomic Operation**
- Bridge + Execute in single transaction
- Either both succeed or both fail

✅ **Powered by Avail Nexus**
- Battle-tested bridge infrastructure
- Optimized gas routing

## Architecture Highlights

### Zero Contract Changes

The existing `borrow()` function already supports cross-chain use via `onBehalfOf`:

```solidity
function borrow(
    uint256 pyusdAmount,
    uint256 liquidationRatio,
    uint256 shortRatio,
    address onBehalfOf  // ← NFT recipient (your address)
) external payable returns (uint256 tokenId)
```

### Nexus SDK Integration

```typescript
await nexusSdk.bridgeAndExecute({
  toChainId: sepolia.id,
  token: "ETH",
  amount: collateral,
  execute: {
    contractAddress: LENDING_POOL_ADDRESS,
    functionName: "borrow",
    buildFunctionParams: (token, amount, chainId, userAddress) => ({
      functionParams: [pyusdAmount, liquidationRatio, shortRatio, userAddress],
      value: collateralInWei,
    }),
  },
});
```

## Testing Scenarios

### Scenario 1: Basic Borrow
```
Chain: Arbitrum Sepolia → Sepolia
Collateral: 0.01 ETH
Liquidation: 60%
Expected: ~$12 PYUSD (@ $2000 ETH)
```

### Scenario 2: Max Leverage
```
Chain: Arbitrum Sepolia → Sepolia
Collateral: 0.1 ETH
Liquidation: 80%
Expected: ~$160 PYUSD
Risk: Higher liquidation risk
```

## File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── borrow-crosschain/
│   │   │   └── page.tsx         ← Cross-chain borrow UI
│   │   └── page.tsx             ← Updated homepage
│   └── config/
│       ├── wagmi.ts             ← Multi-chain config
│       └── contracts.ts         ← Network constants
└── README_CROSSCHAIN.md         ← This file
```

## Contract Addresses (Sepolia)

All contracts are on **Sepolia** (destination chain):

```typescript
LendingPool: "0x29DAC22Ff8Fd47Df08BAA9C14d269cca5DB06DF2"
LoanNFT: "0x8C363c801C4E46301a6e184C632E7699f28f76f2"
MockPYUSD: "0x0B0965002984157446c2300E37A545840BD69195"
```

## Network Configuration

### Supported Chains
- **Arbitrum Sepolia** (421614) - Source chain
- **Sepolia** (11155111) - Destination chain (lending pool)

### RPC URLs
- Arbitrum Sepolia: https://sepolia-rollup.arbitrum.io/rpc
- Sepolia: https://eth-sepolia.g.alchemy.com/v2/demo

## Troubleshooting

### Issue: "Nexus SDK not initialized"
**Solution**: Wait a few seconds after page load for SDK initialization

### Issue: "Please switch to Arbitrum Sepolia"
**Solution**:
1. Click "Switch to Arbitrum Sepolia" button
2. Approve network switch in wallet

### Issue: "Insufficient ETH"
**Solution**: Get Arbitrum Sepolia ETH from faucet
- https://faucet.quicknode.com/arbitrum/sepolia

### Issue: "Transaction failed"
**Check**:
1. Sufficient collateral ratio
2. Available PYUSD liquidity on Sepolia
3. Gas balance on Arbitrum Sepolia

## Benefits

### For Users
- 🌍 Borrow from any supported chain
- ⚡ Single-click operation
- 🔒 Atomic transactions (no stuck funds)
- 💰 Optimal gas routing

### For Protocol
- 🏗️ No new contracts needed
- 💧 Liquidity aggregated on Sepolia
- 🔌 Easy to add more chains
- 🛡️ Secure Avail bridge infrastructure

## Next Steps

Want to test it? Follow these steps:

1. **Get testnet tokens**
   ```bash
   # Visit Arbitrum Sepolia faucet
   https://faucet.quicknode.com/arbitrum/sepolia
   ```

2. **Start frontend**
   ```bash
   cd frontend && npm run dev
   ```

3. **Navigate to cross-chain borrow**
   ```
   http://localhost:3000/borrow-crosschain
   ```

4. **Execute your first cross-chain borrow!** 🚀

## Learn More

- 📖 **Full Documentation**: See `CROSS_CHAIN_GUIDE.md`
- 🏗️ **Architecture**: Check memory `cross-chain-architecture`
- 🔧 **Implementation**: Review `cross-chain-implementation-summary`

## Support

Having issues? Check:
1. Browser console for error messages
2. Wallet network configuration
3. Testnet ETH balance on Arbitrum Sepolia

Enjoy seamless cross-chain borrowing! 🎉
