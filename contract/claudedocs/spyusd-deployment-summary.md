# sPYUSD System - Implementation & Deployment Summary

## Overview

Complete implementation of sPYUSD (Staked PYUSD) - an interest-bearing token system where liquidity suppliers receive sPYUSD tokens that automatically increase in value as borrowers pay interest.

**Implementation Date**: 2025-10-18
**Status**: ✅ Implementation Complete | ⏳ Deployment Pending

---

## System Architecture

### Exchange Rate Mechanism

```
Exchange Rate = Total PYUSD in Pool / Total sPYUSD Supply

Initial Rate: 1.0 (1 sPYUSD = 1 PYUSD)
Over Time: 1.05 → 1.10 → 1.15... (continuous growth)
```

### Token Flows

**Supply PYUSD**:
```
User → supplyPYUSD(1000 PYUSD)
→ Mint sPYUSD = 1000 / exchangeRate
→ User receives sPYUSD
```

**Withdraw PYUSD**:
```
User → withdrawPYUSD(952 sPYUSD)
→ PYUSD = 952 × exchangeRate
→ User receives PYUSD (value increased!)
```

**Interest Distribution**:
```
Borrower pays interest → totalPYUSDDeposited increases
→ Exchange rate increases automatically
→ All sPYUSD holders benefit proportionally
```

---

## Files Created/Modified

### New Contracts

1. **`/contracts/ethereum/tokens/StakedPYUSD.sol`**
   - ERC-20 token with exchange rate mechanism
   - 6 decimals (matches PYUSD)
   - Functions: `mint()`, `burn()`, `updateTotalPYUSD()`, `exchangeRate()`
   - Only LendingPool can mint/burn

### Modified Contracts

2. **`/contracts/ethereum/core/EthereumLendingPool.sol`**
   - Added `StakedPYUSD` integration
   - Modified `supplyPYUSD()` to mint sPYUSD
   - Modified `withdrawPYUSD()` to burn sPYUSD
   - Modified `repay()` to distribute interest via exchange rate
   - Updated constructor to accept sPYUSD address

3. **`/contracts/ethereum/interfaces/ILendingPool.sol`**
   - Updated return types for `supplyPYUSD()` and `withdrawPYUSD()`

### Frontend Files

4. **`/frontend/src/app/supply/page.tsx`**
   - Complete rewrite with sPYUSD features
   - Exchange rate display
   - sPYUSD balance tracking
   - Real-time profit calculation
   - Supply/Withdraw tabs with previews

5. **`/frontend/src/app/borrow/page.tsx`**
   - Added short ratio slider (0-30%)
   - Updated transaction args

6. **`/frontend/src/app/page.tsx`**
   - Updated feature card text

7. **`/frontend/src/lib/abis/StakedPYUSD.ts`** (NEW)
   - Extracted ABI from compiled contract

8. **`/frontend/src/config/contracts.ts`**
   - Added StakedPYUSD address (placeholder)

### Documentation

9. **`/lending-protocol-overview.md`**
   - Added comprehensive sPYUSD section
   - Exchange rate formulas
   - Example scenarios
   - Interest distribution mechanics

---

## Deployment Requirements

### Contract Deployment Order

```bash
# 1. Deploy StakedPYUSD
StakedPYUSD.deploy()
→ Save address: STAKED_PYUSD_ADDRESS

# 2. Deploy new EthereumLendingPool
EthereumLendingPool.deploy(
  PYUSD_ADDRESS,
  LOAN_NFT_ADDRESS,
  STETH_VAULT_ADDRESS,
  PYTH_ORACLE_ADDRESS,
  STAKED_PYUSD_ADDRESS  // ← New parameter
)
→ Save address: NEW_LENDING_POOL_ADDRESS

# 3. Set LendingPool in StakedPYUSD
stakedPYUSD.setLendingPool(NEW_LENDING_POOL_ADDRESS)

# 4. Set LendingPool in LoanNFT
loanNFT.setLendingPool(NEW_LENDING_POOL_ADDRESS)
```

### Deployment Script Template

```javascript
import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Existing contract addresses
  const PYUSD = "0x57391875ce6340E5ED878752A30D080f31B63934";
  const LOAN_NFT = "0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529";
  const STETH_VAULT = "0xF289c5dcF9CDd8e36128682A32A6B4D962825955";
  const PYTH_ORACLE = "0x05029B98e42AC2b0C4315E52f30260918efcAd48";

  // 1. Deploy StakedPYUSD
  console.log("\n1. Deploying StakedPYUSD...");
  const StakedPYUSD = await hre.ethers.getContractFactory("StakedPYUSD");
  const stakedPYUSD = await StakedPYUSD.deploy(deployer.address);
  await stakedPYUSD.waitForDeployment();
  const stakedPYUSDAddress = await stakedPYUSD.getAddress();
  console.log("✅ StakedPYUSD:", stakedPYUSDAddress);

  // 2. Deploy new LendingPool
  console.log("\n2. Deploying EthereumLendingPool...");
  const LendingPool = await hre.ethers.getContractFactory("EthereumLendingPool");
  const lendingPool = await LendingPool.deploy(
    PYUSD,
    LOAN_NFT,
    STETH_VAULT,
    PYTH_ORACLE,
    stakedPYUSDAddress
  );
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log("✅ LendingPool:", lendingPoolAddress);

  // 3. Set LendingPool in StakedPYUSD
  console.log("\n3. Setting LendingPool in StakedPYUSD...");
  await stakedPYUSD.setLendingPool(lendingPoolAddress);
  console.log("✅ LendingPool set in StakedPYUSD");

  // 4. Set LendingPool in LoanNFT
  console.log("\n4. Updating LendingPool in LoanNFT...");
  const loanNFT = await hre.ethers.getContractAt("EthereumLoanNFT", LOAN_NFT);
  await loanNFT.setLendingPool(lendingPoolAddress);
  console.log("✅ LendingPool updated in LoanNFT");

  console.log("\n📋 Deployment Summary:");
  console.log("StakedPYUSD:", stakedPYUSDAddress);
  console.log("LendingPool:", lendingPoolAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

---

## Frontend Configuration Updates

After deployment, update `/frontend/src/config/contracts.ts`:

```typescript
export const CONTRACTS = {
  LendingPool: "NEW_LENDING_POOL_ADDRESS" as `0x${string}`,
  LoanNFT: "0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529" as `0x${string}`,
  MockPYUSD: "0x57391875ce6340E5ED878752A30D080f31B63934" as `0x${string}`,
  MockStETHVault: "0xF289c5dcF9CDd8e36128682A32A6B4D962825955" as `0x${string}`,
  MockPythOracle: "0x05029B98e42AC2b0C4315E52f30260918efcAd48" as `0x${string}`,
  StakedPYUSD: "STAKED_PYUSD_ADDRESS" as `0x${string}`,
} as const;

