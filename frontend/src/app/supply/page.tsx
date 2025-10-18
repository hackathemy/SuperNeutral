"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CONTRACTS } from "@/config/contracts";
import { EthereumLendingPoolABI } from "@/lib/abis/EthereumLendingPool";
import { MockPYUSDABI } from "@/lib/abis/MockPYUSD";
import { StakedPYUSDABI } from "@/lib/abis/StakedPYUSD";

export default function SupplyPage() {
  const { address, isConnected } = useAccount();
  const [supplyAmount, setSupplyAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"supply" | "withdraw">("supply");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Get user's PYUSD balance
  const { data: pyusdBalance } = useReadContract({
    address: CONTRACTS.MockPYUSD,
    abi: MockPYUSDABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Get user's sPYUSD balance
  const { data: spyusdBalance, refetch: refetchSpyusd } = useReadContract({
    address: CONTRACTS.StakedPYUSD,
    abi: StakedPYUSDABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Get sPYUSD value in PYUSD
  const { data: spyusdValueInPYUSD } = useReadContract({
    address: CONTRACTS.StakedPYUSD,
    abi: StakedPYUSDABI,
    functionName: "balanceInPYUSD",
    args: address ? [address] : undefined,
  });

  // Get exchange rate
  const { data: exchangeRate } = useReadContract({
    address: CONTRACTS.StakedPYUSD,
    abi: StakedPYUSDABI,
    functionName: "exchangeRate",
  });

  // Get pool stats
  const { data: totalSupplied } = useReadContract({
    address: CONTRACTS.LendingPool,
    abi: EthereumLendingPoolABI,
    functionName: "totalSupplied",
  });

  const { data: totalBorrowed } = useReadContract({
    address: CONTRACTS.LendingPool,
    abi: EthereumLendingPoolABI,
    functionName: "totalBorrowed",
  });

  // Calculate sPYUSD to mint for supply amount
  const { data: spyusdToMint } = useReadContract({
    address: CONTRACTS.StakedPYUSD,
    abi: StakedPYUSDABI,
    functionName: "calculateMintAmount",
    args: supplyAmount ? [BigInt(Math.floor(parseFloat(supplyAmount) * 10 ** 6))] : undefined,
  });

  // Calculate PYUSD to receive for withdraw amount
  const { data: pyusdToReceive } = useReadContract({
    address: CONTRACTS.StakedPYUSD,
    abi: StakedPYUSDABI,
    functionName: "calculateBurnAmount",
    args: withdrawAmount ? [BigInt(Math.floor(parseFloat(withdrawAmount) * 10 ** 6))] : undefined,
  });

  const handleSupply = async () => {
    if (!supplyAmount) return;

    try {
      const amount = parseUnits(supplyAmount, 6);

      // First approve PYUSD
      await writeContract({
        address: CONTRACTS.MockPYUSD,
        abi: MockPYUSDABI,
        functionName: "approve",
        args: [CONTRACTS.LendingPool, amount],
      });

      // Then supply
      await writeContract({
        address: CONTRACTS.LendingPool,
        abi: EthereumLendingPoolABI,
        functionName: "supplyPYUSD",
        args: [amount],
      });

      setSupplyAmount("");
    } catch (error) {
      console.error("Supply error:", error);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;

    try {
      await writeContract({
        address: CONTRACTS.LendingPool,
        abi: EthereumLendingPoolABI,
        functionName: "withdrawPYUSD",
        args: [parseUnits(withdrawAmount, 6)], // sPYUSD amount
      });

      setWithdrawAmount("");
    } catch (error) {
      console.error("Withdraw error:", error);
    }
  };

  // Refetch balances on success
  useEffect(() => {
    if (isSuccess) {
      refetchSpyusd();
    }
  }, [isSuccess, refetchSpyusd]);

  const utilizationRate = totalSupplied && totalBorrowed && totalSupplied > BigInt(0)
    ? ((Number(totalBorrowed) / Number(totalSupplied)) * 100).toFixed(2)
    : "0";

  const exchangeRateFormatted = exchangeRate
    ? (Number(exchangeRate) / 1e18).toFixed(6)
    : "1.000000";

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
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center">Supply Liquidity & Earn sPYUSD</h2>

          {/* Exchange Rate Info */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-xl p-6 mb-8">
            <div className="text-center">
              <p className="text-sm opacity-90 mb-2">Current Exchange Rate</p>
              <p className="text-5xl font-bold mb-2">{exchangeRateFormatted}</p>
              <p className="text-sm opacity-90">1 sPYUSD = {exchangeRateFormatted} PYUSD</p>
            </div>
          </div>

          {/* Pool Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Supplied</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {totalSupplied ? formatUnits(totalSupplied, 6) : "0"} PYUSD
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Borrowed</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {totalBorrowed ? formatUnits(totalBorrowed, 6) : "0"} PYUSD
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Utilization Rate</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {utilizationRate}%
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {!isConnected ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Please connect your wallet to supply PYUSD
                </p>
                <ConnectButton />
              </div>
            ) : (
              <>
                {/* Your Position */}
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6 mb-8">
                  <h3 className="text-xl font-bold mb-4">Your Position</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">PYUSD Balance</p>
                      <p className="text-2xl font-bold">
                        {pyusdBalance ? formatUnits(pyusdBalance, 6) : "0"} PYUSD
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">sPYUSD Balance</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {spyusdBalance ? formatUnits(spyusdBalance, 6) : "0"} sPYUSD
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        ≈ {spyusdValueInPYUSD ? formatUnits(spyusdValueInPYUSD, 6) : "0"} PYUSD
                      </p>
                    </div>
                  </div>

                  {/* Profit Display */}
                  {spyusdBalance && spyusdValueInPYUSD && Number(spyusdBalance) > 0 && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        💰 Current Profit: {" "}
                        <span className="font-bold">
                          {(Number(formatUnits(spyusdValueInPYUSD, 6)) - Number(formatUnits(spyusdBalance, 6))).toFixed(6)} PYUSD
                        </span>
                        {" "}(
                        {spyusdBalance > BigInt(0)
                          ? (((Number(formatUnits(spyusdValueInPYUSD, 6)) - Number(formatUnits(spyusdBalance, 6))) / Number(formatUnits(spyusdBalance, 6))) * 100).toFixed(2)
                          : "0"}%)
                      </p>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setActiveTab("supply")}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                      activeTab === "supply"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Supply PYUSD
                  </button>
                  <button
                    onClick={() => setActiveTab("withdraw")}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                      activeTab === "withdraw"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Withdraw
                  </button>
                </div>

                {/* Supply Tab */}
                {activeTab === "supply" && (
                  <div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">
                        Supply Amount (PYUSD)
                      </label>
                      <input
                        type="number"
                        value={supplyAmount}
                        onChange={(e) => setSupplyAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                        step="0.01"
                      />
                      <button
                        onClick={() => setSupplyAmount(pyusdBalance ? formatUnits(pyusdBalance, 6) : "0")}
                        className="text-sm text-indigo-600 dark:text-indigo-400 mt-1 hover:underline"
                      >
                        Use Max
                      </button>
                    </div>

                    {/* Preview */}
                    {supplyAmount && spyusdToMint && (
                      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                          📊 You will receive:
                        </p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {formatUnits(spyusdToMint, 6)} sPYUSD
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Exchange Rate: {exchangeRateFormatted}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleSupply}
                      disabled={!supplyAmount || isPending || isConfirming}
                      className="w-full px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? "Confirming..." : isConfirming ? "Processing..." : "Supply PYUSD"}
                    </button>

                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        ℹ️ You'll receive sPYUSD tokens that automatically increase in value as borrowers pay interest. No need to claim rewards - your sPYUSD becomes more valuable over time!
                      </p>
                    </div>
                  </div>
                )}

                {/* Withdraw Tab */}
                {activeTab === "withdraw" && (
                  <div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">
                        Withdraw Amount (sPYUSD)
                      </label>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                        step="0.01"
                      />
                      <button
                        onClick={() => setWithdrawAmount(spyusdBalance ? formatUnits(spyusdBalance, 6) : "0")}
                        className="text-sm text-indigo-600 dark:text-indigo-400 mt-1 hover:underline"
                      >
                        Withdraw All
                      </button>
                    </div>

                    {/* Preview */}
                    {withdrawAmount && pyusdToReceive && (
                      <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                          💰 You will receive:
                        </p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {formatUnits(pyusdToReceive, 6)} PYUSD
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          Exchange Rate: {exchangeRateFormatted}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleWithdraw}
                      disabled={!withdrawAmount || isPending || isConfirming}
                      className="w-full px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? "Confirming..." : isConfirming ? "Processing..." : "Withdraw PYUSD"}
                    </button>

                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ You can only withdraw if there's enough liquidity in the pool. Your sPYUSD will be burned and you'll receive PYUSD based on the current exchange rate.
                      </p>
                    </div>
                  </div>
                )}

                {isSuccess && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-800 dark:text-green-200">
                      ✅ Transaction successful!
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Get PYUSD for Testing */}
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-3">Need PYUSD for Testing?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Get 10,000 PYUSD from our faucet for testing on Sepolia
            </p>
            <a
              href={`https://sepolia.etherscan.io/address/${CONTRACTS.MockPYUSD}#writeContract`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Get Test PYUSD
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
