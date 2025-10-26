# ETH Lending Protocol

A decentralized lending protocol that allows users to borrow PYUSD stablecoin using ETH as collateral, with automatic yield generation through LIDO staking.

#### [Demo](https://super-neutral.vercel.app/) | [Pitchdeck](https://www.figma.com/deck/mHroCpTInQ4ewK8IOBOO0G)

## 🌟 Features

- **Borrow PYUSD**: Use ETH as collateral to borrow PYUSD stablecoin
- **Flexible Liquidation Ratios**: Choose between 50-80% liquidation ratio based on your risk tolerance
- **NFT Loan Positions**: Each loan is represented as an ERC-721 NFT that can be transferred or traded
- **sPYUSD (Staked PYUSD)**: Interest-bearing token that automatically increases in value
- **Short Position Hedging**: Optional 0-30% short position to hedge against ETH price drops
- **Automatic Yield**: Deposited ETH generates staking rewards through LIDO
- **Liquidation Bonus**: 0.1% bonus for liquidators to ensure healthy protocol operation

## 📊 Protocol Stats

- **Network**: Sepolia Testnet
- **Total Value Locked**: Dynamic
- **Exchange Rate**: Real-time sPYUSD appreciation
- **Liquidation Bonus**: 0.1%

## 🏗️ Architecture

### Smart Contracts

- **EthereumLendingPool**: Main lending pool contract
  - Address: `0xe27462f8F471335cEa75Ea76BDDb05189cd599d4`
  - [View on Etherscan](https://sepolia.etherscan.io/address/0xe27462f8F471335cEa75Ea76BDDb05189cd599d4)

- **StakedPYUSD**: Interest-bearing ERC-20 token
  - Address: `0x48D54257dE5824fd2D19e8315709B92D474b0E05`
  - [View on Etherscan](https://sepolia.etherscan.io/address/0x48D54257dE5824fd2D19e8315709B92D474b0E05)

- **EthereumLoanNFT**: ERC-721 loan position NFT
  - Address: `0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529`
  - [View on Etherscan](https://sepolia.etherscan.io/address/0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529)

### Technology Stack

- **Smart Contracts**: Solidity 0.8.28, Hardhat 3.0.7, OpenZeppelin 5.0.1
- **Frontend**: Next.js 15, React 19, TypeScript
- **Web3**: wagmi v2, viem, RainbowKit
- **Oracle**: Pyth Network
- **Staking**: LIDO (Mock on testnet)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or another Web3 wallet
- Sepolia testnet ETH

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd eth-online

# Install dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your environment variables:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Compile Contracts

```bash
npm run compile
```

### Deploy Contracts

```bash
# Deploy to Sepolia testnet
npm run deploy:updated

# Deploy locally for testing
npm run node  # In one terminal
npm run deploy:local  # In another terminal
```

### Run Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to interact with the protocol.

## 📖 How It Works

### For Lenders (Liquidity Providers)

1. **Supply PYUSD**: Deposit PYUSD into the protocol
2. **Receive sPYUSD**: Get interest-bearing sPYUSD tokens
3. **Earn Interest**: sPYUSD automatically increases in value as borrowers pay interest
4. **Withdraw**: Burn sPYUSD to receive PYUSD + earned interest

**Example**:
```
Day 0:   Supply 10,000 PYUSD → Receive 10,000 sPYUSD
Day 30:  Exchange Rate = 1.05
         Your 10,000 sPYUSD = 10,500 PYUSD (5% gain)
Day 60:  Exchange Rate = 1.10
         Your 10,000 sPYUSD = 11,000 PYUSD (10% gain)
```

### For Borrowers

1. **Deposit ETH**: Provide ETH as collateral
2. **Choose Parameters**:
   - Liquidation Ratio (50-80%)
   - Short Position Ratio (0-30%)
3. **Borrow PYUSD**: Receive PYUSD stablecoin
4. **Repay + Interest**: Pay back to retrieve collateral
5. **NFT Position**: Your loan is an NFT you can transfer

**Liquidation Example**:
```
Loan: 1 ETH @ $2,000 = $2,000 collateral
Borrow: $1,000 PYUSD (50% LTV)
Liquidation Ratio: 50%

Safe Zone: ETH price > $1,000 (50% drop tolerance)
Liquidation: ETH price drops to $1,000
Result: Liquidator repays debt, receives collateral + 0.1% bonus
```

## 🔐 Security Features

- ✅ **ReentrancyGuard**: Protection against reentrancy attacks
- ✅ **Pausable**: Emergency pause functionality
- ✅ **Ownable**: Admin access control
- ✅ **Input Validation**: Comprehensive parameter checks
- ✅ **Safe Math**: Solidity 0.8.28 overflow protection
- ✅ **Liquidation Bonus**: Incentivizes healthy protocol operation

## 🧪 Testing

```bash
# Run tests (when plugins are available)
npm test

# Test on Sepolia
npm run test:sepolia
npm run test:borrow
npm run test:liquidation
```

## 📚 Documentation

- [Lending Protocol Overview](./lending-protocol-overview.md)
- [sPYUSD Deployment Summary](./claudedocs/spyusd-deployment-summary.md)
- [Contract-Frontend Verification](./claudedocs/contract-frontend-verification.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## ⚠️ Disclaimer

This is a testnet deployment for educational and testing purposes only. Do not use with real funds on mainnet without proper auditing and testing.

## 🔗 Links

- **Frontend**: [http://localhost:3000](http://localhost:3000) (local development)
- **Sepolia Etherscan**: [https://sepolia.etherscan.io](https://sepolia.etherscan.io)
- **Pyth Network**: [https://pyth.network](https://pyth.network)
- **LIDO**: [https://lido.fi](https://lido.fi)

## 📞 Support

For questions and support, please open an issue in the repository.

---

Built with ❤️ for ETH Online Hackathon
