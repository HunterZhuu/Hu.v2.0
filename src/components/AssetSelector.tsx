import { TradingAsset, TRADING_ASSETS } from '../types';

interface AssetSelectorProps {
  selectedAsset: TradingAsset;
  onAssetChange: (asset: TradingAsset) => void;
}

export default function AssetSelector({ selectedAsset, onAssetChange }: AssetSelectorProps) {
  const cryptoAssets = TRADING_ASSETS.filter(a => a.category === 'crypto');
  const commodityAssets = TRADING_ASSETS.filter(a => a.category === 'commodity');

  return (
    <div className="p-4 border-b border-gray-800">
      <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Select Asset</h3>
      
      {/* Cryptocurrencies */}
      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-2 font-semibold">Cryptocurrencies</div>
        <div className="grid grid-cols-2 gap-2">
          {cryptoAssets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onAssetChange(asset)}
              className={`p-3 rounded-lg transition-all border-2 ${
                selectedAsset.id === asset.id
                  ? 'border-opacity-100 scale-105 shadow-lg'
                  : 'border-opacity-30 hover:border-opacity-60 hover:scale-102'
              }`}
              style={{
                backgroundColor: selectedAsset.id === asset.id ? `${asset.color}20` : '#1f2937',
                borderColor: asset.color
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl" style={{ color: asset.color }}>{asset.icon}</span>
                <div className="text-left">
                  <div className="text-sm font-bold text-white">{asset.symbol}</div>
                  <div className="text-xs text-gray-400">{asset.name}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Commodities */}
      <div>
        <div className="text-xs text-gray-400 mb-2 font-semibold">Commodities</div>
        <div className="grid grid-cols-2 gap-2">
          {commodityAssets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onAssetChange(asset)}
              className={`p-3 rounded-lg transition-all border-2 ${
                selectedAsset.id === asset.id
                  ? 'border-opacity-100 scale-105 shadow-lg'
                  : 'border-opacity-30 hover:border-opacity-60 hover:scale-102'
              }`}
              style={{
                backgroundColor: selectedAsset.id === asset.id ? `${asset.color}20` : '#1f2937',
                borderColor: asset.color
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{asset.icon}</span>
                <div className="text-left">
                  <div className="text-sm font-bold text-white">{asset.symbol}</div>
                  <div className="text-xs text-gray-400">{asset.name}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
