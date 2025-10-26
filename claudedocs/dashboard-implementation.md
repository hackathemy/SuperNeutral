# Blockscout Dashboard Implementation

**Created**: 2025-10-26
**Status**: ✅ Completed
**Network**: Sepolia Testnet

## Overview

Built a comprehensive on-chain analytics dashboard for the lending protocol using Blockscout REST API v2. The dashboard provides real-time monitoring of protocol activity, user portfolios, and event logs.

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript
- **Data Source**: Blockscout REST API v2 (`https://eth-sepolia.blockscout.com/api/v2`)
- **Blockchain**: Ethereum Sepolia Testnet
- **Wallet**: wagmi + Web3Modal
- **UI**: Tailwind CSS

### Components Created

#### 1. Blockscout REST API Client (`/frontend/src/lib/blockscout.ts`)

**Purpose**: Type-safe client for accessing Blockscout API with built-in caching

**Features**:
- ✅ 30-second cache TTL for performance
- ✅ Type-safe interfaces for all API responses
- ✅ Pagination support with `getAllPages()` helper
- ✅ Error handling and retry logic
- ✅ Query parameter filtering

**Key Methods**:
```typescript
// Address endpoints
getAddress(address: string)
getAddressCounters(address: string)
getAddressTransactions(address: string, params)
getAddressTokenTransfers(address: string, params)
getAddressTokenBalances(address: string)
getAddressLogs(address: string, params)
getCoinBalanceHistory(address: string)

// Transaction endpoints
getTransaction(txHash: string)
getTransactionLogs(txHash: string)
getTransactionTokenTransfers(txHash: string, params)

// Token endpoints
getToken(tokenAddress: string)
getTokenTransfers(tokenAddress: string, params)
getTokenHolders(tokenAddress: string, params)
getTokenCounters(tokenAddress: string)

// Smart contract endpoints
getSmartContract(address: string)

// Stats endpoints
getStats()
getTransactionCharts(params)

// Search
search(query: string)
```

**Usage Example**:
```typescript
import { blockscoutAPI } from "@/lib/blockscout";

// Fetch pool counters
const counters = await blockscoutAPI.getAddressCounters(CONTRACTS.LendingPool);

// Fetch token holders
const holders = await blockscoutAPI.getTokenHolders(CONTRACTS.StakedPYUSD);

// Fetch all pages of transactions
const allTxs = await blockscoutAPI.getAllPages(
  `/addresses/${address}/transactions`,
  {},
  10
);
```

#### 2. Protocol Analytics Component (`/frontend/src/components/ProtocolAnalytics.tsx`)

**Purpose**: Display high-level protocol statistics and metrics

**Features**:
- ✅ Real-time pool metrics (transaction count, token transfers, gas used)
- ✅ Pool balance tracking
- ✅ StakedPYUSD token statistics (holders, transfers, supply)
- ✅ Top 5 holders ranking with percentages
- ✅ Last 10 pool transactions
- ✅ Auto-refresh every 30 seconds
- ✅ Direct links to Blockscout explorer

**Data Sources**:
```typescript
const [poolCounters, poolInfo, tokenCounters, tokenInfo, tokenHolders, recentTxs] =
  await Promise.all([
    blockscoutAPI.getAddressCounters(CONTRACTS.LendingPool),
    blockscoutAPI.getAddress(CONTRACTS.LendingPool),
    blockscoutAPI.getTokenCounters(CONTRACTS.StakedPYUSD),
    blockscoutAPI.getToken(CONTRACTS.StakedPYUSD),
    blockscoutAPI.getTokenHolders(CONTRACTS.StakedPYUSD),
    blockscoutAPI.getAddressTransactions(CONTRACTS.LendingPool, { limit: 10 }),
  ]);
```

**Displayed Metrics**:
- Pool Statistics: Total transactions, token transfers, pool balance, total gas used
- Token Statistics: Total holders, total transfers, total supply
- Top Holders: Address, balance, percentage of total supply
- Recent Activity: Transaction hash, method, status, timestamp

