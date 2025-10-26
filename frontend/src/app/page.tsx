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
        {/* Hero Section - 2.7x Emphasis */}
        <section className="py-16 text-center">
          <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-bold shadow-lg animate-pulse">
            🏆 기존 렌딩보다 2.7배 높은 수익
          </div>

          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
            ETH 담보로 PYUSD 대출
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              수익은 21.5% APY
            </span>
          </h2>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-12">
            ETH를 예치하고 스테이킹 보상을 받으며, PYUSD 스테이블코인을 대출하세요.
            <br />
            대출 포지션은 NFT로 표현되어 OpenSea에서 거래할 수 있습니다.
          </p>

          {/* Quick APY Comparison */}
          <div className="flex justify-center gap-8 mb-16">
            <div className="bg-gray-100 dark:bg-gray-800 px-8 py-6 rounded-xl shadow-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Aave 같은 기존 렌딩</div>
              <div className="text-4xl font-bold text-gray-600 dark:text-gray-400">8% APY</div>
            </div>
            <div className="flex items-center">
              <div className="text-3xl font-bold text-gray-400">→</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 px-8 py-6 rounded-xl shadow-2xl transform scale-110">
              <div className="text-sm text-indigo-100 mb-2">SuperNeutral</div>
              <div className="text-4xl font-bold text-white">21.5% APY</div>
              <div className="text-xs text-yellow-300 mt-2 font-bold">⚡ 2.7배 더 높은 수익</div>
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
            왜 SuperNeutral인가?
          </h3>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 text-lg">
            기존 렌딩 프로토콜과 완전히 다른 3가지 혁신
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <DifferentiatorCard
              icon="🎫"
              title="NFT 대출 포지션"
              before="대출 포지션을 팔거나 양도할 수 없음"
              after="ERC-721 NFT로 OpenSea에서 자유롭게 거래 가능"
              link="/my-loans"
            />
            <DifferentiatorCard
              icon="💰"
              title="3배 수익 구조"
              before="대출 이자만 받음 (단일 수익원)"
              after="담보 수익(7%) + 대출(12%) + Flash Loan(1.6%) + 유휴자금(0.9%) = 4가지 수익원"
              link="/supply"
            />
            <DifferentiatorCard
              icon="⚖️"
              title="유연한 리스크 관리"
              before="고정된 청산 비율 (75%)"
              after="50-80% 사이에서 선택 가능한 청산 비율"
              link="/borrow"
            />
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="py-16">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            핵심 기능
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              title="🏦 PYUSD 대출"
              description="ETH를 담보로 PYUSD 대출. Sepolia (직접) 및 Arbitrum Sepolia (Avail Nexus 크로스체인) 지원"
              link="/borrow"
            />
            <FeatureCard
              title="🎫 NFT 포지션"
              description="대출이 ERC-721 NFT로 표현되어 양도 및 거래 가능"
              link="/my-loans"
            />
            <FeatureCard
              title="💰 sPYUSD 획득"
              description="PYUSD를 공급하고 이자가 자동으로 증가하는 sPYUSD 토큰 획득"
              link="/supply"
            />
            <FeatureCard
              title="📊 분석 대시보드"
              description="Blockscout 기반 실시간 프로토콜 분석, 포트폴리오 및 이벤트 로그 확인"
              link="/dashboard"
            />
          </div>
        </section>

        {/* Protocol Stats Section */}
        <section className="py-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">
              프로토콜 통계
            </h3>
            <div className="grid md:grid-cols-4 gap-6">
              <StatCard label="총 공급량" value="100,000 PYUSD" highlight />
              <StatCard label="총 대출량" value="500 PYUSD" />
              <StatCard label="활성 대출" value="1개" />
              <StatCard label="ETH 가격" value="$2,000" />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <h3 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
            지금 바로 시작하세요
          </h3>
          <div className="flex flex-wrap justify-center gap-6">
            <Link
              href="/borrow"
              className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              🚀 대출 시작하기
            </Link>
            <Link
              href="/supply"
              className="px-10 py-5 bg-white dark:bg-gray-800 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 border-2 border-indigo-600 dark:border-indigo-400 rounded-xl font-bold text-lg hover:bg-indigo-50 dark:hover:bg-gray-700 transition shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              💰 공급하고 21.5% 받기
            </Link>
            <Link
              href="/dashboard"
              className="px-10 py-5 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              📊 분석 대시보드
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
              기존 렌딩보다 2.7배 높은 수익 | Sepolia 테스트넷 | LIDO & Pyth Oracle 기반
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
