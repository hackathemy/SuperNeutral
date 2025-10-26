# Aave V3 Vault Integration Guide

## 🎯 Overview

This guide explains how to integrate **real yield-generating staking** using **Aave V3** on Sepolia testnet, replacing the mock vault with a production-ready solution.

### Why Aave V3?

| Feature | Mock Vault | Aave V3 Vault |
|---------|-----------|---------------|
| **Real Yields** | ❌ Fake (0.1%) | ✅ Real (~2-3% APY) |
| **Testnet Support** | ⚠️ Mock only | ✅ Sepolia supported |
| **Production Ready** | ❌ Testing only | ✅ Battle-tested protocol |
| **Complexity** | 🟢 Simple | 🟢 Simple integration |

---

## 📊 How It Works

### Current Flow (Mock Vault)
```
User deposits 1 ETH collateral
    ↓
MockStETHVault receives ETH
    ↓
ETH sits idle (no yield)
    ↓
Withdrawal adds 0.1% fake reward
```

### New Flow (Aave V3 Vault)
```
User deposits 1 ETH collateral
    ↓
AaveV3Vault receives ETH
    ↓
ETH → WETH (wrap)
    ↓
WETH → Aave V3 Pool (supply)
    ↓
Receive aWETH (interest-bearing token)
    ↓
aWETH balance grows over time (real APY)
    ↓
Withdrawal: aWETH → WETH → ETH (with real yield)
```

---

## 🔧 Technical Implementation

### Contract Architecture

#### AaveV3Vault.sol
```solidity
// Key Components:

1. ETH Wrapping
   - Converts ETH ↔ WETH using WETH9 contract

2. Aave V3 Integration
   - Pool.supply() - Deposits WETH, receives aWETH
   - Pool.withdraw() - Burns aWETH, receives WETH + yield

3. Automatic Yield Accrual
   - aWETH is a rebasing token
   - Balance increases automatically over time
   - No manual harvesting needed!

4. Compatible Interface
   - Implements IStETHVault
   - Drop-in replacement for MockStETHVault
```

### Key Addresses (Sepolia Testnet)

```javascript
const AAVE_V3_SEPOLIA = {
    // Core Protocol
    pool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",

    // Tokens
    weth: "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c",
    aWETH: "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830",

    // Optional
    poolDataProvider: "0x3e9708d80f7B3e43118013075F7e95CE3AB31F31",
    oracle: "0x2da88497588bf89281816106C7259e31AF45a663"
};
```

---

## 🚀 Deployment

### 1. Compile Contracts
```bash
npm run compile
```

### 2. Deploy with Aave V3 Vault
```bash
npm run deploy:aave
```

This will deploy:
- ✅ AaveV3Vault (real yield generation)
- ✅ EthereumLendingPool (updated to use AaveV3Vault)
- ✅ EthereumLoanNFT
- ✅ StakedPYUSD
- ✅ MockPYUSD (for testing)

### 3. Verify Deployment
Check `deployment-aave-vault.json` for deployed addresses.

---

## 🧪 Testing

### Supply PYUSD to Pool
```javascript
const pyusd = await ethers.getContractAt("IERC20", pyusdAddress);
const lendingPool = await ethers.getContractAt("ILendingPool", poolAddress);

// Approve
await pyusd.approve(poolAddress, ethers.parseUnits("10000", 6));

// Supply
await lendingPool.supplyPYUSD(ethers.parseUnits("10000", 6), ethers.ZeroAddress);
```

### Borrow with ETH Collateral
```javascript
// This will deposit ETH to Aave V3!
await lendingPool.borrow(
    ethers.parseUnits("1000", 6),  // borrow 1000 PYUSD
    6000,                           // 60% liquidation ratio
    1000,                           // 10% short ratio (not yet implemented)
    ethers.ZeroAddress,             // onBehalfOf
    { value: ethers.parseEther("0.5") }  // 0.5 ETH collateral
);
```

### Check Aave Yields
```javascript
const vault = await ethers.getContractAt("AaveV3Vault", vaultAddress);

// Check aWETH balance (grows over time)
const aWETHBalance = await vault.getStETHBalance();
console.log("aWETH Balance:", ethers.formatEther(aWETHBalance));

// Check earned rewards
const rewards = await vault.getTotalRewards();
console.log("Earned Rewards:", ethers.formatEther(rewards), "ETH");
```

### Verify on Aave UI
1. Visit https://app.aave.com
2. Enable Testnet mode
3. Switch to Sepolia
4. Check vault address in "Supplied Assets"

---

## 📈 Yield Tracking

### How Yields Work

```javascript
// Initial deposit
totalETHDeposited = 1.0 ETH
aWETHBalance = 1.0 aWETH

// After 1 month (~2.5% APY)
aWETHBalance = 1.002 aWETH  // Balance increased!
rewards = 1.002 - 1.0 = 0.002 ETH

// After 1 year
aWETHBalance = 1.025 aWETH
rewards = 0.025 ETH
```

### Real-time Monitoring

```javascript
// Get current APY from Aave
const dataProvider = await ethers.getContractAt(
    "IPoolDataProvider",
    "0x3e9708d80f7B3e43118013075F7e95CE3AB31F31"
);

const reserveData = await dataProvider.getReserveData(wethAddress);
const supplyAPY = reserveData.liquidityRate / 1e25; // Convert from ray
console.log("Current Supply APY:", supplyAPY.toFixed(2), "%");
```

