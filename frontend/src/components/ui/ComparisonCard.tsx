export default function ComparisonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="text-center py-6 bg-gradient-to-r from-indigo-500 to-purple-600">
        <h3 className="text-2xl font-bold text-white mb-2">
          Why Choose SuperNeutral?
        </h3>
        <p className="text-indigo-100">Same ETH collateral, radically higher returns</p>
      </div>

      <div className="grid md:grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
        {/* Aave Side */}
        <div className="p-8 bg-gray-50 dark:bg-gray-900">
          <div className="text-center mb-6">
            <div className="text-gray-400 text-sm font-medium mb-2">Traditional Lending Protocol</div>
            <h4 className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-1">Aave</h4>
            <div className="text-4xl font-bold text-gray-500 dark:text-gray-500">3.5% APY</div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Collateral Yield</span>
              <span className="font-semibold text-gray-500">0%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Lending Interest</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">3.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Flash Loan Revenue</span>
              <span className="font-semibold text-gray-500">0%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Idle Funds Yield</span>
              <span className="font-semibold text-gray-500">0%</span>
            </div>
            <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-700 dark:text-gray-300">Total Yield</span>
                <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">3.5%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            ❌ No NFT Loan Positions<br />
            ❌ No Collateral Yield<br />
            ❌ No Flash Loan Revenue
          </div>
        </div>

        {/* SuperNeutral Side */}
        <div className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 relative">
          {/* 3.9x Better Badge */}
          <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg transform rotate-12 animate-pulse">
            <div className="text-2xl font-bold">3.9x</div>
            <div className="text-xs">Higher Returns</div>
          </div>

          <div className="text-center mb-6">
            <div className="text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-2">Multi-Revenue Yield Structure</div>
            <h4 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-1">SuperNeutral</h4>
            <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">13.5% APY</div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Collateral Yield (LIDO)</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">3.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Lending Interest</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">5.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Flash Loan Revenue</span>
              <span className="font-semibold text-pink-600 dark:text-pink-400">0.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Idle Funds Yield (sPYUSD)</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">4.0%</span>
            </div>
            <div className="pt-4 border-t border-indigo-300 dark:border-indigo-600">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800 dark:text-gray-200">Total Yield</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">13.5%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-indigo-700 dark:text-indigo-300">
            ✅ NFT Loan Positions (OpenSea trading)<br />
            ✅ 4 Revenue Sources Integrated<br />
            ✅ Flexible Liquidation Ratio (50-80%)
          </div>

          <div className="mt-6">
            <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg font-bold hover:from-indigo-700 hover:to-purple-700 transition shadow-lg">
              🚀 Start Earning 13.5%
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
