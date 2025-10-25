"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatUnits } from "viem";
import { sepolia, arbitrumSepolia } from "wagmi/chains";
import { CONTRACTS } from "@/config/contracts";
import { EthereumLendingPoolABI } from "@/lib/abis/EthereumLendingPool";
import { NexusSDK } from "@avail-project/nexus";

export default function BorrowPage() {
  const { address, isConnected, chain } = useAccount();
  const [collateral, setCollateral] = useState("");
  const [liquidationRatio, setLiquidationRatio] = useState(60);
  const [shortRatio, setShortRatio] = useState(0);
  const [borrowAmount, setBorrowAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [nexusSdk, setNexusSdk] = useState<any>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Determine if cross-chain borrow is needed
  const isCrossChain = chain?.id === arbitrumSepolia.id;
  const isDirectBorrow = chain?.id === sepolia.id;

  // Initialize Nexus SDK for cross-chain borrow
  useEffect(() => {
    const initNexus = async () => {
      if (isCrossChain && typeof window !== "undefined" && window.ethereum) {
        try {
          const sdk = new NexusSDK({
            network: "testnet" as any,
          });
          await sdk.initialize(window.ethereum);
          setNexusSdk(sdk);
        } catch (err) {
          console.error("Failed to initialize Nexus SDK:", err);
        }
      }
    };
    initNexus();
  }, [isCrossChain]);

  // Get ETH price from Sepolia contract
  const { data: ethPrice } = useReadContract({
    address: CONTRACTS.LendingPool,
    abi: EthereumLendingPoolABI,
    functionName: "getETHPrice",
    chainId: sepolia.id,
  });

  // Calculate max borrow amount based on collateral and liquidation ratio
  const calculateMaxBorrow = () => {
    if (!collateral || !ethPrice) return "0";
    try {
      const collateralWei = parseEther(collateral);
      const collateralUSD = (collateralWei * ethPrice) / BigInt(10 ** 8);
      const maxBorrowWei = (collateralUSD * BigInt(liquidationRatio * 100)) / BigInt(10000);
      return formatUnits(maxBorrowWei, 6);
    } catch {
      return "0";
    }
  };

  // Direct borrow on Sepolia
  const handleDirectBorrow = async () => {
    if (!collateral || !borrowAmount || !address) return;

    try {
      await writeContract({
        address: CONTRACTS.LendingPool,
        abi: EthereumLendingPoolABI,
        functionName: "borrow",
        args: [
          BigInt(Math.floor(parseFloat(borrowAmount) * 10 ** 6)),
          BigInt(liquidationRatio * 100),
          BigInt(shortRatio * 100),
          address, // onBehalfOf - use connected address
        ] as const,
        value: parseEther(collateral),
        gas: BigInt(1000000), // Set reasonable gas limit for Sepolia
      });
    } catch (error) {
      console.error("Direct borrow error:", error);
      setError("Transaction failed. Please try again.");
    }
  };

  // Cross-chain borrow from Arbitrum Sepolia
  const handleCrossChainBorrow = async () => {
    if (!collateral || !borrowAmount || !nexusSdk || !address) return;

    setIsProcessing(true);
    setError("");
    setTxHash("");

    try {
      const collateralWei = parseEther(collateral);
      const pyusdAmount = BigInt(Math.floor(parseFloat(borrowAmount) * 10 ** 6));

      // Use Nexus SDK's bridgeAndExecute
      const result = await nexusSdk.bridgeAndExecute({
        toChainId: sepolia.id,
        token: "ETH" as any,
        amount: collateral,
        execute: {
          contractAddress: CONTRACTS.LendingPool,
          contractAbi: EthereumLendingPoolABI,
          functionName: "borrow",
          buildFunctionParams: (token: any, bridgedAmount: string, chainId: number, userAddress: `0x${string}`) => {
            return {
              functionParams: [
                pyusdAmount,
                BigInt(liquidationRatio * 100),
                BigInt(shortRatio * 100),
                userAddress, // onBehalfOf - NFT goes to original user
              ] as const,
              value: collateralWei.toString(),
            };
          },
          value: collateralWei.toString(),
          enableTransactionPolling: true,
          waitForReceipt: true,
          receiptTimeout: 120000,
        },
      });

      if (result.executeTransactionHash) {
        setTxHash(result.executeTransactionHash);
        console.log("✅ Cross-chain borrow successful!");
        console.log("Execute TX:", result.executeTransactionHash);
      } else {
        throw new Error("Transaction failed - no execute hash");
      }
    } catch (err: any) {
      console.error("Cross-chain borrow error:", err);
      setError(err.message || "Cross-chain transaction failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBorrow = () => {
    if (isCrossChain) {
      return handleCrossChainBorrow();
    } else {
      return handleDirectBorrow();
    }
  };

  const maxBorrow = calculateMaxBorrow();
  const healthFactor = collateral && borrowAmount && parseFloat(borrowAmount) > 0
    ? ((parseFloat(maxBorrow) / parseFloat(borrowAmount)) * 100).toFixed(2)
    : "0";

  // Get network display info
  const getNetworkInfo = () => {
    if (isCrossChain) {
      return {
        name: "Arbitrum Sepolia → Sepolia",
        color: "purple",
        description: "Cross-chain borrow via Avail Nexus",
        icon: "🌉",
      };
    } else if (isDirectBorrow) {
      return {
        name: "Sepolia",
        color: "indigo",
        description: "Direct borrow on Sepolia",
        icon: "⚡",
      };
    }
    return {
      name: "Unknown Network",
      color: "gray",
      description: "Please switch to Sepolia or Arbitrum Sepolia",
      icon: "⚠️",
    };
  };

  const networkInfo = getNetworkInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer">
              ETH Lending Protocol
            </h1>
          </Link>
          <ConnectButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-4xl font-bold mb-4">Borrow PYUSD</h2>
            {isConnected && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 bg-${networkInfo.color}-100 dark:bg-${networkInfo.color}-900/20 rounded-lg border-2 border-${networkInfo.color}-300 dark:border-${networkInfo.color}-600`}>
                <span className="text-lg">{networkInfo.icon}</span>
                <div className="text-left">
                  <p className={`text-sm font-bold text-${networkInfo.color}-800 dark:text-${networkInfo.color}-200`}>
                    {networkInfo.name}
                  </p>
                  <p className={`text-xs text-${networkInfo.color}-600 dark:text-${networkInfo.color}-300`}>
                    {networkInfo.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {!isConnected ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Please connect your wallet to borrow PYUSD
                </p>
                <ConnectButton />
              </div>
            ) : !isDirectBorrow && !isCrossChain ? (
              <div className="text-center py-8">
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 mb-2">
                    ⚠️ Unsupported Network
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-300">
                    Please switch to Sepolia or Arbitrum Sepolia to borrow PYUSD
                  </p>
                </div>
                <ConnectButton />
              </div>
            ) : (
              <>
                {/* Network Info Banner for Cross-Chain */}
                {isCrossChain && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                      🌉 Cross-Chain Borrow Active
                    </h3>
                    <p className="text-sm text-purple-600 dark:text-purple-300 mb-2">
                      Your ETH will be bridged from Arbitrum Sepolia to Sepolia, then automatically borrow PYUSD.
                    </p>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <div>
                        <span className="font-semibold">Source:</span> Arbitrum Sepolia
                      </div>
                      <span className="text-2xl">→</span>
                      <div>
                        <span className="font-semibold">Destination:</span> Sepolia
                      </div>
                    </div>
                  </div>
                )}

                {/* Collateral Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    ETH Collateral {isCrossChain && "(from Arbitrum Sepolia)"}
                  </label>
                  <input
                    type="number"
                    value={collateral}
                    onChange={(e) => setCollateral(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                    step="0.01"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ETH Price: ${ethPrice ? formatUnits(ethPrice, 8) : "Loading..."}
                  </p>
                </div>

                {/* Liquidation Ratio Slider */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Liquidation Ratio: {liquidationRatio}%
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="80"
                    value={liquidationRatio}
                    onChange={(e) => setLiquidationRatio(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>50% (Safe)</span>
                    <span>80% (Risky)</span>
                  </div>
                </div>

                {/* Short Ratio Slider */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Short Position Ratio: {shortRatio}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={shortRatio}
                    onChange={(e) => setShortRatio(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0% (No Short)</span>
                    <span>30% (Max Short)</span>
                  </div>
                </div>

                {/* Borrow Amount */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Borrow Amount (PYUSD on Sepolia)
                  </label>
                  <input
                    type="number"
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                    step="0.01"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Max Borrow: {maxBorrow} PYUSD
                  </p>
                  <button
                    onClick={() => setBorrowAmount(maxBorrow)}
                    className="text-sm text-indigo-600 dark:text-indigo-400 mt-1 hover:underline"
                  >
                    Use Max
                  </button>
                </div>

                {/* Stats */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Health Factor</p>
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {healthFactor}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Liquidation At</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {liquidationRatio}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Short Position</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {shortRatio}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-800 dark:text-red-200">❌ {error}</p>
                  </div>
                )}

                {/* Borrow Button */}
                <button
                  onClick={handleBorrow}
                  disabled={
                    !collateral ||
                    !borrowAmount ||
                    isPending ||
                    isConfirming ||
                    isProcessing ||
                    (isCrossChain && !nexusSdk)
                  }
                  className={`w-full px-8 py-4 ${
                    isCrossChain
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  } text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isCrossChain && !nexusSdk
                    ? "Initializing Nexus SDK..."
                    : isPending || isProcessing
                      ? "Confirming..."
                      : isConfirming
                        ? "Processing..."
                        : isCrossChain
                          ? "Bridge ETH & Borrow PYUSD"
                          : "Borrow PYUSD"}
                </button>

                {/* Success Display */}
                {(isSuccess || txHash) && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-800 dark:text-green-200 mb-2">
                      ✅ {isCrossChain ? "Cross-chain borrow" : "Borrow"} successful!
                    </p>
                    {txHash && (
                      <>
                        <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                          Your loan NFT has been minted on Sepolia
                        </p>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-green-600 dark:text-green-400 hover:underline block mb-2"
                        >
                          View on Sepolia Etherscan →
                        </a>
                      </>
                    )}
                    <Link href="/my-loans" className="text-sm text-green-600 dark:text-green-400 hover:underline font-semibold">
                      View My Loans →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
