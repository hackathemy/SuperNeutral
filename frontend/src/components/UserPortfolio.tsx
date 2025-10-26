"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { blockscoutAPI, BlockscoutTransaction } from "@/lib/blockscout";
import { CONTRACTS, EXPLORER_URLS, FAUCETS } from "@/config/contracts";
import { EthereumLendingPoolABI } from "@/lib/abis/EthereumLendingPool";

// ABIs
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const SPYUSD_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "exchangeRate",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const LOAN_NFT_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const LENDING_POOL_ABI = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "loans",
    outputs: [
      { name: "borrower", type: "address" },
      { name: "collateral", type: "uint256" },
      { name: "debt", type: "uint256" },
      { name: "liquidationRatio", type: "uint256" },
      { name: "shortRatio", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface LoanPosition {
  tokenId: bigint;
  collateral: bigint;
  debt: bigint;
  liquidationRatio: number;
  shortRatio: number;
  timestamp: bigint;
  interest: bigint;
  healthFactor: string;
}

export default function UserPortfolio() {
  const { address, isConnected } = useAccount();
  const [loanPositions, setLoanPositions] = useState<LoanPosition[]>([]);
  const [recentTxs, setRecentTxs] = useState<BlockscoutTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const publicClient = usePublicClient();

  // Read PYUSD balance
  const { data: pyusdBalance } = useReadContract({
    address: CONTRACTS.PYUSD,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read sPYUSD balance
  const { data: spyusdBalance } = useReadContract({
    address: CONTRACTS.StakedPYUSD,
    abi: SPYUSD_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read exchange rate
  const { data: exchangeRate } = useReadContract({
    address: CONTRACTS.StakedPYUSD,
    abi: SPYUSD_ABI,
    functionName: "exchangeRate",
  });

  // Calculate PYUSD value from sPYUSD
  const pyusdValue =
    spyusdBalance && exchangeRate
      ? (spyusdBalance * exchangeRate) / BigInt(10 ** 18)
      : BigInt(0);

  // Load loan positions from user's NFTs
  useEffect(() => {
    async function loadLoans() {
      if (!address || !publicClient) {
        console.log("UserPortfolio: No address or publicClient", { address, publicClient });
        setLoanPositions([]);
        return;
      }

      setLoading(true);
      try {
        console.log("UserPortfolio: Fetching NFT transfers for", address);
        // Get user's NFT transfers from Blockscout
        const transfersResponse = await blockscoutAPI.getAddressTokenTransfers(
          address,
          {
            type: "ERC-721",
            token: CONTRACTS.LoanNFT,
          }
        );

        console.log("UserPortfolio: Transfers response", transfersResponse);

        if (!transfersResponse.items || transfersResponse.items.length === 0) {
          console.log("UserPortfolio: No transfers found");
          setLoanPositions([]);
          setLoading(false);
          return;
        }

        // Extract unique token IDs where user is current owner
        const ownedTokenIds = new Set<string>();

        // Process transfers to find currently owned tokens
        for (const transfer of transfersResponse.items) {
          const tokenId = transfer.total?.token_id;
          if (!tokenId) continue;

          // If user received this token, add it
          if (transfer.to.hash.toLowerCase() === address.toLowerCase()) {
            ownedTokenIds.add(tokenId);
          }
          // If user sent this token, remove it
          if (transfer.from.hash.toLowerCase() === address.toLowerCase()) {
            ownedTokenIds.delete(tokenId);
          }
        }

        console.log("UserPortfolio: Owned token IDs", Array.from(ownedTokenIds));

        if (ownedTokenIds.size === 0) {
          console.log("UserPortfolio: No owned NFTs");
          setLoanPositions([]);
          setLoading(false);
          return;
        }

        const positions: LoanPosition[] = [];

        // Fetch loan details for each owned NFT
        for (const tokenIdStr of ownedTokenIds) {
          try {
            const tokenId = BigInt(tokenIdStr);
            console.log("UserPortfolio: Processing NFT", tokenId.toString());

            // Get loan info from contract
            console.log("UserPortfolio: Calling getLoan...");
            const loanInfo = await publicClient.readContract({
              address: CONTRACTS.LendingPool,
              abi: EthereumLendingPoolABI,
              functionName: "getLoan",
              args: [tokenId],
            }) as any;

            console.log("UserPortfolio: Loan info", {
              collateral: loanInfo.collateralAmount?.toString(),
              debt: loanInfo.borrowAmount?.toString(),
            });

            // Get health factor from contract
            console.log("UserPortfolio: Calling getHealthFactor...");
            const healthFactorRaw = await publicClient.readContract({
              address: CONTRACTS.LendingPool,
              abi: EthereumLendingPoolABI,
              functionName: "getHealthFactor",
              args: [tokenId],
            }) as bigint;

            console.log("UserPortfolio: Health factor raw", healthFactorRaw.toString());

            // Get accumulated interest from contract
            console.log("UserPortfolio: Calling calculateInterest...");
            const interest = await publicClient.readContract({
              address: CONTRACTS.LendingPool,
              abi: EthereumLendingPoolABI,
              functionName: "calculateInterest",
              args: [tokenId],
            }) as bigint;

            console.log("UserPortfolio: Interest", interest.toString());

            // Health Factor calculation issue:
            // collateralValueUSD is 18 decimals, debtValueUSD is 6 decimals (PYUSD)
            // This causes 1e12 difference in the result
            // So we need to divide by 1e30 (1e18 * 1e12) instead of just 1e18
            let healthFactor: string;

            const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

            // Check if health factor is max uint256 (debt is 0)
            if (healthFactorRaw === MAX_UINT256) {
              healthFactor = "∞"; // Infinite - no debt
            } else {
              // Convert from 1e30 to decimal (accounting for decimals mismatch)
              const healthFactorNum = Number(healthFactorRaw) / 1e30;
              healthFactor = healthFactorNum.toFixed(2);
            }

            console.log("UserPortfolio: Health factor formatted", healthFactor);

            positions.push({
              tokenId,
              collateral: loanInfo.collateralAmount,
              debt: loanInfo.borrowAmount,
              liquidationRatio: Number(loanInfo.liquidationRatio) / 100,
              shortRatio: Number(loanInfo.shortRatio) / 100,
              timestamp: loanInfo.timestamp,
              interest,
              healthFactor,
            });

            console.log("UserPortfolio: Added position", positions.length);
          } catch (error) {
            console.error(`UserPortfolio: Failed to fetch loan ${tokenIdStr}:`, error);
          }
        }

        console.log("UserPortfolio: Final positions", positions);

        setLoanPositions(positions);
      } catch (error) {
        console.error("Failed to load loan positions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadLoans();
  }, [address, publicClient]);

  // Load recent transactions
  useEffect(() => {
    async function loadTransactions() {
      if (!address) {
        setRecentTxs([]);
        return;
      }

      try {
        const response = await blockscoutAPI.getAddressTransactions(address, {
          limit: 10,
        });
        setRecentTxs(response.items || []);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      }
    }

    loadTransactions();
    const interval = setInterval(loadTransactions, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [address]);

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Your Portfolio</h2>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Connect your wallet to view your portfolio
          </p>
          <w3m-button />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Portfolio</h2>
        {address && (
          <a
            href={`https://sepolia.etherscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View on Blockscout →
          </a>
        )}
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">PYUSD Balance</span>
            <a
              href={FAUCETS.PYUSD}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Get PYUSD →
            </a>
          </div>
          <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            {pyusdBalance ? formatUnits(pyusdBalance, 6) : "0.00"}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">PayPal USD</div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-4 hover:shadow-md transition">
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">sPYUSD Balance</div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {spyusdBalance ? formatUnits(spyusdBalance, 18) : "0.00"}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            ≈ {pyusdValue ? formatUnits(pyusdValue, 18) : "0.00"} PYUSD
          </div>
        </div>
      </div>

      {/* Exchange Rate */}
      {exchangeRate && (
        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-indigo-900 dark:text-indigo-100">
              Current Exchange Rate
            </span>
            <span className="text-sm font-mono text-indigo-900 dark:text-indigo-100">
              1 sPYUSD = {formatUnits(exchangeRate, 18)} PYUSD
            </span>
          </div>
        </div>
      )}

      {/* Loan Positions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Active Loans</h3>
        {loading ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            Loading positions...
          </div>
        ) : loanPositions.length > 0 ? (
          <div className="space-y-3">
            {loanPositions.map((loan) => (
              <div
                key={loan.tokenId.toString()}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Loan #{loan.tokenId.toString()}
                  </span>
                  <a
                    href={`${EXPLORER_URLS.LoanNFT}/instance/${loan.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View NFT →
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Collateral</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatUnits(loan.collateral, 18)} ETH
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Debt</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatUnits(loan.debt, 6)} PYUSD
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Interest</div>
                    <div className="font-medium text-orange-600 dark:text-orange-400">
                      {formatUnits(loan.interest, 6)} PYUSD
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Health Factor</div>
                    <div className={`font-medium ${
                      loan.healthFactor === "∞" ? "text-green-600 dark:text-green-400" :
                      parseFloat(loan.healthFactor) >= 1.5 ? "text-green-600 dark:text-green-400" :
                      parseFloat(loan.healthFactor) >= 1.2 ? "text-yellow-600 dark:text-yellow-400" :
                      "text-red-600 dark:text-red-400"
                    }`}>
                      {loan.healthFactor === "∞" ? "∞" : `${loan.healthFactor}x`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <p className="text-gray-500 dark:text-gray-400 mb-2">No active loans</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Borrow PYUSD using ETH collateral to see your loans here
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Recent Activity</h3>
        {recentTxs.length > 0 ? (
          <div className="space-y-2">
            {recentTxs.slice(0, 5).map((tx) => (
              <a
                key={tx.hash}
                href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {tx.method || "Transfer"}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      tx.status === "ok"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                        : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                    }`}
                  >
                    {tx.status === "ok" ? "Success" : "Failed"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-mono">
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                  </span>
                  <span>{new Date(tx.timestamp).toLocaleString()}</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <p className="text-gray-500 dark:text-gray-400">No recent transactions</p>
          </div>
        )}
      </div>
    </div>
  );
}
