"use client";

import { useState } from "react";
import Link from "next/link";
import ProtocolAnalytics from "@/components/ProtocolAnalytics";
import UserPortfolio from "@/components/UserPortfolio";
import EventLogs from "@/components/EventLogs";
import { EXPLORER_URLS } from "@/config/contracts";

type TabType = "overview" | "portfolio" | "events";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "overview", label: "Protocol Overview", icon: "📊" },
    { id: "portfolio", label: "My Portfolio", icon: "💼" },
    { id: "events", label: "Event Logs", icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back to Home
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                Protocol Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Real-time on-chain analytics powered by Blockscout
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={EXPLORER_URLS.LendingPool}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>View on Blockscout</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
              <w3m-button />
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-2 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <ProtocolAnalytics />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold">Total Supply</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Track PYUSD supplied to the protocol
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold">Active Loans</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Monitor active borrowing positions
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold">Flash Loans</h3>
                </div>
                <p className="text-sm text-gray-600">
                  View flash loan activity and fees
                </p>
              </div>
            </div>

            {/* Recent Events Preview */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                <button
                  onClick={() => setActiveTab("events")}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View all events →
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Latest protocol events and transactions
              </p>
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <UserPortfolio />

            {/* Portfolio Guide */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                📚 How to Use Your Portfolio
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>
                    <strong>Supply PYUSD:</strong> Deposit PYUSD to earn yield
                    and receive sPYUSD tokens
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>
                    <strong>Borrow PYUSD:</strong> Use ETH as collateral to
                    borrow PYUSD
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>
                    <strong>Monitor Health:</strong> Keep your loan health ratio
                    above the liquidation threshold
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>
                    <strong>Withdraw:</strong> Redeem your sPYUSD for PYUSD at
                    any time
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="space-y-6">
            <EventLogs />

            {/* Event Types Legend */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold mb-4">Event Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <div className="font-medium">Supply</div>
                    <div className="text-xs text-gray-600">
                      User deposits PYUSD
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <div className="font-medium">Borrow</div>
                    <div className="text-xs text-gray-600">
                      User borrows PYUSD
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <div className="font-medium">Repay</div>
                    <div className="text-xs text-gray-600">
                      User repays loan
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-medium">Liquidation</div>
                    <div className="text-xs text-gray-600">
                      Undercollateralized loan
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <div className="font-medium">Flash Loan</div>
                    <div className="text-xs text-gray-600">
                      Instant borrow/repay
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💵</span>
                  <div>
                    <div className="font-medium">Withdraw</div>
                    <div className="text-xs text-gray-600">
                      User withdraws PYUSD
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Powered by{" "}
              <a
                href="https://www.blockscout.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Blockscout
              </a>{" "}
              •{" "}
              <a
                href="https://pyth.network"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Pyth Network
              </a>
            </div>
            <div>
              <a
                href="https://sepolia.etherscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Sepolia Testnet
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
