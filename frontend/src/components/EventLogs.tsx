"use client";

import { useEffect, useState } from "react";
import { blockscoutAPI, BlockscoutLog } from "@/lib/blockscout";
import { CONTRACTS } from "@/config/contracts";
import { formatUnits } from "viem";

interface DecodedEvent {
  eventName: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  user?: string;
  amount?: string;
  tokenId?: string;
  collateral?: string;
  debt?: string;
  icon: string;
  color: string;
}

// Event signatures (keccak256 hash of event signature)
const EVENT_SIGNATURES = {
  // Supplied(address indexed user, uint256 amount)
  Supplied: "0x6f3e5f139897c9eb00e3c3f42c40d30cfe89e3f8f709e7dc3c5f0e9b9e1d0a7a",

  // Borrowed(address indexed borrower, uint256 tokenId, uint256 collateral, uint256 debt)
  Borrowed: "0x...", // Need actual signature

  // Repaid(address indexed borrower, uint256 tokenId, uint256 amount)
  Repaid: "0x...", // Need actual signature

  // Liquidated(uint256 indexed tokenId, address indexed liquidator, uint256 collateralSeized)
  Liquidated: "0x...", // Need actual signature

  // FlashLoan(address indexed receiver, address indexed token, uint256 amount, uint256 fee)
  FlashLoan: "0x...", // Need actual signature

  // Transfer(address indexed from, address indexed to, uint256 value) - ERC20
  Transfer: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",

  // Withdrawal(address indexed user, uint256 amount)
  Withdrawal: "0x...", // Need actual signature
};

