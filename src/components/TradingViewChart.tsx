import { useEffect, useRef, memo } from 'react';
import { TradingAsset } from '../types';

interface TradingViewChartProps {
  asset: TradingAsset;
  height?: number;
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

const TradingViewChart = memo(function TradingViewChart({ asset, height = 500 }: TradingViewChartProps) {
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
  );
});

export default TradingViewChart;
