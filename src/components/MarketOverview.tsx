import { useState, useEffect } from 'react';
import { TradingAsset, TRADING_ASSETS } from '../types';

interface MarketOverviewProps {
  onSelectAsset: (asset: TradingAsset) => void;
  selectedAsset: TradingAsset;
}

interface MarketData {
  asset: TradingAsset;
  price: number;
  change24h: number;
  changePercent: number;
}

export default function MarketOverview({ onSelectAsset, selectedAsset }: MarketOverviewProps) {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'crypto' | 'commodity'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch live prices for all assets
  useEffect(() => {
    const fetchAllPrices = async () => {
      const data: MarketData[] = [];

      for (const asset of TRADING_ASSETS) {
        try {
          let price = 0;
          
          if (asset.category === 'crypto') {
            const symbol = asset.binanceSymbol || `${asset.id}usdt`;
            const res = await fetch(
              `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`,
              { signal: AbortSignal.timeout(3000) }
            );
            const json = await res.json();
            if (json.lastPrice) {
              price = parseFloat(json.lastPrice);
              const change = parseFloat(json.priceChange);
              const changePercent = parseFloat(json.priceChangePercent);
              data.push({ asset, price, change24h: change, changePercent });
            }
          } else if (asset.id === 'gold' || asset.id === 'silver') {
            const metal = asset.id === 'gold' ? 'XAU' : 'XAG';
            const res = await fetch(
              `https://api.frankfurter.app/latest?from=USD&to=${metal}`,
              { signal: AbortSignal.timeout(3000) }
            );
            const json = await res.json();
            if (json.rates?.[metal]) {
              price = 1 / json.rates[metal];
              // Simulate 24h change
              const change = price * (Math.random() * 0.02 - 0.01);
              data.push({ asset, price, change24h: change, changePercent: (change / price) * 100 });
            }
          } else if (asset.id === 'oil') {
            const res = await fetch(
              'https://api.api-ninjas.com/v1/commodityprice?name=crude_oil',
              { headers: { 'X-Api-Key': 'demo' }, signal: AbortSignal.timeout(3000) }
            );
            const json = await res.json();
            if (json.price) {
              price = json.price;
              const change = price * (Math.random() * 0.03 - 0.015);
              data.push({ asset, price, change24h: change, changePercent: (change / price) * 100 });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch ${asset.name}:`, err);
        }
      }

      setMarketData(data);
    };

    fetchAllPrices();
    const interval = setInterval(fetchAllPrices, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const filteredData = marketData
    .filter(d => {
      if (activeCategory === 'all') return true;
      return d.asset.category === activeCategory;
    })
    .filter(d => 
      d.asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="bg-[#0f1419] border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📊</span>
            <span>Markets</span>
          </h2>
          <span className="text-xs text-gray-500">{marketData.length} instruments</span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search markets..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 mb-3"
        />

        {/* Category Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeCategory === 'all'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveCategory('crypto')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeCategory === 'crypto'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Crypto
          </button>
          <button
            onClick={() => setActiveCategory('commodity')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeCategory === 'commodity'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Commodities
          </button>
        </div>
      </div>

      {/* Market List */}
      <div className="max-h-[600px] overflow-y-auto">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm">No markets found</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredData.map((data) => (
              <button
                key={data.asset.id}
                onClick={() => onSelectAsset(data.asset)}
                className={`w-full p-4 hover:bg-gray-800/50 transition-colors text-left ${
                  selectedAsset.id === data.asset.id ? 'bg-gray-800/30 border-l-4 border-amber-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" style={{ color: data.asset.color }}>
                      {data.asset.icon}
                    </span>
                    <div>
                      <div className="font-bold text-white">{data.asset.symbol}</div>
                      <div className="text-xs text-gray-500">{data.asset.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">
                      ${data.price.toFixed(data.asset.pricePrecision)}
                    </div>
                    <div className={`text-xs font-bold ${
                      data.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {data.changePercent >= 0 ? '▲' : '▼'} {Math.abs(data.changePercent).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
