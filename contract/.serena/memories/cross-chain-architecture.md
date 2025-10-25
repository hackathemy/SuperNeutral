# Cross-Chain Borrow Architecture

## Overview
Enable users to borrow PYUSD from Arbitrum Sepolia by bridging ETH to Sepolia and executing the borrow function using Avail Nexus SDK.

## Architecture Design

### No Contract Changes Needed!
- Sepolia contracts already support `onBehalfOf` parameter
- No new contracts or modifications required
- Pure frontend integration

### Flow
1. **User Action**: User initiates borrow from Arbitrum Sepolia
2. **Bridge**: Nexus SDK bridges ETH from Arbitrum Sepolia → Sepolia
3. **Execute**: After bridging, automatically executes `borrow()` on Sepolia
4. **Result**: Loan NFT minted to original user via `onBehalfOf` parameter

### Nexus SDK API

```typescript
interface BridgeAndExecuteParams {
  toChainId: SUPPORTED_CHAINS_IDS;  // Sepolia chain ID
  token: 'ETH';                     // Bridge ETH
  amount: string;                   // ETH collateral amount
  execute?: {
    contractAddress: string;        // EthereumLendingPool address
    contractAbi: Abi;              // LendingPool ABI
    functionName: 'borrow';
    buildFunctionParams: DynamicParamBuilder;  // Dynamic params builder
    value: string;                  // ETH value for payable function
  }
}

type DynamicParamBuilder = (
  token: SUPPORTED_TOKENS,
  amount: string,
  chainId: SUPPORTED_CHAINS_IDS,
  userAddress: `0x${string}`
) => {
  functionParams: readonly unknown[];  // [pyusdAmount, liquidationRatio, shortRatio, onBehalfOf]
  value: string;                       // ETH collateral in wei
};
```

### Supported Chains
- **Source**: Arbitrum Sepolia (421614)
- **Destination**: Sepolia (11155111)
- Both supported by Nexus SDK

### Key Implementation Points
1. Use `bridgeAndExecute()` for atomic operation
2. `buildFunctionParams` creates params dynamically after bridge
3. `onBehalfOf` ensures NFT goes to original user
4. `value` parameter sends ETH collateral to borrow function

### Benefits
- ✅ Truly cross-chain borrowing
- ✅ No contract modifications needed
- ✅ Atomic bridge + execute operation
- ✅ Users can borrow from any supported chain
- ✅ Leverages Avail's messaging infrastructure