---

## 🔄 Migration from Mock Vault

### Option 1: Fresh Deployment (Recommended)
```bash
# Deploy new system with AaveV3Vault
npm run deploy:aave
```

### Option 2: Update Existing Deployment
1. Deploy AaveV3Vault
2. Deploy new LendingPool with AaveV3Vault address
3. Migrate liquidity from old to new pool
4. Update frontend to use new contract addresses

---

## 💰 Cost Comparison

### Gas Costs (Sepolia estimates)

| Operation | Mock Vault | Aave V3 Vault | Difference |
|-----------|-----------|---------------|------------|
| Deposit ETH | ~50k gas | ~180k gas | +130k gas |
| Withdraw ETH | ~40k gas | ~200k gas | +160k gas |
| **Total** | ~90k gas | ~380k gas | **+290k gas** |

**Trade-off**: Higher gas costs for **real yields**

---

## ⚠️ Important Considerations

### 1. Aave V3 Risks
- **Smart Contract Risk**: Aave is audited but not risk-free
- **Liquidity Risk**: WETH pool could become illiquid (rare on Aave)
- **Oracle Risk**: Price feeds could fail (Aave has fallbacks)

### 2. Gas Optimization
- Aave interactions cost more gas than mock vault
- Consider batching operations for mainnet deployment
- Use multicall for reading multiple values

### 3. Emergency Scenarios
```solidity
// Built-in emergency withdrawal
function emergencyWithdraw() external onlyOwner {
    // Withdraws all from Aave and sends to owner
}
```

---

## 🎓 Educational Resources

### Aave V3 Documentation
- Official Docs: https://docs.aave.com/developers/
- Testnet UI: https://app.aave.com (enable testnet mode)
- Smart Contracts: https://github.com/aave/aave-v3-core

### Testing Resources
- Sepolia Faucet: https://www.alchemy.com/faucets/ethereum-sepolia
- Sepolia Explorer: https://sepolia.etherscan.io
- Aave Discord: https://discord.gg/aave

---

## 📝 Next Steps

### Immediate
1. ✅ Deploy AaveV3Vault to Sepolia
2. ✅ Test deposit/withdraw flows
3. ✅ Verify yields are accruing
4. ✅ Update frontend to show real APY

### Future Enhancements
1. **Multi-Protocol Support**
   - Add Compound V3 as alternative
   - Implement strategy router for best yields

2. **Yield Optimization**
   - Auto-compound rewards
   - Rebalance between protocols

3. **Advanced Features**
   - Implement actual short position logic
   - Use longAmount for Aave, shortAmount for other strategies

4. **Mainnet Preparation**
   - Audit smart contracts
   - Test on mainnet fork
   - Deploy to production

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Insufficient WETH balance"
```bash
# Check WETH faucet or wrap ETH manually
cast send $WETH "deposit()" --value 1ether --rpc-url sepolia
```

**Issue**: "Pool has insufficient liquidity"
```bash
# Check Aave pool reserves
# May need to wait or use smaller amounts on testnet
```

**Issue**: "Transaction reverted without reason"
```bash
# Check Aave pool is not paused
# Verify WETH address is correct
# Ensure proper approvals
```

---

## 📊 Monitoring & Analytics

### Track Vault Performance
```javascript
// Create monitoring script
async function monitorVault() {
    const vault = await ethers.getContractAt("AaveV3Vault", vaultAddress);

    const totalDeposited = await vault.totalETHDeposited();
    const aTokenBalance = await vault.getStETHBalance();
    const rewards = await vault.getTotalRewards();

    const apy = (rewards / totalDeposited) * (365 / daysElapsed) * 100;

    console.log({
        deposited: ethers.formatEther(totalDeposited),
        current: ethers.formatEther(aTokenBalance),
        rewards: ethers.formatEther(rewards),
        apy: apy.toFixed(2) + "%"
    });
}

// Run every hour
setInterval(monitorVault, 3600000);
```

---

## ✅ Success Criteria

Your integration is successful when:

- [x] AaveV3Vault deployed and authorized
- [x] ETH deposits flow to Aave V3 Pool
- [x] aWETH balance increases over time
- [x] Withdrawals return ETH + real yield
- [x] Frontend displays current APY from Aave
- [x] Gas costs acceptable for your use case

---

## 🎉 Benefits Summary

### What You Get

1. **Real Yields**: 2-3% APY on ETH collateral (vs 0% mock)
2. **Battle-Tested**: Aave V3 manages $10B+ TVL
3. **Transparent**: On-chain yields, verifiable on Aave UI
4. **Composable**: Can integrate with other Aave features
5. **Production-Ready**: Works on mainnet with same code

### Production Deployment

When ready for mainnet:
1. Update addresses to mainnet Aave V3
2. Run comprehensive security audit
3. Test on mainnet fork extensively
4. Deploy with timelock/multisig ownership
5. Monitor yields and health factors

---

**Ready to deploy real yields? Run:**
```bash
npm run deploy:aave
```

**Questions?** Check the troubleshooting section or review Aave docs.
