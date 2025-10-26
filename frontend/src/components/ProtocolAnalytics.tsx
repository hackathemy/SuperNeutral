"use client";

import { useState, useEffect } from "react";
import { blockscoutAPI, type BlockscoutTransaction } from "@/lib/blockscout";
import { CONTRACTS } from "@/config/contracts";
import { formatUnits } from "viem";

interface PoolStats {
  transactionCount: string;
  tokenTransferCount: string;
  gasUsed: string;
  balance: string;
}

interface TokenStats {
  transferCount: string;
  holderCount: string;
  totalSupply: string;
  topHolders: Array<{
    address: { hash: string; name?: string };
    value: string;
  }>;
}

export default function ProtocolAnalytics() {
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<BlockscoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch lending pool statistics in parallel
      const [poolCounters, poolInfo, tokenCounters, tokenInfo, tokenHolders, recentTxs] =
        await Promise.all([
          blockscoutAPI.getAddressCounters(CONTRACTS.LendingPool),
          blockscoutAPI.getAddress(CONTRACTS.LendingPool),
          blockscoutAPI.getTokenCounters(CONTRACTS.StakedPYUSD),
          blockscoutAPI.getToken(CONTRACTS.StakedPYUSD),
          blockscoutAPI.getTokenHolders(CONTRACTS.StakedPYUSD),
          blockscoutAPI.getAddressTransactions(CONTRACTS.LendingPool, { limit: 10 }),
        ]);

      setPoolStats({
        transactionCount: poolCounters.transactions_count,
        tokenTransferCount: poolCounters.token_transfers_count,
        gasUsed: poolCounters.gas_usage_count,
        balance: poolInfo.coin_balance,
      });

      setTokenStats({
        transferCount: tokenCounters.token_transfers_count,
        holderCount: tokenCounters.token_holders_count,
        totalSupply: tokenInfo.total_supply,
        topHolders: tokenHolders.items?.slice(0, 5) || [],
      });

      setRecentActivity(recentTxs.items || []);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !poolStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading protocol analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Error Loading Analytics
        </h3>
        <p className="text-red-600 dark:text-red-300">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Lending Pool Statistics */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lending Pool Analytics
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Transactions</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {poolStats?.transactionCount || "0"}
                </p>
              </div>
              <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-full p-3">
                <svg
                  className="w-8 h-8 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Token Transfers</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {poolStats?.tokenTransferCount || "0"}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pool Balance (ETH)</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {poolStats?.balance
                    ? parseFloat(formatUnits(BigInt(poolStats.balance), 18)).toFixed(4)
                    : "0"}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-3">
                <svg
                  className="w-8 h-8 text-purple-600 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Gas Used</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {poolStats?.gasUsed ? parseInt(poolStats.gasUsed).toLocaleString() : "0"}
                </p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/30 rounded-full p-3">
                <svg
                  className="w-8 h-8 text-orange-600 dark:text-orange-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* StakedPYUSD Token Statistics */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          StakedPYUSD Token Analytics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Holders</p>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {tokenStats?.holderCount || "0"}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Transfers</p>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {tokenStats?.transferCount || "0"}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Supply</p>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {tokenStats?.totalSupply
                ? parseInt(tokenStats.totalSupply).toLocaleString()
                : "0"}
            </p>
          </div>
        </div>

        {/* Top Holders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Holders</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tokenStats?.topHolders?.map((holder, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={`https://eth-sepolia.blockscout.com/address/${holder.address.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                      >
                        {holder.address.name || `${holder.address.hash.substring(0, 10)}...${holder.address.hash.substring(holder.address.hash.length - 8)}`}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                      {parseInt(holder.value).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                      {tokenStats?.totalSupply
                        ? ((parseInt(holder.value) / parseInt(tokenStats.totalSupply)) * 100).toFixed(2)
                        : "0"}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Recent Pool Activity */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Recent Pool Activity
        </h2>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentActivity.length > 0 ? (
              recentActivity.map((tx, index) => (
                <div
                  key={index}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <a
                          href={`https://eth-sepolia.blockscout.com/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono text-sm"
                        >
                          {tx.hash.substring(0, 16)}...
                        </a>
                        {tx.method && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200">
                            {tx.method}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tx.status === "ok"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                          }`}
                        >
                          {tx.status === "ok" ? "Success" : "Failed"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>From: {tx.from.hash.substring(0, 10)}...</span>
                        <span>→</span>
                        <span>To: {tx.to?.hash.substring(0, 10) || "Contract Creation"}...</span>
                        <span>Block: {tx.block_number}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Gas: {parseInt(tx.gas_used).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No recent transactions
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Links */}
      <div className="flex gap-4 justify-center">
        <a
          href={`https://eth-sepolia.blockscout.com/address/${CONTRACTS.LendingPool}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          View Full Explorer →
        </a>
      </div>
    </div>
  );
}
