# ETH Lending Protocol - Frontend

Next.js frontend for the ETH Lending Protocol, allowing users to borrow PYUSD using ETH as collateral.

## Features

- 🏦 **Borrow PYUSD**: Deposit ETH as collateral and borrow PYUSD stablecoin
- 🎫 **NFT Positions**: Your loans are represented as transferable ERC-721 NFTs
- 💰 **Supply Liquidity**: Earn interest by supplying PYUSD to the lending pool
- 📊 **Dashboard**: View your loan positions, health factors, and statistics
- 🔗 **Web3 Wallet**: Connect with MetaMask, WalletConnect, and other wallets via RainbowKit

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **wagmi** - React hooks for Ethereum
- **viem** - TypeScript Ethereum library
- **RainbowKit** - Wallet connection UI

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MetaMask or another Web3 wallet
- Sepolia testnet ETH

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

1. **WalletConnect Project ID** (Optional but recommended):
   - Get a project ID from [WalletConnect Cloud](https://cloud.walletconnect.com)
   - Update `src/config/wagmi.ts`:
     ```typescript
     projectId: "YOUR_PROJECT_ID_HERE"
     ```

2. **Contract Addresses**:
   - All contract addresses are configured in `src/config/contracts.ts`
   - Current deployment is on Sepolia testnet:
     - LendingPool: `0x85bC044735c3FE64CE287Fc4bB92e0a9c85ee72C`
     - LoanNFT: `0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529`
     - MockPYUSD: `0x57391875ce6340E5ED878752A30D080f31B63934`

## Usage

### 1. Get Test PYUSD

Visit the [MockPYUSD contract on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x57391875ce6340E5ED878752A30D080f31B63934#writeContract) and call the `faucet()` function to get 10,000 test PYUSD.

### 2. Supply Liquidity (Optional)

If you want to supply PYUSD to the pool:
1. Go to the **Supply** page
2. Approve PYUSD spending
3. Supply desired amount

### 3. Borrow PYUSD

1. Go to the **Borrow** page
2. Enter ETH collateral amount
3. Select liquidation ratio (50-80%)
4. Enter borrow amount (or click "Use Max")
5. Click "Borrow PYUSD" and confirm transaction

### 4. Manage Loans

View and manage your loans on the **My Loans** page:
- Repay debt
- Add more collateral
- Monitor health factor

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js pages
│   │   ├── page.tsx      # Homepage
│   │   ├── borrow/       # Borrow page
│   │   ├── my-loans/     # Loan management
│   │   └── supply/       # Supply liquidity
│   ├── components/       # React components
│   │   └── Providers.tsx # Web3 providers
│   ├── config/           # Configuration
│   │   ├── wagmi.ts      # Web3 config
│   │   └── contracts.ts  # Contract addresses
│   └── lib/
│       └── abis/         # Contract ABIs
├── public/               # Static assets
└── package.json
```

## Smart Contract Integration

The frontend integrates with three main contracts:

1. **EthereumLendingPool**: Main lending protocol logic
2. **EthereumLoanNFT**: ERC-721 NFTs representing loan positions
3. **MockPYUSD**: Mock PYUSD token (6 decimals)

Contract ABIs are automatically extracted from `../artifacts/` during setup.

## Network

Currently deployed on **Sepolia Testnet**:
- Chain ID: 11155111
- RPC: Uses default RPC from wagmi/viem

## Build for Production

```bash
# Build the app
npm run build

# Start production server
npm start
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Troubleshooting

### Wallet Connection Issues
- Make sure you're on Sepolia testnet
- Check that MetaMask is unlocked
- Try refreshing the page

### Transaction Failures
- Ensure you have enough Sepolia ETH for gas
- Check that you've approved PYUSD spending (for supply/repay)
- Verify loan health factor before operations

### Health Factor Warnings
- Health factor below 120% is risky
- Add more collateral or repay debt to improve health factor
- Liquidation occurs when collateral value drops below your chosen liquidation ratio

## Links

- [Lending Pool Contract](https://sepolia.etherscan.io/address/0x85bC044735c3FE64CE287Fc4bB92e0a9c85ee72C)
- [Loan NFT Contract](https://sepolia.etherscan.io/address/0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529)
- [Mock PYUSD Contract](https://sepolia.etherscan.io/address/0x57391875ce6340E5ED878752A30D080f31B63934)

## License

MIT
