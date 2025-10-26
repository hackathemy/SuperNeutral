export default function ComparisonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="text-center py-6 bg-gradient-to-r from-indigo-500 to-purple-600">
        <h3 className="text-2xl font-bold text-white mb-2">
          수익률 비교: 왜 SuperNeutral인가?
        </h3>
        <p className="text-indigo-100">동일한 ETH 담보, 완전히 다른 수익</p>
      </div>

      <div className="grid md:grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
        {/* Aave Side */}
        <div className="p-8 bg-gray-50 dark:bg-gray-900">
          <div className="text-center mb-6">
            <div className="text-gray-400 text-sm font-medium mb-2">기존 렌딩 프로토콜</div>
            <h4 className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-1">Aave</h4>
            <div className="text-4xl font-bold text-gray-500 dark:text-gray-500">8% APY</div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">담보 수익</span>
              <span className="font-semibold text-gray-500">0%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">대출 이자</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">8%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Flash Loan</span>
              <span className="font-semibold text-gray-500">0%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">유휴 자금</span>
              <span className="font-semibold text-gray-500">0%</span>
            </div>
            <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-700 dark:text-gray-300">총 수익률</span>
                <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">8%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            ❌ NFT 대출 포지션 없음<br />
            ❌ 담보 수익 없음<br />
            ❌ Flash Loan 수익 없음
          </div>
        </div>

        {/* SuperNeutral Side */}
        <div className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 relative">
          {/* 2.7x Better Badge */}
          <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg transform rotate-12 animate-pulse">
            <div className="text-2xl font-bold">2.7배</div>
            <div className="text-xs">더 높은 수익</div>
          </div>

          <div className="text-center mb-6">
            <div className="text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-2">혁신적인 수익 구조</div>
            <h4 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-1">SuperNeutral</h4>
            <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">21.5% APY</div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">담보 수익 (LIDO)</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">7%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">대출 이자</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">12%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Flash Loan</span>
              <span className="font-semibold text-pink-600 dark:text-pink-400">1.6%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">유휴 자금 (sPYUSD)</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">0.9%</span>
            </div>
            <div className="pt-4 border-t border-indigo-300 dark:border-indigo-600">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800 dark:text-gray-200">총 수익률</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">21.5%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-indigo-700 dark:text-indigo-300">
            ✅ NFT 대출 포지션 (OpenSea 거래)<br />
            ✅ 4가지 수익원 통합<br />
            ✅ 유연한 청산 비율 (50-80%)
          </div>

          <div className="mt-6">
            <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg font-bold hover:from-indigo-700 hover:to-purple-700 transition shadow-lg">
              🚀 21.5% 수익 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
