"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatUnits } from "viem";
import { CONTRACTS } from "@/config/contracts";
import { EthereumLendingPoolABI } from "@/lib/abis/EthereumLendingPool";

export default function BorrowPage() {
  const { address, isConnected } = useAccount();
  const [collateral, setCollateral] = useState("");
  const [liquidationRatio, setLiquidationRatio] = useState(60);
  const [shortRatio, setShortRatio] = useState(0);
  const [borrowAmount, setBorrowAmount] = useState("");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Get ETH price from contract
  const { data: ethPrice } = useReadContract({
    address: CONTRACTS.LendingPool,
    abi: EthereumLendingPoolABI,
    functionName: "getETHPrice",
  });

  // Calculate max borrow amount based on collateral and liquidation ratio
  const calculateMaxBorrow = () => {
    if (!collateral || !ethPrice) return "0";
    try {
      const collateralWei = parseEther(collateral);
      const collateralUSD = (collateralWei * ethPrice) / BigInt(10 ** 8); // ETH price has 8 decimals
      const maxBorrowWei = (collateralUSD * BigInt(liquidationRatio * 100)) / BigInt(10000);
      return formatUnits(maxBorrowWei, 6); // PYUSD has 6 decimals
    } catch {
      return "0";
    }
  };

  const handleBorrow = async () => {
    if (!collateral || !borrowAmount) return;

    try {
      await writeContract({
        address: CONTRACTS.LendingPool,
        abi: EthereumLendingPoolABI,
        functionName: "borrow",
        args: [
          BigInt(Math.floor(parseFloat(borrowAmount) * 10 ** 6)),
          BigInt(liquidationRatio * 100),
          BigInt(shortRatio * 100)
        ],
        value: parseEther(collateral),
      });
    } catch (error) {
      console.error("Borrow error:", error);
    }
  };

  const maxBorrow = calculateMaxBorrow();
  const healthFactor = collateral && borrowAmount && parseFloat(borrowAmount) > 0
    ? ((parseFloat(maxBorrow) / parseFloat(borrowAmount)) * 100).toFixed(2)
    : "0";

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
          <h2 className="text-4xl font-bold mb-8 text-center">Borrow PYUSD</h2>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {!isConnected ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Please connect your wallet to borrow PYUSD
                </p>
                <ConnectButton />
              </div>
            ) : (
              <>
                {/* Collateral Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">ETH Collateral</label>
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
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      ℹ️ <strong>Liquidation:</strong> If ETH price drops and your Health Factor falls below 1.0, liquidators can repay your debt and receive your collateral + <strong>0.1% bonus</strong>. Lower ratio = safer but less borrowing power.
                    </p>
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    ℹ️ Short positions hedge against ETH price drops but may incur losses if ETH rises
                  </p>
                </div>

                {/* Borrow Amount */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Borrow Amount (PYUSD)</label>
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

                {/* Borrow Button */}
                <button
                  onClick={handleBorrow}
                  disabled={!collateral || !borrowAmount || isPending || isConfirming}
                  className="w-full px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Confirming..." : isConfirming ? "Processing..." : "Borrow PYUSD"}
                </button>

                {isSuccess && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-800 dark:text-green-200">
                      ✅ Borrowed successfully! Check your loans in{" "}
                      <Link href="/my-loans" className="underline font-semibold">
                        My Loans
                      </Link>
                    </p>
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