#### 3. User Portfolio Component (`/frontend/src/components/UserPortfolio.tsx`)

**Purpose**: Display user-specific balances, positions, and activity

**Features**:
- ✅ PYUSD balance with faucet link
- ✅ sPYUSD balance with PYUSD equivalent
- ✅ Current exchange rate display
- ✅ Active loan NFT positions
- ✅ Last 5 user transactions
- ✅ Auto-refresh every 30 seconds
- ✅ Wallet connection prompt for non-connected users

**Data Sources**:
```typescript
// Balances via wagmi hooks
useReadContract({
  address: CONTRACTS.PYUSD,
  abi: ERC20_ABI,
  functionName: "balanceOf",
  args: [address],
});

useReadContract({
  address: CONTRACTS.StakedPYUSD,
  abi: SPYUSD_ABI,
  functionName: "balanceOf",
  args: [address],
});

// Recent transactions via Blockscout
await blockscoutAPI.getAddressTransactions(address, { limit: 10 });
```

**Displayed Data**:
- Balances: PYUSD, sPYUSD, PYUSD equivalent
- Exchange Rate: 1 sPYUSD = X PYUSD
- Loan Positions: Loan NFT ID, collateral (ETH), debt (PYUSD)
- Recent Activity: Transaction hash, method, status, timestamp

#### 4. Event Logs Component (`/frontend/src/components/EventLogs.tsx`)

**Purpose**: Track and display lending protocol events in real-time

**Features**:
- ✅ Event type filtering (All, Supply, Borrow, Repay, Liquidation, Flash Loan, Withdraw)
- ✅ Decoded event parameters
- ✅ Timeline view with icons and colors
- ✅ Auto-refresh every 30 seconds
- ✅ Maximum height with scroll for long lists

**Event Types Tracked**:
| Event | Icon | Color | Parameters |
|-------|------|-------|------------|
| Supply | 💰 | Green | user, amount |
| Borrow | 📊 | Blue | user, tokenId, collateral, debt |
| Repay | ✅ | Green | user, tokenId, amount |
| Liquidation | ⚠️ | Red | tokenId, liquidator, collateralSeized |
| Flash Loan | ⚡ | Purple | receiver, amount |
| Withdraw | 💵 | Orange | user, amount |

**Data Source**:
```typescript
const response = await blockscoutAPI.getAddressLogs(CONTRACTS.LendingPool, {});

// Decode and filter events
const decodedEvents = (response.items || [])
  .map(decodeEventLog)
  .filter((e): e is DecodedEvent => e !== null)
  .sort((a, b) => b.blockNumber - a.blockNumber);
```

**Event Decoding**:
Events are decoded based on:
- `log.decoded?.method_call` - Event name from Blockscout
- `log.topics` - Indexed parameters
- `log.decoded?.parameters` - Non-indexed parameters

#### 5. Dashboard Page (`/frontend/src/app/dashboard/page.tsx`)

**Purpose**: Main dashboard interface combining all components

**Features**:
- ✅ Three tabs: Protocol Overview, My Portfolio, Event Logs
- ✅ Quick stats cards
- ✅ User guides and documentation
- ✅ Event types legend
- ✅ Links to Blockscout and Etherscan
- ✅ Responsive layout

**Tab Structure**:

**Overview Tab**:
- Protocol Analytics component
- Quick stats grid (Total Supply, Active Loans, Flash Loans)
- Recent activity preview

**Portfolio Tab**:
- User Portfolio component
- How-to-use guide with 4 key actions

**Events Tab**:
- Event Logs component
- Event types legend with 6 event types

## API Endpoints Used

### Address Endpoints
```
GET /addresses/{address}                    - Contract/address info
GET /addresses/{address}/counters           - Transaction counts
GET /addresses/{address}/transactions       - Transaction history
GET /addresses/{address}/token-transfers    - Token transfer events
GET /addresses/{address}/token-balances     - Token holdings
GET /addresses/{address}/logs               - Event logs
GET /addresses/{address}/coin-balance-history - ETH balance history
```

