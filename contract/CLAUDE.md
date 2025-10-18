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
