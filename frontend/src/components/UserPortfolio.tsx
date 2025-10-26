"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { blockscoutAPI, BlockscoutTransaction } from "@/lib/blockscout";
import { CONTRACTS, EXPLORER_URLS, FAUCETS } from "@/config/contracts";

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
}

export default function UserPortfolio() {
  const { address, isConnected } = useAccount();
  const [loanPositions, setLoanPositions] = useState<LoanPosition[]>([]);
  const [recentTxs, setRecentTxs] = useState<BlockscoutTransaction[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Read loan NFT count
  const { data: loanNftCount } = useReadContract({
    address: CONTRACTS.LoanNFT,
    abi: LOAN_NFT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Calculate PYUSD value from sPYUSD
  const pyusdValue =
    spyusdBalance && exchangeRate
      ? (spyusdBalance * exchangeRate) / BigInt(10 ** 18)
      : BigInt(0);

  // Load loan positions
  useEffect(() => {
    async function loadLoans() {
      if (!address || !loanNftCount || loanNftCount === BigInt(0)) {
        setLoanPositions([]);
        return;
      }

      setLoading(true);
      try {
        const positions: LoanPosition[] = [];

        // Fetch all loan NFT token IDs
        for (let i = 0; i < Number(loanNftCount); i++) {
          // This would need a proper contract read - simplified for now
          // In production, you'd use multicall or loop through tokenOfOwnerByIndex
          positions.push({
            tokenId: BigInt(i + 1), // Placeholder
            collateral: BigInt(0),
            debt: BigInt(0),
            liquidationRatio: 0,
            shortRatio: 0,
            timestamp: BigInt(0),
          });
        }

        setLoanPositions(positions);
      } catch (error) {
        console.error("Failed to load loan positions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadLoans();
  }, [address, loanNftCount]);

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
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Your Portfolio</h2>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            Connect your wallet to view your portfolio
          </p>
          <w3m-button />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Your Portfolio</h2>
        {address && (
          <a
            href={`https://sepolia.etherscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View on Blockscout →
          </a>
        )}
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">PYUSD Balance</span>
            <a
              href={FAUCETS.PYUSD}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Get PYUSD →
            </a>
          </div>
          <div className="text-2xl font-bold">
            {pyusdBalance ? formatUnits(pyusdBalance, 6) : "0.00"}
          </div>
          <div className="text-xs text-gray-500 mt-1">PayPal USD</div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-2">sPYUSD Balance</div>
          <div className="text-2xl font-bold">
            {spyusdBalance ? formatUnits(spyusdBalance, 18) : "0.00"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ≈ {pyusdValue ? formatUnits(pyusdValue, 18) : "0.00"} PYUSD
          </div>
        </div>
      </div>

      {/* Exchange Rate */}
      {exchangeRate && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-900">
              Current Exchange Rate
            </span>
            <span className="text-sm font-mono text-blue-900">
              1 sPYUSD = {formatUnits(exchangeRate, 18)} PYUSD
            </span>
          </div>
        </div>
      )}

      {/* Loan Positions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Active Loans</h3>
        {loading ? (
          <div className="text-center py-4 text-gray-500">
            Loading positions...
          </div>
        ) : loanPositions.length > 0 ? (
          <div className="space-y-3">
            {loanPositions.map((loan) => (
              <div
                key={loan.tokenId.toString()}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Loan #{loan.tokenId.toString()}
                  </span>
                  <a
                    href={`${EXPLORER_URLS.LoanNFT}/instance/${loan.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View NFT →
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Collateral</div>
                    <div className="font-medium">
                      {formatUnits(loan.collateral, 18)} ETH
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Debt</div>
                    <div className="font-medium">
                      {formatUnits(loan.debt, 6)} PYUSD
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 mb-2">No active loans</p>
            <p className="text-sm text-gray-400">
              Borrow PYUSD using ETH collateral to see your loans here
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
        {recentTxs.length > 0 ? (
          <div className="space-y-2">
            {recentTxs.slice(0, 5).map((tx) => (
              <a
                key={tx.hash}
                href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    {tx.method || "Transfer"}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      tx.status === "ok"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {tx.status === "ok" ? "Success" : "Failed"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="font-mono">
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                  </span>
                  <span>{new Date(tx.timestamp).toLocaleString()}</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">No recent transactions</p>
          </div>
        )}
      </div>
    </div>
  );
}