### Token Endpoints
```
GET /tokens/{address}                       - Token info (name, symbol, decimals)
GET /tokens/{address}/transfers             - Transfer events
GET /tokens/{address}/holders               - Token holder list
GET /tokens/{address}/counters              - Holder/transfer counts
```

### Transaction Endpoints
```
GET /transactions/{hash}                    - Transaction details
GET /transactions/{hash}/logs               - Transaction event logs
GET /transactions/{hash}/token-transfers    - Token transfers in tx
```

## Performance Optimizations

### 1. Parallel Data Fetching
All API calls are batched with `Promise.all()` for optimal performance:
```typescript
const [poolCounters, poolInfo, tokenCounters] = await Promise.all([
  blockscoutAPI.getAddressCounters(CONTRACTS.LendingPool),
  blockscoutAPI.getAddress(CONTRACTS.LendingPool),
  blockscoutAPI.getTokenCounters(CONTRACTS.StakedPYUSD),
]);
```

### 2. Client-Side Caching
Built-in 30-second cache in `BlockscoutAPI` class:
```typescript
private cache: Map<string, { data: any; timestamp: number }>;
private cacheTTL: number = 30000; // 30 seconds
```

### 3. Auto-Refresh Strategy
All components refresh every 30 seconds:
```typescript
useEffect(() => {
  loadData();
  const interval = setInterval(loadData, 30000);
  return () => clearInterval(interval);
}, [dependencies]);
```

### 4. Conditional Loading
Components only fetch data when needed:
- Portfolio: Only when wallet is connected
- Events: Respects filter selection
- Analytics: Always loads (public data)

## Contract Integration

### Deployed Contracts (Sepolia)
```typescript
export const CONTRACTS = {
  LendingPool: "0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A",
  LoanNFT: "0xED425451e23239a8e5785d63659cE234067b47FA",
  StakedPYUSD: "0x9Fc31eE2Fa96d49207c2a3513F029F1f4eCf8699",
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9", // Official PayPal USD
  PythOracle: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21", // Official Pyth
  MockStETHVault: "0xD1Ee99250Ff85ccf2A700C86a9a50A39E4f247B7",
};
```

### ABIs Used
```typescript
// ERC20 (PYUSD)
["function balanceOf(address) view returns (uint256)"]

// StakedPYUSD
["function balanceOf(address) view returns (uint256)",
 "function exchangeRate() view returns (uint256)"]

// LoanNFT
["function balanceOf(address) view returns (uint256)",
 "function tokenOfOwnerByIndex(address, uint256) view returns (uint256)"]

// LendingPool
["function loans(uint256) view returns (address, uint256, uint256, uint256, uint256, uint256)"]
```

## User Flow

### 1. Visit Dashboard
```
User → /dashboard → Tab selection (Overview/Portfolio/Events)
```

### 2. Connect Wallet
```
User → Click w3m-button → Select wallet → Connect → View portfolio
```

### 3. View Protocol Stats
```
Overview Tab → See pool metrics, token stats, top holders, recent activity
```

### 4. Monitor Portfolio
```
Portfolio Tab → View balances, loan positions, recent transactions
```

### 5. Track Events
```
Events Tab → Filter by event type → View decoded event logs in timeline
```

## Testing Guide

### Test with Real Sepolia Data

1. **Start Development Server**:
```bash
cd frontend
npm run dev
```

2. **Navigate to Dashboard**:
```
http://localhost:3000/dashboard
```

3. **Test Each Tab**:
   - **Overview**: Verify pool stats, token counters, holder rankings
   - **Portfolio**: Connect wallet, check balances, view loan positions
   - **Events**: Switch filters, verify event decoding, check timestamps

4. **Verify API Calls**:
   - Open browser DevTools → Network tab
   - Filter by "blockscout"
   - Verify 200 status codes
   - Check cache behavior (30s TTL)

