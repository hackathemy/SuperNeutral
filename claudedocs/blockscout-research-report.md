# Blockscout SDK & Autoscout Research Report

**Generated**: October 26, 2025
**Project**: ETH-Online Lending Protocol Dashboard
**Testnet**: Sepolia (Chain ID: 11155111)

---

## Executive Summary

This report provides comprehensive information about integrating Blockscout SDK and Autoscout for building a lending protocol dashboard. Blockscout offers two primary integration paths:

1. **Blockscout SDK** - React toolkit for embedding transaction notifications and history in your dApp
2. **Autoscout** - Self-service platform for deploying custom blockchain explorers in minutes
3. **REST API v2** - Rich API for querying blockchain data programmatically

---

## Table of Contents

1. [Blockscout SDK](#blockscout-sdk)
2. [Autoscout Explorer Launchpad](#autoscout-explorer-launchpad)
3. [REST API v2 Endpoints](#rest-api-v2-endpoints)
4. [Implementation Strategy](#implementation-strategy)
5. [Contract Integration](#contract-integration)
6. [Code Examples](#code-examples)
7. [Best Practices](#best-practices)

---

## Blockscout SDK

### Overview

The Blockscout App SDK is a React toolkit (currently in beta) designed to integrate Blockscout transaction notifications and transaction history into decentralized applications.

**Package**: `@blockscout/app-sdk` (v0.1.2)
**NPM**: https://www.npmjs.com/package/@blockscout/app-sdk
**Docs**: https://docs.blockscout.com/devs/blockscout-sdk

### Key Features

- **Transaction Toast Notifications** - Real-time transaction status updates
- **Transaction History Popup** - View recent transactions for addresses or chains
- **Transaction Interpretation** - Detailed transaction summaries with decoded data
- **Multi-chain Support** - Compatible with any Blockscout API v2 instance
- **Mobile-responsive Design** - Works seamlessly on all devices
- **Real-time Updates** - Live transaction status tracking

### Installation

```bash
# Using npm
npm install @blockscout/app-sdk

# Using yarn
yarn add @blockscout/app-sdk
```

### Basic Setup

```javascript
import React from 'react';
import {
  NotificationProvider,
  TransactionPopupProvider,
  useNotification,
  useTransactionPopup
} from "@blockscout/app-sdk";

function App() {
  return (
    <NotificationProvider>
      <TransactionPopupProvider>
        <YourApp />
      </TransactionPopupProvider>
    </NotificationProvider>
  );
}
```

### API Methods

#### useNotification Hook

```typescript
const { openTxToast } = useNotification();

// Open transaction toast
openTxToast(chainId: string, hash: string): Promise<void>
```

**Example Usage:**
```javascript
const { openTxToast } = useNotification();

const handleTransaction = async (txHash) => {
  // Show transaction toast for Sepolia (chain ID: 11155111)
  await openTxToast("11155111", txHash);
};
```

#### useTransactionPopup Hook

```typescript
const { openPopup } = useTransactionPopup();

// Open transaction history popup
openPopup(options: {
  chainId: string;
  address?: string; // Optional: filter by address
}): void
```

**Example Usage:**
```javascript
const { openPopup } = useTransactionPopup();

const viewTransactionHistory = () => {
  openPopup({
    chainId: "11155111", // Sepolia
    address: "0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A" // LendingPool
  });
};
```

### Supported Chain IDs

- `1` - Ethereum Mainnet
- `11155111` - Sepolia Testnet
- `137` - Polygon Mainnet
- `42161` - Arbitrum One
- `10` - Optimism
- All chains listed at: https://github.com/blockscout/chainscout/blob/main/data/chains.json

### Compatibility

The SDK is compatible with any blockchain that has a Blockscout explorer instance with API v2 support. Chains are listed in Chainscout.

---

## Autoscout Explorer Launchpad

### Overview

Autoscout is a self-service platform that enables you to deploy a fully functional, customized block explorer in 5-10 minutes on managed infrastructure.

**URL**: https://deploy.blockscout.com/
**Docs**: https://docs.blockscout.com/using-blockscout/autoscout

### Key Capabilities

- Deploy custom explorers in under 5 minutes
- Hosted infrastructure (no DevOps required)
- Full blockchain indexing with transaction history
- Custom branding and theming
- Support for EVM-compatible chains
- Optimized for rollups (OP Stack, Arbitrum, zkEVM, zkSync)
- Pay-as-you-go pricing model

### Setup Process

#### 1. Account Creation

1. Navigate to https://deploy.blockscout.com/
2. Create an account and login
3. Click "Add instance" to begin

#### 2. Purchase Credits

- Each credit costs $1.00
- Payment via Stripe (crypto coming soon)
- Test credits available in Discord (#autoscout channel)

#### 3. Configuration (3 Tabs)

##### Info Tab (Required Fields)

**Chain Specifications:**
- **Instance Size**: Select based on transaction volume
  - xSmall: New chains
  - Small: <50K tx/day
  - Medium: <150K tx/day
  - Large: <1M tx/day
- **Instance Name**: Creates URL (instance-name.cloud.blockscout.com)
- **Chain Name**: Displays in explorer banner
- **Chain ID**: Network identifier (e.g., 11155111 for Sepolia)
- **HTTP RPC URL**: Archive node with tracing enabled (REQUIRED)
- **Node Type**: Besu, Erigon, Anvil, Geth, or Parity

**Network Configuration:**
- **Gas Token Symbol**: Display identifier (e.g., ETH)
- **Network Type**: Mainnet or Testnet
- **WS URL**: WebSocket endpoint for real-time data
- **Chain Spec URL**: Genesis/chainspec JSON file
- **Public RPC URL**: Enables MetaMask integration

**Advanced Options:**
- **Custom Domain**: Requires DNS CNAME → autoscout.cname.blockscout.com
- **WalletConnect Project ID**: Enables contract Read/Write functionality

**Rollup Configuration:**
Check "This chain is a Rollup" for Arbitrum, Optimism, Polygon zkEVM, or zkSync deployments

##### Branding Tab

**Visual Customization:**
- Announcement banner (optional HTML)
- Theme selection: Light or 3 dark variations
- Address identicon styles (4 options)
- Menu orientation: Vertical or horizontal
- Header gradient colors and text styling

**Logo & Media:**
- Full logo URL (horizontal JPEG/GIF/PNG)
- Square logo for light/dark modes
- Favicon and Open Graph image (min 200×20px, rec 1200×600px, max 8MB)

**SEO & Navigation:**
- OG description for previews
- Enhanced OG tags for API pages
- Enhanced SEO for Stats/Tokens pages
- API navigation link visibility
- Custom footer links (up to 3 columns)

##### Rollup Config Tab

Required only for rollup deployments. Consult rollup-specific ENV variable documentation.

#### 4. Deployment

1. Click "Save and Deploy"
2. Wait 5-10 minutes for deployment
3. Explorer goes live and begins indexing

### Pricing

| Size | Hourly | Daily | Weekly | Monthly |
|------|--------|-------|--------|---------|
| xSmall | $0.35 | $8.50 | $60 | $252 |
| Small | $0.485 | $12 | $84 | $349 |
| Medium | $0.972 | $24 | $168 | $700 |
| Large | $1.32 | $32 | $224 | $950 |

**Important**: Instances halt when credits deplete. Reindexing required after credit replenishment.

### Critical Requirements

**Archive Node Necessity**:
- Archive node REQUIRED for internal transactions
- Tracing must be enabled for token/coin historical balances
- Missing tracing prevents internal transaction indexing even after node upgrades
- Full instance restart required for configuration changes affecting indexing

### Support Resources

- API access with API key (request in Discord)
- Swagger docs: https://blockscout.github.io/swaggers/services/autoscout
- Automated credit alerts at 5, 3, and 1 day thresholds
- Automatic version updates upon instance restart

---

## REST API v2 Endpoints

### Base URL

For Sepolia testnet: `https://eth-sepolia.blockscout.com/api/v2`

API Documentation: `https://eth-sepolia.blockscout.com/api-docs`

### Key Endpoints for Lending Protocol Dashboard

#### Address Endpoints

##### Core Address Information

```
GET /addresses/{address_hash}
```
**Returns**: coin_balance, creator_address, implementation_address, verification status

```
GET /addresses/{address_hash}/counters
```
**Returns**: transactions_count, token_transfers_count, gas_usage_count, validations_count

##### Transaction History

```
GET /addresses/{address_hash}/transactions
```
**Query Params**: `to`, `from`
**Returns**: Paginated transaction list with next_page_params

```
GET /addresses/{address_hash}/token-transfers
```
**Query Params**: `type` (ERC-20, ERC-721, ERC-1155), `filter` (to/from), `token`
**Returns**: Token transfer history

```
GET /addresses/{address_hash}/internal-transactions
```
**Query Params**: `to`, `from`
**Returns**: Internal call traces

##### Token & Balance Information

```
GET /addresses/{address_hash}/token-balances
```
**Returns**: All token balances (non-paginated)

```
GET /addresses/{address_hash}/tokens
```
**Query Params**: `type` (token standard filter)
**Returns**: Token balances with pagination

```
GET /addresses/{address_hash}/coin-balance-history
```
**Returns**: Historical balance changes with block_number, delta, value, timestamp

```
GET /addresses/{address_hash}/coin-balance-history-by-day
```
**Returns**: Daily aggregated balance history

##### Event Logs

```
GET /addresses/{address_hash}/logs
```
**Returns**: Event logs emitted by address

#### Transaction Endpoints

##### Transaction Details

```
GET /transactions/{transaction_hash}
```
**Returns**: status, method, gas details, fee breakdown, decoded_input, revert_reason

```
GET /transactions/{transaction_hash}/summary
```
**Returns**: Human-readable summary with templated variables

##### Transaction Sub-data

```
GET /transactions/{transaction_hash}/token-transfers
```
**Query Params**: `type` (token standard)
**Returns**: Token movements in transaction

```
GET /transactions/{transaction_hash}/internal-transactions
```
**Returns**: Internal calls/creates within transaction

```
GET /transactions/{transaction_hash}/logs
```
**Returns**: Event logs emitted during transaction

```
GET /transactions/{transaction_hash}/raw-trace
```
**Returns**: Low-level execution trace with call stack

```
GET /transactions/{transaction_hash}/state-changes
```
**Returns**: Storage/account state modifications

##### Transaction Lists

```
GET /transactions
```
**Query Params**:
- `filter` (pending/validated)
- `type` (token_transfer, contract_creation, etc.)
- `method` (approve, transfer, etc.)

#### Smart Contract Endpoints

```
GET /smart-contracts/{address_hash}
```
**Returns**: ABI, source code, compiler_version, optimization_runs, license_type, constructor_args, proxy_type, implementations

```
GET /smart-contracts/{address_hash}/methods-read
```
**Returns**: Read methods with custom ABI support

```
GET /smart-contracts/{address_hash}/methods-write
```
**Returns**: Write methods with custom ABI support

```
GET /smart-contracts/{address_hash}/query-read-method
```
**Purpose**: Execute read method queries with custom ABI

#### Token Endpoints

```
GET /tokens/{address_hash}
```
**Returns**: Token metadata and exchange rate

```
GET /tokens/{address_hash}/transfers
```
**Returns**: All transfers of token

```
GET /tokens/{address_hash}/holders
```
**Returns**: Token holder rankings

```
GET /tokens/{address_hash}/counters
```
**Returns**: Transfer/holder statistics

#### Block Endpoints

```
GET /blocks
```
**Query Params**: `type` (block, uncle, reorg)

```
GET /blocks/{block_number_or_hash}
```
**Returns**: Gas metrics, difficulty, miner rewards, timestamps

```
GET /blocks/{block_number_or_hash}/transactions
```
**Returns**: Transactions in block

#### Analytics & Status

```
GET /stats
```
**Returns**: Network statistics (counters)

```
GET /stats/charts/transactions
```
**Returns**: Historical transaction volume

```
GET /stats/charts/market
```
**Returns**: Market cap and supply charts

```
GET /main-page/indexing-status
```
**Returns**: Blockchain sync status

#### Search & Utility

```
GET /search
```
**Query Params**: `q` (search query)
**Returns**: Multi-type search (addresses, tokens, blocks, transactions)

```
GET /health
```
**Returns**: Service health check

### Response Patterns

Most paginated endpoints return:
```json
{
  "items": [...],
  "next_page_params": {
    "block_number": 27736955,
    "index": 4,
    "items_count": 50
  }
}
```

Pagination uses keyset method for fast results, limited to 50 items by default.

---

## Implementation Strategy

### Recommended Approach for Lending Protocol Dashboard

For your lending protocol on Sepolia, I recommend a **hybrid approach** combining Blockscout SDK and REST API:

#### Option 1: SDK Integration (Quick Start)

**Best for**: Adding transaction notifications and history to existing frontend

**Advantages**:
- Fastest implementation (hours, not days)
- Pre-built UI components
- Real-time transaction tracking
- Minimal code required
- Mobile-responsive out of the box

**Implementation Steps**:

1. Install `@blockscout/app-sdk`
2. Wrap app with providers
3. Use hooks for transaction notifications
4. Embed transaction history popup

**Timeline**: 2-4 hours

#### Option 2: REST API Integration (Custom Dashboard)

**Best for**: Building comprehensive analytics and custom visualizations

**Advantages**:
- Full control over UI/UX
- Custom analytics and charts
- Protocol-specific metrics
- Historical data analysis
- Advanced filtering and queries

**Implementation Steps**:

1. Create API client for Blockscout REST API
2. Design custom dashboard components
3. Implement data fetching and caching
4. Build visualizations for lending metrics
5. Add real-time updates via polling or WebSocket

**Timeline**: 1-2 weeks

#### Option 3: Hybrid Approach (Recommended)

**Best for**: Maximum functionality with minimal development time

**Combine**:
- SDK for transaction notifications and history
- REST API for custom analytics and protocol metrics

**Implementation**:

1. **Phase 1** (Week 1): SDK Integration
   - Install and configure SDK
   - Add transaction toasts for lending operations
   - Embed transaction history for user accounts

2. **Phase 2** (Week 2-3): Custom Analytics
   - Build API client for REST endpoints
   - Create dashboard for protocol metrics
   - Add charts for TVL, borrow/lend volumes
   - Display top lenders/borrowers

3. **Phase 3** (Week 4): Enhanced Features
   - Add historical data visualization
   - Implement advanced filtering
   - Create user portfolio views
   - Add export functionality

**Timeline**: 3-4 weeks

#### Option 4: Autoscout Deployment (Custom Explorer)

**Best for**: Dedicated explorer for your lending protocol

**Advantages**:
- Full blockchain explorer with all features
- Custom branding for your protocol
- No infrastructure management
- Fast deployment (5-10 minutes)
- Professional appearance

**Cost**: $12-24/day depending on traffic

**Use Case**: If you want a dedicated explorer specifically for your lending protocol ecosystem (not just integrating into existing dApp).

### Recommended Technology Stack

```
Frontend:
├── React/Next.js (for dashboard)
├── @blockscout/app-sdk (for transaction notifications)
├── ethers.js/viem (for blockchain interactions)
├── TanStack Query (for API data fetching)
├── Chart.js/Recharts (for data visualization)
└── Tailwind CSS (for styling)

Backend (Optional):
├── API caching layer (Redis)
├── Database for historical metrics (PostgreSQL)
└── Scheduled jobs for data aggregation
```

---

## Contract Integration

### Your Sepolia Contract Addresses

```javascript
const contracts = {
  lendingPool: "0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A",
  loanNFT: "0xED425451e23239a8e5785d63659cE234067b47FA",
  stakedPYUSD: "0x9Fc31eE2Fa96d49207c2a3513F029F1f4eCf8699",
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"
};

const SEPOLIA_CHAIN_ID = "11155111";
const BLOCKSCOUT_BASE_URL = "https://eth-sepolia.blockscout.com";
```

### Key Metrics to Track

#### LendingPool Contract

1. **Transaction Volume**
   - Total transactions count
   - Deposits vs withdrawals
   - Borrow vs repay operations

2. **Token Transfers**
   - PYUSD deposits
   - PYUSD withdrawals
   - StakedPYUSD minting/burning

3. **Event Logs**
   - Deposit events
   - Borrow events
   - Repay events
   - Liquidation events

4. **User Analytics**
   - Unique users count
   - Top depositors
   - Top borrowers
   - Active users (daily/weekly/monthly)

#### StakedPYUSD Token

1. **Holder Statistics**
   - Total holders
   - Top holders
   - Holder distribution

2. **Transfer Activity**
   - Transfer count
   - Transfer volume
   - Daily active addresses

#### LoanNFT Contract

1. **NFT Analytics**
   - Total NFTs minted
   - Active loans
   - NFT transfers
   - NFT holders

---

## Code Examples

### 1. SDK Integration - Complete Example

```javascript
// App.jsx
import React from 'react';
import {
  NotificationProvider,
  TransactionPopupProvider
} from "@blockscout/app-sdk";
import LendingDashboard from './components/LendingDashboard';

function App() {
  return (
    <NotificationProvider>
      <TransactionPopupProvider>
        <LendingDashboard />
      </TransactionPopupProvider>
    </NotificationProvider>
  );
}

export default App;
```

```javascript
// components/LendingDashboard.jsx
import React from 'react';
import { useNotification, useTransactionPopup } from "@blockscout/app-sdk";
import { useContractWrite } from 'wagmi'; // or your web3 library

const SEPOLIA_CHAIN_ID = "11155111";
const LENDING_POOL_ADDRESS = "0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A";

function LendingDashboard() {
  const { openTxToast } = useNotification();
  const { openPopup } = useTransactionPopup();

  // Example: Deposit function
  const handleDeposit = async (amount) => {
    try {
      // Execute transaction (using your preferred web3 library)
      const tx = await depositToPool(amount);
      const txHash = tx.hash;

      // Show Blockscout transaction toast
      await openTxToast(SEPOLIA_CHAIN_ID, txHash);

      console.log('Transaction submitted:', txHash);
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  // View transaction history for lending pool
  const viewPoolHistory = () => {
    openPopup({
      chainId: SEPOLIA_CHAIN_ID,
      address: LENDING_POOL_ADDRESS
    });
  };

  // View user's transaction history
  const viewUserHistory = (userAddress) => {
    openPopup({
      chainId: SEPOLIA_CHAIN_ID,
      address: userAddress
    });
  };

  return (
    <div className="lending-dashboard">
      <h1>Lending Protocol Dashboard</h1>

      <div className="actions">
        <button onClick={() => handleDeposit(100)}>
          Deposit 100 PYUSD
        </button>

        <button onClick={viewPoolHistory}>
          View Pool History
        </button>

        <button onClick={() => viewUserHistory('0x...')}>
          View My History
        </button>
      </div>
    </div>
  );
}

export default LendingDashboard;
```

### 2. REST API Integration - API Client

```javascript
// api/blockscout.js
const SEPOLIA_BASE_URL = 'https://eth-sepolia.blockscout.com/api/v2';

class BlockscoutAPI {
  constructor(baseUrl = SEPOLIA_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Blockscout API error:', error);
      throw error;
    }
  }

  // Address methods
  async getAddress(address) {
    return this.request(`/addresses/${address}`);
  }

  async getAddressCounters(address) {
    return this.request(`/addresses/${address}/counters`);
  }

  async getAddressTransactions(address, params = {}) {
    return this.request(`/addresses/${address}/transactions`, params);
  }

  async getAddressTokenTransfers(address, params = {}) {
    return this.request(`/addresses/${address}/token-transfers`, params);
  }

  async getAddressTokenBalances(address) {
    return this.request(`/addresses/${address}/token-balances`);
  }

  async getAddressLogs(address, params = {}) {
    return this.request(`/addresses/${address}/logs`, params);
  }

  async getCoinBalanceHistory(address) {
    return this.request(`/addresses/${address}/coin-balance-history`);
  }

  async getCoinBalanceHistoryByDay(address) {
    return this.request(`/addresses/${address}/coin-balance-history-by-day`);
  }

  // Transaction methods
  async getTransaction(txHash) {
    return this.request(`/transactions/${txHash}`);
  }

  async getTransactionSummary(txHash) {
    return this.request(`/transactions/${txHash}/summary`);
  }

  async getTransactionLogs(txHash) {
    return this.request(`/transactions/${txHash}/logs`);
  }

  async getTransactionTokenTransfers(txHash) {
    return this.request(`/transactions/${txHash}/token-transfers`);
  }

  // Token methods
  async getToken(tokenAddress) {
    return this.request(`/tokens/${tokenAddress}`);
  }

  async getTokenTransfers(tokenAddress, params = {}) {
    return this.request(`/tokens/${tokenAddress}/transfers`, params);
  }

  async getTokenHolders(tokenAddress, params = {}) {
    return this.request(`/tokens/${tokenAddress}/holders`, params);
  }

  async getTokenCounters(tokenAddress) {
    return this.request(`/tokens/${tokenAddress}/counters`);
  }

  // Smart contract methods
  async getSmartContract(address) {
    return this.request(`/smart-contracts/${address}`);
  }

  // Stats methods
  async getStats() {
    return this.request('/stats');
  }

  async getTransactionCharts(params = {}) {
    return this.request('/stats/charts/transactions', params);
  }

  // Search
  async search(query) {
    return this.request('/search', { q: query });
  }

  // Paginated requests helper
  async getAllPages(endpoint, initialParams = {}, maxPages = 10) {
    const results = [];
    let params = initialParams;
    let page = 0;

    while (page < maxPages) {
      const data = await this.request(endpoint, params);

      if (!data.items || data.items.length === 0) {
        break;
      }

      results.push(...data.items);

      if (!data.next_page_params) {
        break;
      }

      params = data.next_page_params;
      page++;
    }

    return results;
  }
}

export default new BlockscoutAPI();
```

### 3. Lending Protocol Analytics Component

```javascript
// components/ProtocolAnalytics.jsx
import React, { useState, useEffect } from 'react';
import blockscoutAPI from '../api/blockscout';

const CONTRACTS = {
  lendingPool: "0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A",
  loanNFT: "0xED425451e23239a8e5785d63659cE234067b47FA",
  stakedPYUSD: "0x9Fc31eE2Fa96d49207c2a3513F029F1f4eCf8699",
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"
};

function ProtocolAnalytics() {
  const [poolStats, setPoolStats] = useState(null);
  const [tokenStats, setTokenStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch lending pool statistics
      const [poolCounters, poolInfo] = await Promise.all([
        blockscoutAPI.getAddressCounters(CONTRACTS.lendingPool),
        blockscoutAPI.getAddress(CONTRACTS.lendingPool)
      ]);

      setPoolStats({
        transactionCount: poolCounters.transactions_count,
        tokenTransferCount: poolCounters.token_transfers_count,
        gasUsed: poolCounters.gas_usage_count,
        balance: poolInfo.coin_balance
      });

      // Fetch StakedPYUSD token statistics
      const [tokenCounters, tokenInfo, tokenHolders] = await Promise.all([
        blockscoutAPI.getTokenCounters(CONTRACTS.stakedPYUSD),
        blockscoutAPI.getToken(CONTRACTS.stakedPYUSD),
        blockscoutAPI.getTokenHolders(CONTRACTS.stakedPYUSD)
      ]);

      setTokenStats({
        transferCount: tokenCounters.token_transfers_count,
        holderCount: tokenCounters.token_holders_count,
        totalSupply: tokenInfo.total_supply,
        topHolders: tokenHolders.items?.slice(0, 5) || []
      });

      // Fetch recent lending pool activity
      const recentTxs = await blockscoutAPI.getAddressTransactions(
        CONTRACTS.lendingPool,
        { limit: 10 }
      );

      setRecentActivity(recentTxs.items || []);

    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="protocol-analytics">
      <h2>Protocol Analytics</h2>

      {/* Pool Statistics */}
      <section className="pool-stats">
        <h3>Lending Pool</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Transactions</span>
            <span className="stat-value">{poolStats?.transactionCount || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Token Transfers</span>
            <span className="stat-value">{poolStats?.tokenTransferCount || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Pool Balance (ETH)</span>
            <span className="stat-value">
              {poolStats?.balance ? (parseInt(poolStats.balance) / 1e18).toFixed(4) : 0}
            </span>
          </div>
        </div>
      </section>

      {/* StakedPYUSD Statistics */}
      <section className="token-stats">
        <h3>StakedPYUSD Token</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Holders</span>
            <span className="stat-value">{tokenStats?.holderCount || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Transfers</span>
            <span className="stat-value">{tokenStats?.transferCount || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Supply</span>
            <span className="stat-value">
              {tokenStats?.totalSupply ? parseInt(tokenStats.totalSupply).toLocaleString() : 0}
            </span>
          </div>
        </div>

        {/* Top Holders */}
        <div className="top-holders">
          <h4>Top Holders</h4>
          <table>
            <thead>
              <tr>
                <th>Address</th>
                <th>Balance</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {tokenStats?.topHolders?.map((holder, index) => (
                <tr key={index}>
                  <td>
                    <a
                      href={`https://eth-sepolia.blockscout.com/address/${holder.address.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {holder.address.hash.substring(0, 10)}...
                    </a>
                  </td>
                  <td>{parseInt(holder.value).toLocaleString()}</td>
                  <td>{((holder.value / tokenStats.totalSupply) * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="recent-activity">
        <h3>Recent Pool Activity</h3>
        <div className="transaction-list">
          {recentActivity.map((tx, index) => (
            <div key={index} className="transaction-item">
              <div className="tx-info">
                <a
                  href={`https://eth-sepolia.blockscout.com/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tx.hash.substring(0, 16)}...
                </a>
                <span className="tx-method">{tx.method || 'Transfer'}</span>
              </div>
              <div className="tx-meta">
                <span className="tx-time">
                  {new Date(tx.timestamp).toLocaleString()}
                </span>
                <span className={`tx-status ${tx.status}`}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ProtocolAnalytics;
```

### 4. Event Logs Analytics

```javascript
// hooks/useContractEvents.js
import { useState, useEffect } from 'react';
import blockscoutAPI from '../api/blockscout';

export function useContractEvents(contractAddress, eventSignatures = []) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [contractAddress]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch event logs for contract
      const logs = await blockscoutAPI.getAddressLogs(contractAddress);

      // Parse and filter events
      const parsedEvents = logs.items?.map(log => ({
        txHash: log.tx_hash,
        blockNumber: log.block_number,
        timestamp: log.block_timestamp,
        topic0: log.topics?.[0], // Event signature
        topics: log.topics,
        data: log.data,
        decoded: log.decoded // If Blockscout has decoded it
      })) || [];

      // Filter by event signatures if provided
      const filteredEvents = eventSignatures.length > 0
        ? parsedEvents.filter(e => eventSignatures.includes(e.topic0))
        : parsedEvents;

      setEvents(filteredEvents);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, error, refetch: loadEvents };
}

// Usage example
function LendingEvents() {
  const LENDING_POOL = "0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A";

  // Example event signatures (replace with your actual event signatures)
  const EVENT_SIGNATURES = [
    '0x...', // Deposit event signature
    '0x...', // Borrow event signature
    '0x...', // Repay event signature
  ];

  const { events, loading, error } = useContractEvents(
    LENDING_POOL,
    EVENT_SIGNATURES
  );

  if (loading) return <div>Loading events...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="lending-events">
      <h3>Recent Lending Events</h3>
      {events.map((event, index) => (
        <div key={index} className="event-item">
          <span>Block: {event.blockNumber}</span>
          <span>Tx: {event.txHash.substring(0, 10)}...</span>
          <span>{new Date(event.timestamp).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
```

### 5. User Portfolio Component

```javascript
// components/UserPortfolio.jsx
import React, { useState, useEffect } from 'react';
import blockscoutAPI from '../api/blockscout';
import { useAccount } from 'wagmi'; // or your web3 library

const CONTRACTS = {
  stakedPYUSD: "0x9Fc31eE2Fa96d49207c2a3513F029F1f4eCf8699",
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
  loanNFT: "0xED425451e23239a8e5785d63659cE234067b47FA"
};

function UserPortfolio() {
  const { address } = useAccount(); // Get connected wallet address
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      loadPortfolio();
    }
  }, [address]);

  const loadPortfolio = async () => {
    try {
      setLoading(true);

      // Get user's token balances
      const balances = await blockscoutAPI.getAddressTokenBalances(address);

      // Find PYUSD and StakedPYUSD balances
      const pyusdBalance = balances.find(
        b => b.token.address.toLowerCase() === CONTRACTS.PYUSD.toLowerCase()
      );
      const stakedPyusdBalance = balances.find(
        b => b.token.address.toLowerCase() === CONTRACTS.stakedPYUSD.toLowerCase()
      );

      // Get user's NFTs (loans)
      const nfts = await blockscoutAPI.request(
        `/addresses/${address}/nft`,
        { type: 'ERC-721' }
      );

      const userLoans = nfts.items?.filter(
        nft => nft.token.address.toLowerCase() === CONTRACTS.loanNFT.toLowerCase()
      ) || [];

      // Get recent transactions
      const recentTxs = await blockscoutAPI.getAddressTransactions(address, {
        limit: 20
      });

      setPortfolio({
        pyusdBalance: pyusdBalance?.value || '0',
        stakedPyusdBalance: stakedPyusdBalance?.value || '0',
        activeLoans: userLoans.length,
        loans: userLoans,
        recentTransactions: recentTxs.items || []
      });

    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return <div>Connect wallet to view portfolio</div>;
  }

  if (loading) {
    return <div>Loading portfolio...</div>;
  }

  return (
    <div className="user-portfolio">
      <h2>My Portfolio</h2>

      {/* Balances */}
      <section className="balances">
        <h3>Token Balances</h3>
        <div className="balance-grid">
          <div className="balance-card">
            <span className="token-name">PYUSD</span>
            <span className="token-balance">
              {(parseInt(portfolio.pyusdBalance) / 1e6).toLocaleString()}
            </span>
          </div>
          <div className="balance-card">
            <span className="token-name">StakedPYUSD</span>
            <span className="token-balance">
              {(parseInt(portfolio.stakedPyusdBalance) / 1e6).toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {/* Active Loans */}
      <section className="loans">
        <h3>Active Loans ({portfolio.activeLoans})</h3>
        {portfolio.loans.length > 0 ? (
          <div className="loan-list">
            {portfolio.loans.map((loan, index) => (
              <div key={index} className="loan-card">
                <span>Loan NFT #{loan.id}</span>
                <a
                  href={`https://eth-sepolia.blockscout.com/token/${CONTRACTS.loanNFT}/instance/${loan.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Details
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p>No active loans</p>
        )}
      </section>

      {/* Recent Activity */}
      <section className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="transaction-list">
          {portfolio.recentTransactions.slice(0, 5).map((tx, index) => (
            <div key={index} className="transaction-item">
              <a
                href={`https://eth-sepolia.blockscout.com/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {tx.method || 'Transaction'}
              </a>
              <span className="tx-time">
                {new Date(tx.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default UserPortfolio;
```

### 6. Real-time Updates with Polling

```javascript
// hooks/useRealtimeData.js
import { useState, useEffect, useRef } from 'react';

export function useRealtimeData(fetchFunction, interval = 10000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const result = await fetchFunction();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up polling
    intervalRef.current = setInterval(fetchData, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval]);

  return { data, loading, error, refetch: fetchData };
}

// Usage example
function RealtimePoolStats() {
  const LENDING_POOL = "0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A";

  const { data: poolCounters, loading } = useRealtimeData(
    () => blockscoutAPI.getAddressCounters(LENDING_POOL),
    15000 // Update every 15 seconds
  );

  if (loading && !poolCounters) {
    return <div>Loading...</div>;
  }

  return (
    <div className="realtime-stats">
      <h3>Live Pool Statistics</h3>
      <p>Transactions: {poolCounters?.transactions_count || 0}</p>
      <p>Token Transfers: {poolCounters?.token_transfers_count || 0}</p>
      <small>Updates every 15 seconds</small>
    </div>
  );
}
```

---

## Best Practices

### 1. API Usage

**Rate Limiting**:
- Blockscout REST API is limited by IP address
- API keys not required for REST API but useful for JSON RPC
- Implement caching to reduce API calls
- Use pagination for large datasets

**Pagination**:
- Default limit: 50 items per request
- Use `next_page_params` for subsequent pages
- Implement infinite scroll or "Load More" for better UX

**Error Handling**:
```javascript
async function safeAPICall(apiFunction, fallbackValue = null) {
  try {
    return await apiFunction();
  } catch (error) {
    console.error('API call failed:', error);
    return fallbackValue;
  }
}
```

### 2. Performance Optimization

**Caching Strategy**:
```javascript
// Simple cache with TTL
class APICache {
  constructor(ttl = 60000) { // 1 minute default
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    const age = Date.now() - item.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

const apiCache = new APICache(30000); // 30 second cache

// Usage
async function getCachedAddressInfo(address) {
  const cacheKey = `address_${address}`;

  let data = apiCache.get(cacheKey);
  if (!data) {
    data = await blockscoutAPI.getAddress(address);
    apiCache.set(cacheKey, data);
  }

  return data;
}
```

**Parallel Requests**:
```javascript
// Load multiple contract stats in parallel
async function loadAllContractStats() {
  const [poolStats, tokenStats, nftStats] = await Promise.all([
    blockscoutAPI.getAddressCounters(CONTRACTS.lendingPool),
    blockscoutAPI.getTokenCounters(CONTRACTS.stakedPYUSD),
    blockscoutAPI.getToken(CONTRACTS.loanNFT)
  ]);

  return { poolStats, tokenStats, nftStats };
}
```

### 3. Data Visualization

**Use Appropriate Charts**:
- Line charts: Historical data (balance over time, transaction volume)
- Bar charts: Comparisons (deposits vs withdrawals, daily activity)
- Pie charts: Distribution (top holders, transaction types)
- Tables: Detailed data (transaction lists, holder rankings)

**Recommended Libraries**:
- Chart.js - Simple, flexible charts
- Recharts - React-native charts
- D3.js - Advanced, customizable visualizations
- ApexCharts - Modern, interactive charts

### 4. User Experience

**Loading States**:
```javascript
function DataComponent() {
  const { data, loading, error } = useData();

  if (loading) {
    return <Skeleton />; // Skeleton loader for better UX
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        retry={refetch}
      />
    );
  }

  return <DataDisplay data={data} />;
}
```

**Progressive Loading**:
1. Show critical data first (user balances, active loans)
2. Load analytics asynchronously
3. Fetch historical data in background
4. Cache aggressively

**Real-time Updates**:
- Use polling for frequently changing data (every 10-30 seconds)
- Consider WebSocket for instant updates (if Blockscout supports)
- Show "Last updated" timestamp
- Add manual refresh button

### 5. Security Considerations

**Address Validation**:
```javascript
import { isAddress } from 'ethers';

function validateAddress(address) {
  if (!address || !isAddress(address)) {
    throw new Error('Invalid Ethereum address');
  }
  return address.toLowerCase();
}
```

**Safe Data Display**:
```javascript
// Sanitize user-generated content
function SafeLink({ href, children }) {
  const sanitizedHref = href.startsWith('http')
    ? href
    : `https://eth-sepolia.blockscout.com${href}`;

  return (
    <a
      href={sanitizedHref}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
```

### 6. Mobile Responsiveness

The Blockscout SDK is mobile-responsive by default, but for custom components:

```css
/* Mobile-first responsive design */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### 7. Monitoring and Analytics

**Track Important Metrics**:
- API call success/failure rates
- Response times
- Cache hit rates
- User engagement (which features are used most)

```javascript
// Simple analytics wrapper
function trackAPICall(endpoint, success, duration) {
  // Send to your analytics platform
  console.log('API Call:', {
    endpoint,
    success,
    duration,
    timestamp: new Date().toISOString()
  });
}

async function monitoredAPICall(apiFunction, endpoint) {
  const startTime = Date.now();
  try {
    const result = await apiFunction();
    trackAPICall(endpoint, true, Date.now() - startTime);
    return result;
  } catch (error) {
    trackAPICall(endpoint, false, Date.now() - startTime);
    throw error;
  }
}
```

---

## Summary & Next Steps

### Quick Start Recommendations

**For Immediate Implementation** (1-2 days):
1. Install `@blockscout/app-sdk`
2. Add transaction toasts to your existing lending operations
3. Embed transaction history popup for user accounts
4. Link to Blockscout for detailed transaction views

**For Comprehensive Dashboard** (2-4 weeks):
1. Implement Blockscout API client
2. Build analytics dashboard with key metrics
3. Add charts for historical data visualization
4. Create user portfolio view
5. Implement real-time updates with polling

**For Custom Explorer** (5-10 minutes setup):
1. Go to https://deploy.blockscout.com/
2. Create account and purchase credits
3. Configure your Sepolia instance
4. Deploy and get custom branded explorer

### Resources

**Documentation**:
- Blockscout SDK: https://docs.blockscout.com/devs/blockscout-sdk
- Autoscout: https://docs.blockscout.com/using-blockscout/autoscout
- REST API: https://docs.blockscout.com/devs/apis/rest
- API v2 Swagger: https://github.com/blockscout/blockscout-api-v2-swagger

**Explorers**:
- Sepolia Blockscout: https://eth-sepolia.blockscout.com/
- API Docs: https://eth-sepolia.blockscout.com/api-docs

**Your Contracts on Blockscout**:
- LendingPool: https://eth-sepolia.blockscout.com/address/0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A
- LoanNFT: https://eth-sepolia.blockscout.com/address/0xED425451e23239a8e5785d63659cE234067b47FA
- StakedPYUSD: https://eth-sepolia.blockscout.com/address/0x9Fc31eE2Fa96d49207c2a3513F029F1f4eCf8699
- PYUSD: https://eth-sepolia.blockscout.com/address/0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9

**Support**:
- Discord: Join #autoscout channel for test credits and support
- GitHub: https://github.com/blockscout/blockscout

### Key Takeaways

1. **Blockscout SDK** provides the fastest way to add transaction tracking to your dApp (hours)
2. **REST API v2** offers comprehensive blockchain data for custom analytics (weeks)
3. **Autoscout** enables custom branded explorers without infrastructure hassle (minutes)
4. **Hybrid approach** recommended for best balance of speed and functionality
5. All tools work with Sepolia testnet and your deployed contracts
6. API is free to use, Autoscout costs $12-24/day for hosted infrastructure

---

**End of Report**

This comprehensive guide should provide everything needed to integrate Blockscout technologies into your lending protocol dashboard. Choose the approach that best fits your timeline and requirements.
