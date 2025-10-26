"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
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

  // Initialize Nexus SDK for cross-chain borrow (only on Arbitrum Sepolia)
  useEffect(() => {
    const initNexus = async () => {
      // Only initialize if connected to Arbitrum Sepolia and SDK not already initialized
      console.log('nexusSdk :',nexusSdk)
        if (
        chain?.id === arbitrumSepolia.id &&
        !nexusSdk &&
        typeof window !== "undefined" &&
        window.ethereum
      ) {
        try {
          console.log("Initializing Nexus SDK for cross-chain borrow...");
          const sdk = new NexusSDK({
            network: "testnet",debug: true,
          });
          await sdk.initialize(window.ethereum);
          setNexusSdk(sdk);

          console.log("✅ Nexus SDK initialized");
        } catch (err) {
          console.error("Failed to initialize Nexus SDK:", err);
        }
      }
    };
    initNexus();
  }, [chain?.id, nexusSdk]);

  // Get ETH price from Sepolia contract
  const { data: ethPrice } = useReadContract({
    address: CONTRACTS.LendingPool,
    abi: EthereumLendingPoolABI,
    functionName: "getETHPrice",
    chainId: sepolia.id,
  });

  // Calculate max borrow amount based on collateral and liquidation ratio
  const calculateMaxBorrow = () => {
    if (!collateral || !ethPrice || parseFloat(collateral) <= 0) return "0.00";
    try {
      const collateralWei = parseEther(collateral); // 18 decimals
      // Calculate collateral value in USD (ethPrice has 18 decimals)
      const collateralUSD = (collateralWei * ethPrice) / BigInt(10 ** 18); // Still has 18 decimals
      // Convert to PYUSD units (6 decimals) and apply liquidation ratio
      const maxBorrowPYUSD = (collateralUSD * BigInt(liquidationRatio)) / BigInt(100) / BigInt(10 ** 12); // Divide by 10^12 to go from 18 to 6 decimals
      const result = parseFloat(formatUnits(maxBorrowPYUSD, 6));
      // Format with commas and 2 decimal places
      return result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (error) {
      console.error("Max borrow calculation error:", error);
      return "0.00";
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

      console.log("🌉 Starting cross-chain execute...");
      console.log("Execute with:", collateral, "ETH from Arbitrum Sepolia → Sepolia");
      console.log("Borrow:", borrowAmount, "PYUSD");

      // Use Nexus SDK's execute for cross-chain operations with automatic chain abstraction
      const result = await nexusSdk.execute({
        toChainId: sepolia.id,
        contractAddress: CONTRACTS.LendingPool,
        contractAbi: EthereumLendingPoolABI,
        functionName: "borrow",
        buildFunctionParams: (token: any, amount: string, chainId: number, userAddress: `0x${string}`) => {
          console.log("📝 Building function params:", { token, amount, chainId, userAddress });
          return {
            functionParams: [
              pyusdAmount,
              BigInt(liquidationRatio * 100),
              BigInt(shortRatio * 100),
              userAddress, // onBehalfOf - NFT goes to original user
            ] as const,
            value: collateralWei.toString(), // ETH value for the transaction
          };
        },
        enableTransactionPolling: true,
        waitForReceipt: true,
        receiptTimeout: 120000,
      });

      if (result.executeTransactionHash) {
        setTxHash(result.executeTransactionHash);
        console.log("✅ Cross-chain borrow successful!");
        console.log("Execute TX:", result.executeTransactionHash);
        if (result.executeExplorerUrl) {
          console.log("Explorer:", result.executeExplorerUrl);
        }
      } else {
        throw new Error("Transaction failed - no execute hash");
      }
    } catch (err: any) {
      console.error("❌ Cross-chain borrow error:", err);

      // Better error messages for common issues
      if (err.message?.includes("Token contract address not found")) {
        setError("⚠️ Cross-chain ETH bridging is not available on testnet. Please switch to Sepolia network to borrow directly.");
      } else if (err.message?.includes("universe is not supported")) {
        setError("⚠️ Chain combination not supported. Please try direct borrow on Sepolia.");
      } else if (err.message?.includes("User denied")) {
        setError("Transaction cancelled by user.");
      } else if (err.message?.includes("Insufficient")) {
        setError("Insufficient balance. Please check your ETH balance on Arbitrum Sepolia.");
      } else {
        setError(err.message || "Cross-chain transaction failed. Please try again.");
      }
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
    ? (parseFloat(maxBorrow) / parseFloat(borrowAmount)).toFixed(2)
    : "0";

  // Get network display info
  const getNetworkInfo = () => {
    if (isCrossChain) {
      return {
        name: "Arbitrum Sepolia → Sepolia",
        description: "Cross-chain borrow via Avail Nexus",
        icon: "🌉",
        badgeClasses: "inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-600",
        nameClasses: "text-sm font-bold text-purple-800 dark:text-purple-200",
        descClasses: "text-xs text-purple-600 dark:text-purple-300",
      };
    } else if (isDirectBorrow) {
      return {
        name: "Sepolia",
        description: "Direct borrow on Sepolia",
        icon: "⚡",
        badgeClasses: "inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg border-2 border-indigo-300 dark:border-indigo-600",
        nameClasses: "text-sm font-bold text-indigo-800 dark:text-indigo-200",
        descClasses: "text-xs text-indigo-600 dark:text-indigo-300",
      };
    }
    return {
      name: "Unknown Network",
      description: "Please switch to Sepolia or Arbitrum Sepolia",
      icon: "⚠️",
      badgeClasses: "inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-900/20 rounded-lg border-2 border-gray-300 dark:border-gray-600",
      nameClasses: "text-sm font-bold text-gray-800 dark:text-gray-200",
      descClasses: "text-xs text-gray-600 dark:text-gray-300",
    };
  };

  const networkInfo = getNetworkInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Borrow: Get PYUSD Loan</h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
            {!isConnected ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Connect your wallet to borrow PYUSD
                </p>
                <w3m-button />
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
                <w3m-button />
              </div>
            ) : (
              <>
                {/* Network Info Banner for Cross-Chain */}
                {isCrossChain && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                      🌉 Cross-Chain Borrow Enabled
                    </h3>
                    <p className="text-sm text-purple-600 dark:text-purple-300 mb-2">
                      ETH will be bridged from Arbitrum Sepolia to Sepolia and automatically borrow PYUSD.
                    </p>
                    <div className="flex items-center justify-between text-sm mt-2 text-purple-700 dark:text-purple-300">
                      <div>
                        <span className="font-semibold">From:</span> Arbitrum Sepolia
                      </div>
                      <span className="text-2xl">→</span>
                      <div>
                        <span className="font-semibold">To:</span> Sepolia
                      </div>
                    </div>
                  </div>
                )}

                {/* Collateral Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    ETH Collateral {isCrossChain && "((from Arbitrum Sepolia))"}
                  </label>
                  <input
                    type="number"
                    value={collateral}
                    onChange={(e) => setCollateral(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    step="0.01"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ETH Price: ${ethPrice ? Number(formatUnits(ethPrice, 18)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Loading..."}
                  </p>
                </div>

                {/* Liquidation Ratio Slider */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
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
                    <span>80% (Danger)</span>
                  </div>
                </div>

                {/* Short Ratio Slider */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
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
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Borrow Amount (PYUSD)
                  </label>
                  <input
                    type="number"
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    step="0.01"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Max Borrow: {maxBorrow} PYUSD
                  </p>
                  <button
                    onClick={() => setBorrowAmount(maxBorrow)}
                    className="text-sm text-indigo-600 dark:text-indigo-400 mt-1 hover:underline"
                  >
                    Max
                  </button>
                </div>

                {/* Stats */}
                <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Health Factor</p>
                      <p className={`text-2xl font-bold ${
                        parseFloat(healthFactor) >= 1.5 ? "text-green-600 dark:text-green-400" :
                        parseFloat(healthFactor) >= 1.2 ? "text-yellow-600 dark:text-yellow-400" :
                        "text-red-600 dark:text-red-400"
                      }`}>
                        {healthFactor}x
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {parseFloat(healthFactor) >= 1.5 ? "Safe" : parseFloat(healthFactor) >= 1.2 ? "Warning" : "Danger"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Liquidation Ratio</p>
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {liquidationRatio}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Short Position</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
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
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                  } text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
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
                      ✅ {isCrossChain ? "Cross-Chain Borrow" : "Borrow"} Successful!
                    </p>
                    {txHash && (
                      <>
                        <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                          Loan Position NFT has been minted on Sepolia
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
                      View My Positions →
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
