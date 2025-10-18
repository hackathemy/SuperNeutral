"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            ETH Lending Protocol
          </h1>
          <ConnectButton />
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Borrow PYUSD with ETH Collateral
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Deposit ETH, earn staking rewards, and borrow PYUSD stablecoin. Your loan position is represented as an NFT.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            title="🏦 Borrow PYUSD"
            description="Use your ETH as collateral to borrow PYUSD stablecoin with flexible liquidation ratios (50-80%)"
            link="/borrow"
          />
          <FeatureCard
            title="🎫 NFT Positions"
            description="Your loan is represented as an ERC-721 NFT that you can transfer or trade"
            link="/my-loans"
          />
          <FeatureCard
            title="💰 Earn sPYUSD"
            description="Supply PYUSD and receive sPYUSD tokens that automatically increase in value as borrowers pay interest"
            link="/supply"
          />
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-center">Protocol Stats</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <StatCard label="Total Supplied" value="100,000 PYUSD" />
            <StatCard label="Total Borrowed" value="500 PYUSD" />
            <StatCard label="Active Loans" value="1" />
            <StatCard label="ETH Price" value="$2,000" />
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex justify-center gap-4 mt-12">
          <Link
            href="/borrow"
            className="px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Start Borrowing
          </Link>
          <Link
            href="/supply"
            className="px-8 py-4 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-600 dark:border-indigo-400 rounded-lg font-semibold hover:bg-indigo-50 dark:hover:bg-gray-700 transition"
          >
            Supply Liquidity
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600 dark:text-gray-400">
          <p>Built on Sepolia Testnet | Powered by LIDO & Pyth Oracle</p>
          <div className="mt-4 space-x-4">
            <a href="https://sepolia.etherscan.io/address/0xe27462f8F471335cEa75Ea76BDDb05189cd599d4" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600">
              Lending Pool Contract
            </a>
            <a href="https://sepolia.etherscan.io/address/0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600">
              Loan NFT Contract
            </a>
            <a href="https://sepolia.etherscan.io/address/0x48D54257dE5824fd2D19e8315709B92D474b0E05" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600">
              sPYUSD Token Contract
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, link }: { title: string; description: string; link: string }) {
  return (
    <Link href={link}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition cursor-pointer h-full">
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{value}</p>
    </div>
  );
}
