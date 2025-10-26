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

  // Get user's NFT balance
  const { data: nftBalance } = useReadContract({
    address: CONTRACTS.LoanNFT,
    abi: EthereumLoanNFTABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Get ETH price
  const { data: ethPrice } = useReadContract({
    address: CONTRACTS.LendingPool,
    abi: EthereumLendingPoolABI,
    functionName: "getETHPrice",
  });

  // Fetch loan details for each NFT
  useEffect(() => {
    if (!address || !nftBalance || nftBalance === BigInt(0)) return;

    const fetchLoans = async () => {
      const loanPromises = [];
      for (let i = 0; i < Number(nftBalance); i++) {
        loanPromises.push(
          fetch(`/api/loan-details?owner=${address}&index=${i}`).catch(() => null)
        );
      }
      // For now, we'll create a simple mock
      // In production, you'd fetch actual token IDs and loan data
      setLoans([]);
    };

    fetchLoans();
  }, [address, nftBalance]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">내 포지션 NFT</h2>

          {!isConnected ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                지갑을 연결하여 대출 포지션을 확인하세요
              </p>
              <w3m-button />
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">활성 대출</p>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {nftBalance ? nftBalance.toString() : "0"}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">총 대출액</p>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    0 PYUSD
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">총 담보</p>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    0 ETH
                  </p>
                </div>
              </div>

              {/* Loan Cards */}
              {!nftBalance || nftBalance === BigInt(0) ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    활성 대출 포지션이 없습니다
                  </p>
                  <Link
                    href="/borrow"
                    className="inline-block px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
                  >
                    PYUSD 대출하기
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
                            대출 포지션 #{loan.tokenId.toString()}
                          </h3>
                          <div className="flex gap-4">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">담보</p>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatEther(loan.collateral)} ETH
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">부채</p>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {(Number(loan.debt) / 10 ** 6).toFixed(2)} PYUSD
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">건강도</p>
                          <p className={`text-2xl font-bold ${
                            parseFloat(loan.healthFactor) > 150 ? "text-green-600 dark:text-green-400" :
                            parseFloat(loan.healthFactor) > 120 ? "text-yellow-600 dark:text-yellow-400" :
                            "text-red-600 dark:text-red-400"
                          }`}>
                            {loan.healthFactor}%
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid md:grid-cols-2 gap-4 mt-6">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">PYUSD 상환</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={selectedLoan === loan.tokenId ? repayAmount : ""}
                              onChange={(e) => {
                                setSelectedLoan(loan.tokenId);
                                setRepayAmount(e.target.value);
                              }}
                              placeholder="금액"
                              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <button
                              onClick={handleRepay}
                              disabled={isPending || isConfirming || !repayAmount}
                              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 shadow-lg"
                            >
                              상환
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">담보 추가 (ETH)</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={selectedLoan === loan.tokenId ? addCollateralAmount : ""}
                              onChange={(e) => {
                                setSelectedLoan(loan.tokenId);
                                setAddCollateralAmount(e.target.value);
                              }}
                              placeholder="금액"
                              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <button
                              onClick={handleAddCollateral}
                              disabled={isPending || isConfirming || !addCollateralAmount}
                              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 shadow-lg"
                            >
                              추가
                            </button>
                          </div>
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
