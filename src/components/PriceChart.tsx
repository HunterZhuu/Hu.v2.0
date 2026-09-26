import { useEffect, useRef } from 'react';
import { CandleData } from '../types';

interface PriceChartProps {
  candles: CandleData[];
  currentPrice: number;
  hostPrediction: number | null;
  challengerPrediction: number | null;
  targetClosePrice: number | null;
}

export default function PriceChart({
  candles,
  currentPrice,
  hostPrediction,
  challengerPrediction,
  targetClosePrice,
}: PriceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 80, bottom: 40, left: 10 };

    // Clear
    ctx.fillStyle = '#0f1419';
    ctx.fillRect(0, 0, width, height);

    if (candles.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for price data...', width / 2, height / 2);
      return;
    }

    // Calculate price range
    const allPrices = candles.flatMap((c) => [c.high, c.low]);
    if (hostPrediction) allPrices.push(hostPrediction);
    if (challengerPrediction) allPrices.push(challengerPrediction);
    if (targetClosePrice) allPrices.push(targetClosePrice);
    allPrices.push(currentPrice);

    const minPrice = Math.min(...allPrices) * 0.9999;
    const maxPrice = Math.max(...allPrices) * 1.0001;
    const priceRange = maxPrice - minPrice;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const priceToY = (price: number) => {
      return padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    };

    // Draw grid lines
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 0.5;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice - (priceRange / gridLines) * i;
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`$${price.toFixed(2)}`, width - padding.right + 5, y + 4);
    }

    // Draw candles
    const candleWidth = Math.max(2, (chartWidth / Math.max(candles.length, 1)) * 0.7);
    const candleGap = chartWidth / Math.max(candles.length, 1);

    candles.forEach((candle, i) => {
      const x = padding.left + i * candleGap + candleGap / 2;
      const isGreen = candle.close >= candle.open;

      // Wick
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, priceToY(candle.high));
      ctx.lineTo(x, priceToY(candle.low));
      ctx.stroke();

      // Body
      const bodyTop = priceToY(Math.max(candle.open, candle.close));
      const bodyBottom = priceToY(Math.min(candle.open, candle.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);

      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // Draw current price line
    const currentY = priceToY(currentPrice);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentY);
    ctx.lineTo(width - padding.right, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price label
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`$${currentPrice.toFixed(2)}`, width - padding.right + 5, currentY + 4);

    // Draw prediction lines
    if (hostPrediction) {
      const predY = priceToY(hostPrediction);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, predY);
      ctx.lineTo(width - padding.right, predY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`H: $${hostPrediction.toFixed(2)}`, padding.left + 5, predY - 5);
    }

    if (challengerPrediction) {
      const predY = priceToY(challengerPrediction);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, predY);
      ctx.lineTo(width - padding.right, predY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`C: $${challengerPrediction.toFixed(2)}`, padding.left + 5, predY - 5);
    }

    // Draw target close price
    if (targetClosePrice) {
      const targetY = priceToY(targetClosePrice);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding.left, targetY);
      ctx.lineTo(width - padding.right, targetY);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`CLOSE: $${targetClosePrice.toFixed(2)}`, padding.left + 5, targetY - 5);
    }
  }, [candles, currentPrice, hostPrediction, challengerPrediction, targetClosePrice]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
