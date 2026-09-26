import { useState } from 'react';
import TradingViewChart from './TradingViewChart';
import { TradingAsset, TradeDirection, GameResult } from '../types';

interface ChartContainerProps {
  asset: TradingAsset;
  gameActive?: boolean;
  player1Direction?: TradeDirection | null;
  player2Direction?: TradeDirection | null;
  openPrice?: number;
  currentPrice?: number;
  result?: GameResult | null;
}

type ChartSize = 'collapsed' | 'normal' | 'expanded' | 'fullscreen';

export default function ChartContainer({
  asset,
  gameActive,
  player1Direction,
  player2Direction,
  openPrice,
  currentPrice,
  result
}: ChartContainerProps) {
  const [chartSize, setChartSize] = useState<ChartSize>('normal');

  const getHeight = () => {
    switch (chartSize) {
      case 'collapsed': return 150;
      case 'normal': return 400;
      case 'expanded': return 600;
      case 'fullscreen': return window.innerHeight - 100;
      default: return 400;
    }
  };

  const handleSizeChange = (size: ChartSize) => {
    setChartSize(size);
  };

  return (
    <>
      {/* Chart Container */}
      <div 
        className={`bg-[#0f1419] border border-gray-800 rounded-lg overflow-hidden transition-all duration-300 ${
          chartSize === 'fullscreen' 
            ? 'fixed inset-0 z-50 rounded-none' 
            : 'relative'
        }`}
      >
        {/* Chart Controls */}
        <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <span className="text-2xl" style={{ color: asset.color }}>
              {asset.icon}
            </span>
            <div>
              <div className="font-bold text-white text-sm">{asset.symbol}</div>
              <div className="text-xs text-gray-500">{asset.name}</div>
            </div>
          </div>

          {/* Size Controls */}
          <div className="flex items-center gap-1">
            {/* Collapse Button */}
            <button
              onClick={() => handleSizeChange('collapsed')}
              className={`p-2 rounded transition-all ${
                chartSize === 'collapsed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              title="Collapse"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Normal Size Button */}
            <button
              onClick={() => handleSizeChange('normal')}
              className={`p-2 rounded transition-all ${
                chartSize === 'normal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              title="Normal size"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            {/* Expand Button */}
            <button
              onClick={() => handleSizeChange('expanded')}
              className={`p-2 rounded transition-all ${
                chartSize === 'expanded'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              title="Expand"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={() => handleSizeChange(chartSize === 'fullscreen' ? 'normal' : 'fullscreen')}
              className={`p-2 rounded transition-all ${
                chartSize === 'fullscreen'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              title="Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {chartSize === 'fullscreen' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Chart Area */}
        <div 
          className="transition-all duration-300"
          style={{ height: `${getHeight()}px` }}
        >
          <TradingViewChart 
            asset={asset} 
            height={getHeight()}
            gameActive={gameActive}
            player1Direction={player1Direction}
            player2Direction={player2Direction}
            openPrice={openPrice}
            currentPrice={currentPrice}
            result={result}
          />
        </div>

        {/* Quick Info Bar */}
        {chartSize !== 'collapsed' && currentPrice && currentPrice > 0 && (
          <div className="flex items-center justify-between p-3 border-t border-gray-800 bg-gray-900/50 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500">Open: </span>
                <span className="text-white font-mono">${openPrice?.toFixed(asset.pricePrecision)}</span>
              </div>
              <div>
                <span className="text-gray-500">Current: </span>
                <span className={`font-mono font-bold ${
                  currentPrice > (openPrice || 0) ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${currentPrice.toFixed(asset.pricePrecision)}
                </span>
              </div>
            </div>
            {openPrice && (
              <div className={`font-bold ${
                currentPrice > openPrice ? 'text-green-400' : 'text-red-400'
              }`}>
                {currentPrice > openPrice ? '↑' : '↓'} 
                {Math.abs(((currentPrice - openPrice) / openPrice) * 100).toFixed(2)}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Overlay Close Button */}
      {chartSize === 'fullscreen' && (
        <button
          onClick={() => handleSizeChange('normal')}
          className="fixed top-4 right-4 z-50 p-3 bg-gray-900/90 hover:bg-gray-800 text-white rounded-full shadow-lg transition-all"
          title="Exit fullscreen"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </>
  );
}