5. **Test Auto-Refresh**:
   - Wait 30 seconds
   - Verify components update automatically
   - Check console for any errors

6. **Test Edge Cases**:
   - No wallet connected → Portfolio shows prompt
   - No events → Shows "No events yet" message
   - Empty balances → Displays "0.00"
   - Loading states → Shows "Loading..." messages

### Manual API Testing

Test Blockscout API directly:

```bash
# Pool counters
curl "https://eth-sepolia.blockscout.com/api/v2/addresses/0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A/counters"

# Token info
curl "https://eth-sepolia.blockscout.com/api/v2/tokens/0x9Fc31eE2Fa96d49207c2a3513F029F1f4eCf8699"

# Token holders
curl "https://eth-sepolia.blockscout.com/api/v2/tokens/0x9Fc31eE2Fa96d49207c2a3513F029F1f4eCf8699/holders"

# Event logs
curl "https://eth-sepolia.blockscout.com/api/v2/addresses/0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A/logs"
```

## Future Enhancements

### Planned Features (Not Yet Implemented)

1. **Transaction Toast Notifications**
   - Real-time toast notifications for user transactions
   - Success/error status indicators
   - Transaction hash links

2. **Advanced Analytics**
   - Historical charts (TVL, borrow volume, APY)
   - Liquidation monitoring
   - Flash loan statistics

3. **User Notifications**
   - Health factor alerts
   - Liquidation risk warnings
   - Yield update notifications

4. **Enhanced Event Decoding**
   - Full event signature matching
   - Parameter formatting improvements
   - Event filtering by user address

5. **Autoscout Integration**
   - Custom explorer deployment
   - Branded analytics interface
   - Cost: $12-24/day

## Known Limitations

### 1. Blockscout SDK Not Used
**Reason**: React 19 requirement (project uses React 18)
**Impact**: No SDK-powered transaction notifications
**Workaround**: REST API provides all needed data

### 2. Event Decoding Relies on Blockscout
**Reason**: Blockscout provides pre-decoded events via `decoded.method_call`
**Impact**: If Blockscout ABI is incomplete, events may not decode
**Workaround**: Manual topic matching for critical events

### 3. Loan Position Loading
**Reason**: Requires iterating through `tokenOfOwnerByIndex` calls
**Impact**: Currently shows placeholder data
**TODO**: Implement multicall or proper NFT enumeration

### 4. No Historical Charts
**Reason**: Requires data aggregation beyond current scope
**Impact**: No time-series visualizations
**Future**: Can use Blockscout charts API

## File Structure

```
frontend/
├── src/
│   ├── app/
│   │   └── dashboard/
│   │       └── page.tsx              # Main dashboard page
│   ├── components/
│   │   ├── ProtocolAnalytics.tsx     # Pool stats component
│   │   ├── UserPortfolio.tsx         # User balances component
│   │   └── EventLogs.tsx             # Event tracking component
│   ├── lib/
│   │   └── blockscout.ts             # REST API client
│   └── config/
│       └── contracts.ts              # Contract addresses & ABIs
```

## Dependencies

```json
{
  "wagmi": "^2.x",
  "@web3modal/wagmi": "^5.x",
  "viem": "^2.x",
  "next": "^14.x",
  "react": "^18.x",
  "typescript": "^5.x"
}
```

## Summary

✅ **Completed**:
- Blockscout REST API client with caching
- Protocol Analytics component with real-time stats
- User Portfolio component with wallet integration
- Event Logs component with filtering
- Main Dashboard page with 3 tabs
- Auto-refresh every 30 seconds
- Parallel data fetching for performance
- Type-safe TypeScript interfaces
- Responsive UI with Tailwind CSS

⏳ **Pending**:
- Transaction toast notifications
- Full loan position loading
- Advanced analytics charts
- User notification system
- Autoscout deployment

🎯 **Achievement**: Fully functional on-chain analytics dashboard ready for testing with real Sepolia data!