function decodeEventLog(log: BlockscoutLog): DecodedEvent | null {
  const topic0 = log.topics[0];

  try {
    // Supplied event
    if (log.decoded?.method_call === "Supplied" ||
        (log.topics.length >= 2 && log.decoded?.method_call?.includes("Supply"))) {
      return {
        eventName: "Supply",
        txHash: log.transaction_hash,
        blockNumber: log.block_number,
        timestamp: log.block_timestamp,
        user: log.topics[1] ? `0x${log.topics[1].slice(26)}` : undefined,
        amount: log.decoded?.parameters?.find((p) => p.name === "amount")?.value,
        icon: "💰",
        color: "green",
      };
    }

    // Borrowed event
    if (log.decoded?.method_call === "Borrowed" ||
        log.decoded?.method_call?.includes("Borrow")) {
      return {
        eventName: "Borrow",
        txHash: log.transaction_hash,
        blockNumber: log.block_number,
        timestamp: log.block_timestamp,
        user: log.topics[1] ? `0x${log.topics[1].slice(26)}` : undefined,
        tokenId: log.decoded?.parameters?.find((p) => p.name === "tokenId")?.value,
        collateral: log.decoded?.parameters?.find((p) => p.name === "collateral")?.value,
        debt: log.decoded?.parameters?.find((p) => p.name === "debt")?.value,
        icon: "📊",
        color: "blue",
      };
    }

    // Repaid event
    if (log.decoded?.method_call === "Repaid" ||
        log.decoded?.method_call?.includes("Repay")) {
      return {
        eventName: "Repay",
        txHash: log.transaction_hash,
        blockNumber: log.block_number,
        timestamp: log.block_timestamp,
        user: log.topics[1] ? `0x${log.topics[1].slice(26)}` : undefined,
        tokenId: log.decoded?.parameters?.find((p) => p.name === "tokenId")?.value,
        amount: log.decoded?.parameters?.find((p) => p.name === "amount")?.value,
        icon: "✅",
        color: "green",
      };
    }

    // Liquidated event
    if (log.decoded?.method_call === "Liquidated" ||
        log.decoded?.method_call?.includes("Liquidat")) {
      return {
        eventName: "Liquidation",
        txHash: log.transaction_hash,
        blockNumber: log.block_number,
        timestamp: log.block_timestamp,
        tokenId: log.decoded?.parameters?.find((p) => p.name === "tokenId")?.value,
        user: log.decoded?.parameters?.find((p) => p.name === "liquidator")?.value,
        collateral: log.decoded?.parameters?.find((p) => p.name === "collateralSeized")?.value,
        icon: "⚠️",
        color: "red",
      };
    }

    // FlashLoan event
    if (log.decoded?.method_call === "FlashLoan" ||
        log.decoded?.method_call?.includes("Flash")) {
      return {
        eventName: "Flash Loan",
        txHash: log.transaction_hash,
        blockNumber: log.block_number,
        timestamp: log.block_timestamp,
        user: log.decoded?.parameters?.find((p) => p.name === "receiver")?.value,
        amount: log.decoded?.parameters?.find((p) => p.name === "amount")?.value,
        icon: "⚡",
        color: "purple",
      };
    }

    // Withdrawal event
    if (log.decoded?.method_call === "Withdrawal" ||
        log.decoded?.method_call?.includes("Withdraw")) {
      return {
        eventName: "Withdraw",
        txHash: log.transaction_hash,
        blockNumber: log.block_number,
        timestamp: log.block_timestamp,
        user: log.topics[1] ? `0x${log.topics[1].slice(26)}` : undefined,
        amount: log.decoded?.parameters?.find((p) => p.name === "amount")?.value,
        icon: "💵",
        color: "orange",
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to decode event:", error);
    return null;
  }
}

export default function EventLogs() {
  const [events, setEvents] = useState<DecodedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      try {
        // Fetch logs from lending pool
        const response = await blockscoutAPI.getAddressLogs(
          CONTRACTS.LendingPool,
          {}
        );

        const decodedEvents = (response.items || [])
          .map(decodeEventLog)
          .filter((e): e is DecodedEvent => e !== null)
          .sort((a, b) => b.blockNumber - a.blockNumber);

        setEvents(decodedEvents);
      } catch (error) {
        console.error("Failed to load events:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
    const interval = setInterval(loadEvents, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const filteredEvents =
    filter === "all"
      ? events
      : events.filter((e) => e.eventName.toLowerCase() === filter.toLowerCase());

  const eventTypes = ["all", "supply", "borrow", "repay", "liquidation", "flash loan", "withdraw"];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Event Logs</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {eventTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === type
                ? "bg-indigo-600 dark:bg-indigo-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Event Timeline */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading events...</div>
      ) : filteredEvents.length > 0 ? (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredEvents.map((event, index) => (
            <div
              key={`${event.txHash}-${index}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="text-2xl">{event.icon}</div>

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        event.color === "green" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200" :
                        event.color === "blue" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200" :
                        event.color === "red" ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200" :
                        event.color === "purple" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200" :
                        event.color === "orange" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200" :
                        "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {event.eventName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Block #{event.blockNumber.toLocaleString()}
                    </span>
                  </div>

                  {/* Event-specific data */}
                  <div className="text-sm space-y-1">
                    {event.user && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">User:</span>
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 rounded">
                          {event.user.slice(0, 6)}...{event.user.slice(-4)}
                        </code>
                      </div>
                    )}

                    {event.amount && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {(() => {
                            try {
                              return formatUnits(BigInt(event.amount), 6) + " PYUSD";
                            } catch {
                              return event.amount;
                            }
                          })()}
                        </span>
                      </div>
                    )}

                    {event.collateral && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">Collateral:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {(() => {
                            try {
                              return formatUnits(BigInt(event.collateral), 18) + " ETH";
                            } catch {
                              return event.collateral;
                            }
                          })()}
                        </span>
                      </div>
                    )}

                    {event.debt && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">Debt:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {(() => {
                            try {
                              return formatUnits(BigInt(event.debt), 6) + " PYUSD";
                            } catch {
                              return event.debt;
                            }
                          })()}
                        </span>
                      </div>
                    )}

                    {event.tokenId && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">Loan NFT:</span>
                        <span className="font-medium text-gray-900 dark:text-white">#{event.tokenId}</span>
                      </div>
                    )}
                  </div>

                  {/* Transaction Link & Timestamp */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    {event.txHash ? (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono"
                      >
                        {event.txHash.slice(0, 10)}...{event.txHash.slice(-8)}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">No tx hash</span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {filter === "all" ? "No events yet" : `No ${filter} events`}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Events will appear here as users interact with the protocol
          </p>
        </div>
      )}

      {/* Live Indicator */}
      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          Auto-refreshing every 30 seconds
        </span>
      </div>
    </div>
  );
}
