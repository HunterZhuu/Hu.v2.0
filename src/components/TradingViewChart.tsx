import { useEffect, useRef, memo } from 'react';
import { TradingAsset, TradeDirection, GameResult } from '../types';

interface TradingViewChartProps {
  asset: TradingAsset;
  height?: number;
  gameActive?: boolean;
  player1Direction?: TradeDirection | null;
  player2Direction?: TradeDirection | null;
  openPrice?: number;
  currentPrice?: number;
  result?: GameResult | null;
}

// Map our assets to TradingView symbols
const getTradingViewSymbol = (asset: TradingAsset): string => {
  const symbolMap: Record<string, string> = {
    // Crypto
    'btc': 'BINANCE:BTCUSDT',
    'eth': 'BINANCE:ETHUSDT',
    'bnb': 'BINANCE:BNBUSDT',
    'sol': 'BINANCE:SOLUSDT',
    'xrp': 'BINANCE:XRPUSDT',
    'ada': 'BINANCE:ADAUSDT',
    'doge': 'BINANCE:DOGEUSDT',
    // Commodities
    'gold': 'TVC:GOLD',
    'silver': 'TVC:SILVER',
    'oil': 'TVC:USOIL',
  };
  
  return symbolMap[asset.id] || 'BINANCE:BTCUSDT';
};

const TradingViewChart = memo(function TradingViewChart({ 
  asset, 
  height = 500,
  gameActive = false,
  player1Direction = null,
  player2Direction = null,
  openPrice = 0,
  currentPrice = 0,
  result = null
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Use ref to store stable widget ID that only changes when asset changes
  const widgetIdRef = useRef(`tradingview_${asset.id}_${Date.now()}`);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    
    // Widget configuration
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: getTradingViewSymbol(asset),
      interval: '1',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#0f1419',
      enable_publishing: false,
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      studies: [],
      container_id: widgetIdRef.current,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    });

    // Create container div
    const widgetContainer = document.createElement('div');
    widgetContainer.id = widgetIdRef.current;
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    // Append to container
    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [asset.id]); // Only depend on asset.id, not widgetId

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div 
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ 
          height: `${height}px`, 
          width: '100%',
          backgroundColor: '#0f1419',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      />
      
      {/* Player Position Indicators Overlay */}
      {gameActive && (player1Direction || player2Direction) && (
        <div className="absolute top-0 left-0 right-0 p-2 md:p-4 pointer-events-none">
          {/* Player Position Markers */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            {/* Player 1 (You) */}
            {player1Direction && (
              <div className="flex items-center gap-2 bg-blue-600/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border-2 border-blue-400">
                <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
                <div className="text-white font-bold text-sm md:text-base">
                  👤 YOU: {player1Direction === 'buy' ? '📈 BUY' : '📉 SELL'}
                </div>
              </div>
            )}
            
            {/* Player 2 (Opponent) */}
            {player2Direction && (
              <div className="flex items-center gap-2 bg-purple-600/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border-2 border-purple-400">
                <div className="w-3 h-3 bg-purple-300 rounded-full animate-pulse"></div>
                <div className="text-white font-bold text-sm md:text-base">
                  🤖 OPP: {player2Direction === 'buy' ? '📈 BUY' : '📉 SELL'}
                </div>
              </div>
            )}
          </div>
          
          {/* Price Reference Lines */}
          {openPrice > 0 && currentPrice > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm px-3 py-1.5 rounded text-xs md:text-sm">
                <span className="text-gray-400">Open:</span>
                <span className="text-white font-mono font-bold">${openPrice.toFixed(asset.pricePrecision)}</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm px-3 py-1.5 rounded text-xs md:text-sm">
                <span className="text-gray-400">Current:</span>
                <span className={`font-mono font-bold ${
                  currentPrice > openPrice ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${currentPrice.toFixed(asset.pricePrecision)}
                  <span className="ml-1 text-xs">
                    ({currentPrice > openPrice ? '↑' : '↓'} 
                    {Math.abs(((currentPrice - openPrice) / openPrice) * 100).toFixed(2)}%)
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Result Overlay */}
      {result && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`px-6 py-4 rounded-xl shadow-2xl border-4 ${
            result.winner === 'host' 
              ? 'bg-green-600/90 border-green-400' 
              : result.winner === 'challenger'
              ? 'bg-red-600/90 border-red-400'
              : 'bg-yellow-600/90 border-yellow-400'
          } backdrop-blur-sm`}>
            <div className="text-center text-white">
              <div className="text-3xl md:text-5xl mb-2">
                {result.winner === 'host' ? '🏆' : result.winner === 'challenger' ? '💀' : '🤝'}
              </div>
              <div className="text-xl md:text-3xl font-bold">
                {result.winner === 'host' ? 'YOU WIN!' : result.winner === 'challenger' ? 'YOU LOSE' : 'DRAW'}
              </div>
              <div className="text-sm md:text-base mt-2 opacity-90">
                {result.winner === 'Draw' 
                  ? 'Both players tied'
                  : `+$${result.winnerPayout}`
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default TradingViewChart;
