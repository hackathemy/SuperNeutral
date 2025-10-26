"use client";

import Link from "next/link";
import Header from "@/components/Header";
import ComparisonCard from "@/components/ui/ComparisonCard";
import DifferentiatorCard from "@/components/ui/DifferentiatorCard";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Header />

      <main className="container mx-auto px-4">
        {/* Hero Section - 3.9x Emphasis */}
        <section className="py-16 text-center">
          <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-bold shadow-lg animate-pulse">
            🏆 3.9x Higher Returns than Traditional Lending
          </div>

          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
            Borrow PYUSD with ETH Collateral
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Earn 13.5% APY
            </span>
          </h2>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-12">
            Deposit ETH, earn staking rewards, and borrow PYUSD stablecoin.
            <br />
            Loan positions are represented as NFTs and can be traded on OpenSea.
          </p>

          {/* Quick APY Comparison */}
          <div className="flex justify-center gap-8 mb-16">
            <div className="bg-gray-100 dark:bg-gray-800 px-8 py-6 rounded-xl shadow-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Traditional Lending (like Aave)</div>
              <div className="text-4xl font-bold text-gray-600 dark:text-gray-400">3.5% APY</div>
            </div>
            <div className="flex items-center">
              <div className="text-3xl font-bold text-gray-400">→</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 px-8 py-6 rounded-xl shadow-2xl transform scale-110">
              <div className="text-sm text-indigo-100 mb-2">SuperNeutral</div>
              <div className="text-4xl font-bold text-white">13.5% APY</div>
              <div className="text-xs text-yellow-300 mt-2 font-bold">⚡ 3.9x Higher Returns</div>
            </div>
          </div>
        </section>

        {/* Detailed Comparison Section */}
        <section className="py-16">
          <ComparisonCard />
        </section>

        {/* Why SuperNeutral? Section */}
        <section className="py-16">
          <h3 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
            Why SuperNeutral?
          </h3>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 text-lg">
            3 Innovations That Set Us Apart from Traditional Lending
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <DifferentiatorCard
              icon="🎫"
              title="NFT Loan Positions"
              before="Cannot sell or transfer loan positions"
              after="Freely tradeable as ERC-721 NFT on OpenSea"
              link="/my-loans"
            />
            <DifferentiatorCard
              icon="💰"
              title="Multi-Revenue Model"
              before="Single income stream"
              after="4 income streams: Collateral (3.5%) + Lending (5.5%) + Flash Loans (0.5%) + Idle Funds (4%)"
              link="/supply"
            />
            <DifferentiatorCard
              icon="⚖️"
              title="Flexible Risk Management"
              before="Fixed liquidation ratio (75%)"
              after="Choose liquidation ratio between 50-80%"
              link="/borrow"
            />
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="py-16">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Core Features
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              title="🏦 Borrow PYUSD"
              description="Use ETH as collateral to borrow PYUSD stablecoin on Sepolia and Arbitrum Sepolia"
              link="/borrow"
            />
            <FeatureCard
              title="🎫 NFT Positions"
              description="Loans represented as ERC-721 NFTs, transferable and tradeable"
              link="/my-loans"
            />
            <FeatureCard
              title="💰 Earn sPYUSD"
              description="Supply PYUSD to earn sPYUSD tokens with automatic yield growth"
              link="/supply"
            />
            <FeatureCard
              title="📊 Analytics Dashboard"
              description="Real-time protocol analytics powered by Blockscout, portfolio and event log tracking"
              link="/dashboard"
            />
          </div>
        </section>

        {/* Protocol Stats Section */}
        <section className="py-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">
              Protocol Statistics
            </h3>
            <div className="grid md:grid-cols-4 gap-6">
              <StatCard label="Total Supply" value="100,000 PYUSD" highlight />
              <StatCard label="Total Borrowed" value="500 PYUSD" />
              <StatCard label="Active Loans" value="1" />
              <StatCard label="ETH Price" value="$2,000" />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <h3 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
            Get Started Now
          </h3>
          <div className="flex flex-wrap justify-center gap-6">
            <Link
              href="/borrow"
              className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              🚀 Start Borrowing
            </Link>
            <Link
              href="/supply"
              className="px-10 py-5 bg-white dark:bg-gray-800 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 border-2 border-indigo-600 dark:border-indigo-400 rounded-xl font-bold text-lg hover:bg-indigo-50 dark:hover:bg-gray-700 transition shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              💰 Supply and Earn 13.5%
            </Link>
            <Link
              href="/dashboard"
              className="px-10 py-5 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              📊 Analytics Dashboard
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/90 dark:bg-gray-900/90 backdrop-blur-md mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              SuperNeutral
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              3.9x Higher Returns than Traditional Lending | Sepolia Testnet | Powered by LIDO & Pyth Oracle
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a
              href="https://sepolia.etherscan.io/address/0xe27462f8F471335cEa75Ea76BDDb05189cd599d4"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              Lending Pool Contract
            </a>
            <a
              href="https://sepolia.etherscan.io/address/0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              Loan NFT Contract
            </a>
            <a
              href="https://sepolia.etherscan.io/address/0x48D54257dE5824fd2D19e8315709B92D474b0E05"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full group hover:scale-105 border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          {description}
        </p>
      </div>
    </Link>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`text-center p-4 rounded-lg ${highlight ? 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20' : ''}`}>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent' : 'text-indigo-600 dark:text-indigo-400'}`}>
        {value}
      </p>
    </div>
  );
}
