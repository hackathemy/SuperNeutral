"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, parseUnits } from "viem";
import { CONTRACTS } from "@/config/contracts";
import { EthereumLendingPoolABI } from "@/lib/abis/EthereumLendingPool";
import { EthereumLoanNFTABI } from "@/lib/abis/EthereumLoanNFT";
import { PYUSDABI } from "@/lib/abis/PYUSD";

interface LoanData {
  tokenId: bigint;
  collateral: bigint;
  debt: bigint;
  liquidationRatio: bigint;
  healthFactor: string;
}

export default function MyLoansPage() {
  const { address, isConnected } = useAccount();
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<bigint | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [addCollateralAmount, setAddCollateralAmount] = useState("");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Get user's loan IDs from LendingPool
  const { data: userLoanIds } = useReadContract({
    address: CONTRACTS.LendingPool,
    abi: EthereumLendingPoolABI,
    functionName: "userLoanIds",
    args: address ? [address] : undefined,
  });

  // Get ETH price
  const { data: ethPrice } = useReadContract({
    address: CONTRACTS.LendingPool,
    abi: EthereumLendingPoolABI,
    functionName: "getETHPrice",
  });

  // Fetch loan details from contract
  useEffect(() => {
    if (!address || !userLoanIds || userLoanIds.length === 0) {
      setLoans([]);
      return;
    }

    const fetchLoans = async () => {
      try {
        const loanData: LoanData[] = [];

        // Fetch loan details for each tokenId
        for (const tokenId of userLoanIds) {
          try {
            // Use wagmi's readContract to get loan data
            const response = await fetch(`/api/get-loan?tokenId=${tokenId}`);
            if (!response.ok) continue;

            const loan = await response.json();

            // Calculate health factor
            let healthFactor = "0";
            if (ethPrice && loan.collateral > 0 && loan.debt > 0) {
              const collateralValue = (BigInt(loan.collateral) * BigInt(ethPrice)) / BigInt(10 ** 18);
              const maxBorrow = (collateralValue * BigInt(loan.liquidationRatio)) / BigInt(100) / BigInt(10 ** 12);
              healthFactor = (Number(maxBorrow) / (Number(loan.debt) / 10 ** 6)).toFixed(2);
            }

            loanData.push({
              tokenId: BigInt(tokenId),
              collateral: BigInt(loan.collateral),
              debt: BigInt(loan.debt),
              liquidationRatio: BigInt(loan.liquidationRatio),
              healthFactor,
            });
          } catch (error) {
            console.error(`Failed to fetch loan ${tokenId}:`, error);
          }
        }

        setLoans(loanData);
      } catch (error) {
        console.error("Failed to fetch loans:", error);
        setLoans([]);
      }
    };

    fetchLoans();
  }, [address, userLoanIds, ethPrice]);

  const handleRepay = async () => {
    if (!selectedLoan || !repayAmount) return;

    try {
      // First approve PYUSD
      await writeContract({
        address: CONTRACTS.PYUSD,
        abi: PYUSDABI,
        functionName: "approve",
        args: [CONTRACTS.LendingPool, parseUnits(repayAmount, 6)],
      });

      // Then repay
      await writeContract({
        address: CONTRACTS.LendingPool,
        abi: EthereumLendingPoolABI,
        functionName: "repay",
        args: [selectedLoan] as const,
      });
    } catch (error) {
      console.error("Repay error:", error);
    }
  };

  const handleAddCollateral = async () => {
    if (!selectedLoan || !addCollateralAmount) return;

    try {
      await writeContract({
        address: CONTRACTS.LendingPool,
        abi: EthereumLendingPoolABI,
        functionName: "addCollateral",
        args: [selectedLoan],
        value: parseEther(addCollateralAmount),
      });
    } catch (error) {
      console.error("Add collateral error:", error);
    }
  };

  const handleClosePosition = async (tokenId: bigint) => {
    if (!tokenId) return;

    try {
      setSelectedLoan(tokenId);

      // Note: The repay function will automatically calculate total repayment (debt + interest)
      // and handle the approval internally. The user needs to have enough PYUSD approved.

      // For now, approve a large amount to cover debt + interest
      // In production, you would calculate exact amount needed
      await writeContract({
        address: CONTRACTS.PYUSD,
        abi: PYUSDABI,
        functionName: "approve",
        args: [CONTRACTS.LendingPool, parseUnits("1000000", 6)], // 1M PYUSD max
      });

      // Then call repay which will close the position
      await writeContract({
        address: CONTRACTS.LendingPool,
        abi: EthereumLendingPoolABI,
        functionName: "repay",
        args: [tokenId] as const,
      });
    } catch (error) {
      console.error("Close position error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">My Loan Positions</h2>

          {!isConnected ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Connect your wallet to view your loan positions
              </p>
              <w3m-button />
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Active Loans</p>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {userLoanIds ? userLoanIds.length : "0"}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Borrowed</p>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {loans.reduce((sum, loan) => sum + Number(loan.debt) / 10 ** 6, 0).toFixed(2)} PYUSD
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Collateral</p>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {loans.reduce((sum, loan) => sum + Number(formatEther(loan.collateral)), 0).toFixed(4)} ETH
                  </p>
                </div>
              </div>

              {/* Loan Cards */}
              {!userLoanIds || userLoanIds.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    No Active Loan Positions
                  </p>
                  <Link
                    href="/borrow"
                    className="inline-block px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
                  >
                    Borrow PYUSD
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {loans.map((loan) => (
                    <div
                      key={loan.tokenId.toString()}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                            Loan Position #{loan.tokenId.toString()}
                          </h3>
                          <div className="flex gap-4">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Collateral</p>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatEther(loan.collateral)} ETH
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Debt</p>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {(Number(loan.debt) / 10 ** 6).toFixed(2)} PYUSD
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Health Factor</p>
                          <p className={`text-2xl font-bold ${
                            parseFloat(loan.healthFactor) >= 1.5 ? "text-green-600 dark:text-green-400" :
                            parseFloat(loan.healthFactor) >= 1.2 ? "text-yellow-600 dark:text-yellow-400" :
                            "text-red-600 dark:text-red-400"
                          }`}>
                            {loan.healthFactor}x
                          </p>
                          <p className={`text-xs ${
                            parseFloat(loan.healthFactor) >= 1.5 ? "text-green-600 dark:text-green-400" :
                            parseFloat(loan.healthFactor) >= 1.2 ? "text-yellow-600 dark:text-yellow-400" :
                            "text-red-600 dark:text-red-400"
                          }`}>
                            {parseFloat(loan.healthFactor) >= 1.5 ? "Safe" :
                             parseFloat(loan.healthFactor) >= 1.2 ? "Warning" :
                             "Danger"}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-4 mt-6">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Collateral Add (ETH)</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={selectedLoan === loan.tokenId ? addCollateralAmount : ""}
                                onChange={(e) => {
                                  setSelectedLoan(loan.tokenId);
                                  setAddCollateralAmount(e.target.value);
                                }}
                                placeholder="Amount"
                                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              />
                              <button
                                onClick={handleAddCollateral}
                                disabled={isPending || isConfirming || !addCollateralAmount}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 shadow-lg"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Partial Repay (PYUSD)</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={selectedLoan === loan.tokenId ? repayAmount : ""}
                                onChange={(e) => {
                                  setSelectedLoan(loan.tokenId);
                                  setRepayAmount(e.target.value);
                                }}
                                placeholder="Amount"
                                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              />
                              <button
                                onClick={handleRepay}
                                disabled={isPending || isConfirming || !repayAmount}
                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 shadow-lg"
                              >
                                Repay
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Close Position Button */}
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => handleClosePosition(loan.tokenId)}
                            disabled={isPending || isConfirming}
                            className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg font-semibold hover:from-red-700 hover:to-pink-700 transition disabled:opacity-50 shadow-lg"
                          >
                            🔒 Repay in Full and Close
                          </button>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                            Repay all debt + interest and receive collateral back
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
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
      </main>
    </div>
  );
}
