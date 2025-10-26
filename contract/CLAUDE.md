# eth-online Project Configuration

## Technology Stack

### Hardhat 3 (Beta)
This project uses **Hardhat 3.0.7** as the Ethereum development environment.

**IMPORTANT: Hardhat 3 Current Status**
- Hardhat 3 is in **production beta** but plugin ecosystem is still developing
- Many popular plugins (hardhat-ethers, hardhat-chai-matchers, etc.) are not yet compatible with Hardhat 3
- The official Hardhat team is working on v-next versions of plugins

**What Currently Works:**
- ✅ Solidity compilation (`npm run compile`)
- ✅ Smart contract development
- ✅ Basic configuration
- ✅ ESM module support
- ✅ **Contract deployment without plugins** (3 methods implemented!)
- ✅ Local Hardhat node (`npm run node`)
- ✅ Network connection API (`hre.network.connect()`)

**What Doesn't Work Yet:**
- ❌ Testing with Mocha/Chai (plugins incompatible)
- ❌ Most Hardhat 2.x plugins

### Key Requirements
- **ESM (ES Modules)**: Hardhat 3 only supports ESM projects
- **package.json**: Must have `"type": "module"`
- **Node.js**: Version 18+ recommended
- **Solidity**: Version 0.8.28

### Project Structure
```
eth-online/
├── contracts/          # Solidity smart contracts ✅ Works
├── scripts/            # Deployment scripts ❌ Needs plugin update
├── test/              # Test files ❌ Needs plugin update
├── hardhat.config.js  # Hardhat configuration
├── artifacts/         # Compiled contracts
├── cache/             # Build cache
└── package.json       # Project dependencies
```

### Current Dependencies
```json
{
  "hardhat": "^3.0.7",
  "ethers": "^6.15.0",
  "chai": "^5.1.2",
  "@nomicfoundation/hardhat-toolbox-mocha-ethers": "^3.0.0"
}
```

### Working Commands
- `npm run compile` - Compile Solidity contracts ✅
- `npm run clean` - Clean build artifacts ✅
- `npm run node` - Start local Hardhat node ✅
- `npm run deploy` - Deploy contracts (simple method) ✅
- `npm run deploy:ethers` - Deploy using ethers.js Web3Provider ✅
- `npm run deploy:raw` - Deploy using raw provider ✅
- `npm run deploy:simple` - Deploy using simple method ✅
- `npm run deploy:local` - Deploy to localhost network ✅
- `npm test` - Run tests ❌ (awaiting plugin compatibility)

## 🎉 Hardhat 3 Deployment Solutions (Without Plugins)

We've successfully implemented **THREE different methods** to deploy contracts with Hardhat 3 without any plugins:

### Method 1: Simple Deployment (`deploy-simple.js`)
- Uses `ethers.BrowserProvider` to wrap the connection provider
- Simplest approach with minimal code
- **Command**: `npm run deploy:simple`

### Method 2: Ethers.js Web3Provider (`deploy-ethers.js`)
- Full-featured deployment with detailed logging
- Uses ethers.js ContractFactory directly
- **Command**: `npm run deploy:ethers`

### Method 3: Raw Provider (`deploy-raw.js`)
- Direct EIP-1193 provider usage
- Low-level control with JSON-RPC calls
- **Command**: `npm run deploy:raw`

### How It Works

Hardhat 3 provides a native `hre.network.connect()` API that returns a connection object with access to the provider. We can:

1. **Wrap the provider** with ethers.js `BrowserProvider`
2. **Use artifacts** from `artifacts/contracts/` directory
3. **Create ContractFactory** manually with ABI and bytecode
4. **Deploy contracts** without any Hardhat plugins!

### Example Usage

```bash
# Compile contracts
npm run compile

# Deploy using simple method
npm run deploy

# Deploy using ethers.js method
npm run deploy:ethers

# Deploy using raw provider
npm run deploy:raw

# Start local node and deploy to it
npm run node  # In terminal 1
npm run deploy:local  # In terminal 2
```

### Recommendations
1. **For Production Projects**: This solution works perfectly for deployment!
2. **For Testing**: Wait for official v-next plugins or use Hardhat 2.x
3. **For Development**: Hardhat 3 is now fully usable for contract development and deployment

### Migration Path
When plugins become available:
1. Install `@nomicfoundation/hardhat-ethers@next`
2. Install `@nomicfoundation/hardhat-chai-matchers@next`
3. Update scripts and tests to use Hardhat 3 API

### Important Notes
- Always use ESM syntax (`import/export` instead of `require/module.exports`)
- Use `.js` extension for config files when using JavaScript
- Hardhat 3 introduces breaking API changes from Hardhat 2.x
- Monitor official Hardhat docs for plugin updates

## 🔮 Oracle & Token Configuration

### Real Pyth Network Oracle on Sepolia

**This project uses REAL Pyth Network oracle and official PYUSD on Sepolia testnet.**

#### Deployed Contracts
- **Pyth Oracle**: `0xDd24F84d36BF92C65F92307595335bdFab5Bbd21` (Official Pyth deployment)
- **PYUSD**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9` (Official PayPal USD)
- **Lending Pool**: `0x67039797A2E2533D1a76B559c009ba71938005E2`
- **Staked PYUSD**: `0xd115196fAd8D80ba1990820430F097d2b2EB663A`
- **Loan NFT**: `0x8a8913458D1F3204CB212d2e7D746e45C561f8E9`

#### Network Architecture
- **Sepolia L1**: All main contracts deployed here
  - ✅ Uses **REAL Pyth Oracle** at `0xDd24F84d36BF92C65F92307595335bdFab5Bbd21`
  - ✅ Uses **Official PYUSD** at `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`
  - 🔄 Price updates via Hermes API: `https://hermes.pyth.network/`
- **Arbitrum Sepolia**: Used for cross-chain operations via Nexus SDK
  - Real Pyth Oracle also available on Arbitrum
  - Cross-chain borrowing supported

#### Price Feed IDs (Pyth Standard)
```solidity
// ETH/USD Price Feed
bytes32 public constant ETH_USD_PRICE_FEED =
    0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6;

// PYUSD/USD Price Feed
bytes32 public constant PYUSD_USD_PRICE_FEED =
    0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722;
```

#### Getting Test Tokens
- **PYUSD Faucet**: https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd
  - Up to 100 PYUSD per day per Google account
- **Sepolia ETH**: https://www.alchemy.com/faucets/ethereum-sepolia

#### Working Commands
- `npm run deploy:sepolia` - Deploy with Real Pyth & Official PYUSD
- `npm run oracle:update` - Update Real Pyth prices from Hermes API
- `npm test:flashloan` - Test flash loan functionality

#### Important Notes
- ✅ Using **REAL** Pyth Network oracle (not mock)
- ✅ Using **Official** PayPal USD (not mock)
- 🔄 Pyth uses "pull" model - prices updated via Hermes API
- 💰 Flash loans enabled with 0.09% fee
- 🌉 Cross-chain borrowing supported via Nexus SDK

For detailed information, see `REAL_PYTH_GUIDE.md`