export const EXPLORER_URLS = {
  LendingPool: "https://sepolia.etherscan.io/address/NEW_LENDING_POOL_ADDRESS",
  LoanNFT: "https://sepolia.etherscan.io/address/0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529",
  MockPYUSD: "https://sepolia.etherscan.io/address/0x57391875ce6340E5ED878752A30D080f31B63934",
  MockStETHVault: "https://sepolia.etherscan.io/address/0xF289c5dcF9CDd8e36128682A32A6B4D962825955",
  MockPythOracle: "https://sepolia.etherscan.io/address/0x05029B98e42AC2b0C4315E52f30260918efcAd48",
  StakedPYUSD: "https://sepolia.etherscan.io/address/STAKED_PYUSD_ADDRESS",
} as const;
```

---

## Testing Checklist

After deployment, verify:

### Contract Verification
- [ ] StakedPYUSD deployed successfully
- [ ] LendingPool deployed with correct constructor args
- [ ] LendingPool address set in StakedPYUSD
- [ ] LendingPool address updated in LoanNFT
- [ ] Initial exchange rate = 1.0

### Frontend Verification
- [ ] Contract addresses updated in config
- [ ] Exchange rate displays correctly
- [ ] Supply PYUSD mints sPYUSD
- [ ] sPYUSD balance displays correctly
- [ ] Withdraw burns sPYUSD and returns PYUSD
- [ ] Profit calculation shows correctly
- [ ] Short ratio slider works in borrow page

### Integration Testing
- [ ] Supply 1000 PYUSD → receive ~1000 sPYUSD
- [ ] Borrow ETH → repay with interest
- [ ] Exchange rate increases after interest payment
- [ ] sPYUSD value increases accordingly
- [ ] Withdraw sPYUSD → receive more PYUSD than initially supplied

---

## Example User Flow

### Scenario: Alice Supplies Liquidity

**Day 0**:
```
Alice supplies: 10,000 PYUSD
Exchange Rate: 1.0
Alice receives: 10,000 sPYUSD
```

**Day 30** (after borrowers pay 500 PYUSD interest):
```
Total PYUSD: 10,500
Total sPYUSD: 10,000
New Exchange Rate: 1.05

Alice's sPYUSD: 10,000
Alice's Value: 10,000 × 1.05 = 10,500 PYUSD
Profit: 500 PYUSD (5%)
```

**Day 60** (after another 500 PYUSD interest):
```
Total PYUSD: 11,000
Total sPYUSD: 10,000
New Exchange Rate: 1.10

Alice's Value: 10,000 × 1.10 = 11,000 PYUSD
Profit: 1,000 PYUSD (10%)
```

Alice can withdraw anytime and receive current value in PYUSD.

---

## Key Features

✅ **Automatic Compounding**: Interest increases exchange rate, no claiming needed
✅ **Transferable**: sPYUSD is standard ERC-20, can be transferred/traded
✅ **Transparent**: Exchange rate publicly viewable on-chain
✅ **Fair Distribution**: All suppliers earn proportionally
✅ **Gas Efficient**: No per-user accounting, single exchange rate update
✅ **Compatible**: 6 decimals matches PYUSD standard

---

## Breaking Changes

⚠️ **Important**: This deployment creates a NEW LendingPool contract

**Impact**:
- Old LendingPool will remain on-chain but should not be used
- Users with active loans on old contract must repay/liquidate
- Frontend must be updated to new contract addresses
- Old supplier balances do NOT migrate automatically

**Migration Strategy**:
1. Announce new contract deployment
2. Allow time for users to close old positions
3. Deploy new contracts
4. Update frontend
5. Monitor both contracts during transition

---

## Next Steps

1. **Create deployment script** at `/scripts/deploy-spyusd.js`
2. **Test on local network** first
3. **Deploy to Sepolia** testnet
4. **Update frontend config** with new addresses
5. **Verify contracts** on Etherscan
6. **Test complete user flow** end-to-end
7. **Update documentation** with final addresses

---

## Support Information

**Solidity Version**: 0.8.28
**OpenZeppelin**: 5.0.1
**Network**: Sepolia Testnet
**Compiler Settings**: viaIR enabled, 200 optimization runs

**Contract Sizes**:
- StakedPYUSD: ~6 KB
- EthereumLendingPool: ~24 KB (within limit)

**Estimated Gas Costs**:
- Deploy StakedPYUSD: ~800K gas
- Deploy LendingPool: ~3.5M gas
- Supply PYUSD: ~120K gas
- Withdraw PYUSD: ~100K gas
