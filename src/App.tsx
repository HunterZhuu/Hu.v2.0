import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import TradingViewChart from './components/TradingViewChart';
import AssetSelector from './components/AssetSelector';
import { CandleData, GameResult, TradeDirection, TradingAsset, TRADING_ASSETS } from './types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const MAX_BET = 10;
const SERVICE_FEE = 5; // 5%
const INITIAL_BALANCE = 100;

// Fetch live prices from free APIs
async function fetchLivePrice(asset: TradingAsset): Promise<{ price: number; source: string } | null> {
  try {
    if (asset.category === 'crypto') {
      const symbol = asset.binanceSymbol || `${asset.id}usdt`;
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`, {
        signal: AbortSignal.timeout(3000)
      });
      const data = await res.json();
      if (data.price) return { price: parseFloat(data.price), source: 'Binance' };
    } else if (asset.id === 'gold' || asset.id === 'silver') {
      const metal = asset.id === 'gold' ? 'XAU' : 'XAG';
      const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${metal}`, {
        signal: AbortSignal.timeout(3000)
      });
      const data = await res.json();
      if (data.rates?.[metal]) return { price: 1 / data.rates[metal], source: 'Frankfurter' };
    } else if (asset.id === 'oil') {
      const res = await fetch('https://api.api-ninjas.com/v1/commodityprice?name=crude_oil', {
        headers: { 'X-Api-Key': 'demo' },
        signal: AbortSignal.timeout(3000)
      });
      const data = await res.json();
      if (data.price) return { price: data.price, source: 'API Ninjas' };
    }
  } catch (err) {
    console.error('Price fetch failed:', err);
  }
  return null;
}

export default function App() {
  // Core state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  
  // Asset & price
  const [selectedAsset, setSelectedAsset] = useState<TradingAsset>(TRADING_ASSETS[0]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [openPrice, setOpenPrice] = useState(0);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [dataSource, setDataSource] = useState('');
  
  // Game state
  const [gameStatus, setGameStatus] = useState<'waiting' | 'setup' | 'resolved'>('waiting');
  const [timerDuration, setTimerDuration] = useState<30 | 60>(60);
  const [countdown, setCountdown] = useState(0);
  const [betAmount, setBetAmount] = useState(0);
  const [myDirection, setMyDirection] = useState<TradeDirection | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  
  // User state
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [scores, setScores] = useState({ host: 0, challenger: 0 });
  const [message, setMessage] = useState('');
  
  // UI state
  const [showAssets, setShowAssets] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  const countdownRef = useRef<any>(null);
  const priceIntervalRef = useRef<any>(null);

  // Load scores
  useEffect(() => {
    const saved = localStorage.getItem('pipduel_scores');
    if (saved) setScores(JSON.parse(saved));
  }, []);

  // Save scores
  useEffect(() => {
    localStorage.setItem('pipduel_scores', JSON.stringify(scores));
  }, [scores]);

  // Fetch prices for demo mode
  useEffect(() => {
    if (!demoMode) return;

    const updatePrice = async () => {
      const data = await fetchLivePrice(selectedAsset);
      if (data) {
        setCurrentPrice(data.price);
        setDataSource(data.source);
        
        // Update candles
        const now = Math.floor(Date.now() / 1000);
        const candleTime = now - (now % 60);
        
        setCandles(prev => {
          const last = prev[prev.length - 1];
          if (last && last.time === candleTime) {
            return [...prev.slice(0, -1), {
              ...last,
              close: data.price,
              high: Math.max(last.high, data.price),
              low: Math.min(last.low, data.price)
            }];
          } else {
            const newCandle = {
              time: candleTime,
              open: data.price,
              high: data.price,
              low: data.price,
              close: data.price
            };
            return [...prev, newCandle].slice(-60);
          }
        });
      }
    };

    updatePrice();
    priceIntervalRef.current = setInterval(updatePrice, selectedAsset.category === 'crypto' ? 2000 : 5000);

    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, [demoMode, selectedAsset]);

  // Socket connection
  useEffect(() => {
    if (demoMode) {
      if (socket) socket.disconnect();
      setConnected(false);
      return;
    }

    const newSocket = io(SERVER_URL, { timeout: 5000 });
    
    newSocket.on('connect', () => {
      setConnected(true);
      setDemoMode(false);
    });

    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('price_update', (data: any) => {
      if (data.asset !== selectedAsset.id) return;
      setCurrentPrice(data.close);
      setOpenPrice(data.open);
      setDataSource(data.source || 'Server');
      
      setCandles(prev => {
        const last = prev[prev.length - 1];
        if (last && Math.abs(last.time - data.time) < 2) {
          return [...prev.slice(0, -1), data];
        }
        return [...prev, data].slice(-60);
      });
    });

    newSocket.on('game_resolved', (data: GameResult) => {
      setResult(data);
      setGameStatus('resolved');
      setCountdown(8);
      
      if (data.winner === 'host') {
        setScores(prev => ({ ...prev, host: prev.host + 1 }));
        setBalance(prev => prev + parseFloat(data.winnerPayout || '0'));
      } else if (data.winner === 'challenger') {
        setScores(prev => ({ ...prev, challenger: prev.challenger + 1 }));
      }
    });

    newSocket.on('game_reset', () => {
      setGameStatus('waiting');
      setResult(null);
      setMyDirection(null);
      setBetAmount(0);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [demoMode, selectedAsset.id]);

  // Countdown timer
  useEffect(() => {
    if (gameStatus !== 'resolved' || countdown <= 0) return;

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [gameStatus, countdown]);

  // Reset when asset changes
  useEffect(() => {
    setCandles([]);
    setCurrentPrice(0);
    setDataSource('Loading...');
  }, [selectedAsset.id]);

  const startGame = () => {
    setGameStatus('setup');
    setMyDirection(null);
    setBetAmount(0);
    setResult(null);
  };

  const placeBet = (amount: number, direction: TradeDirection) => {
    if (amount > balance) {
      setMessage('Insufficient balance');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const fee = amount * (SERVICE_FEE / 100);
    setBalance(prev => prev - amount - fee);
    setBetAmount(amount);
    setMyDirection(direction);
    setGameStatus('resolved');
    setCountdown(timerDuration);

    if (demoMode) {
      // Simulate opponent
      setTimeout(() => {
        const closePrice = currentPrice + (Math.random() - 0.5) * 20;
        const priceWentUp = closePrice > currentPrice;
        const opponentDir: TradeDirection = direction === 'buy' ? 'sell' : 'buy';
        
        const iCorrect = (direction === 'buy' && priceWentUp) || (direction === 'sell' && !priceWentUp);
        const oppCorrect = (opponentDir === 'buy' && priceWentUp) || (opponentDir === 'sell' && !priceWentUp);

        let winner = 'Draw';
        let payout = '0';

        if (iCorrect && !oppCorrect) {
          winner = 'host';
          payout = (amount * 2).toFixed(2);
          setBalance(prev => prev + amount * 2);
        } else if (!iCorrect && oppCorrect) {
          winner = 'challenger';
          payout = (amount * 2).toFixed(2);
        } else {
          payout = amount.toFixed(2);
          setBalance(prev => prev + amount);
        }

        setResult({
          targetClosePrice: closePrice,
          openPrice: currentPrice,
          priceChange: closePrice - currentPrice,
          hostBetDirection: direction,
          challengerBetDirection: opponentDir,
          hostCorrect: iCorrect,
          challengerCorrect: oppCorrect,
          winner,
          winnerPayout: payout,
          pot: (amount * 2).toFixed(2),
          serviceChargeCollected: (fee * 2).toFixed(2),
          hostScore: scores.host + (winner === 'host' ? 1 : 0),
          challengerScore: scores.challenger + (winner === 'challenger' ? 1 : 0)
        });
      }, timerDuration * 1000);
    } else if (socket) {
      socket.emit('place_bet', { amount, direction });
    }
  };

  const resetGame = () => {
    setGameStatus('waiting');
    setResult(null);
    setMyDirection(null);
    setBetAmount(0);
    setCountdown(0);
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white font-mono">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 bg-[#0f1419] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              ⚔️ PipDuel
            </h1>
            <button
              onClick={() => setShowAssets(!showAssets)}
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm flex items-center gap-2"
            >
              <span style={{ color: selectedAsset.color }}>{selectedAsset.icon}</span>
              <span>{selectedAsset.symbol}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-500">Balance</div>
              <div className="text-sm font-bold text-green-400">${balance.toFixed(2)}</div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-center">
                <div className="text-xs text-blue-400">Host</div>
                <div className="text-lg font-bold">{scores.host}</div>
              </div>
              <div className="text-gray-600">vs</div>
              <div className="text-center">
                <div className="text-xs text-purple-400">Guest</div>
                <div className="text-lg font-bold">{scores.challenger}</div>
              </div>
            </div>

            <button
              onClick={() => setDemoMode(!demoMode)}
              className={`px-3 py-1 rounded text-xs font-bold ${
                demoMode 
                  ? 'bg-amber-900/40 text-amber-400 border border-amber-700' 
                  : 'bg-green-900/40 text-green-400 border border-green-700'
              }`}
            >
              {demoMode ? '🎮 Demo' : '🌐 Live'}
            </button>

            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="px-3 py-1 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 rounded text-xs font-bold"
            >
              🏆
            </button>
          </div>
        </div>
      </header>

      {/* Asset Selector Modal */}
      {showAssets && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1419] border border-gray-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-bold">Select Asset</h2>
              <button onClick={() => setShowAssets(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <AssetSelector
              selectedAsset={selectedAsset}
              onAssetChange={(asset) => {
                setSelectedAsset(asset);
                setShowAssets(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1419] border border-gray-700 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-bold">🏆 Leaderboard</h2>
              <button onClick={() => setShowLeaderboard(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-4">
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">🏆</div>
                <div className="text-sm">Leaderboard coming soon!</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Price Display */}
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span style={{ color: selectedAsset.color }}>{selectedAsset.icon}</span>
                    <span>{selectedAsset.symbol}</span>
                    {dataSource && <span className="text-green-400">●</span>}
                  </div>
                  <div className="text-3xl font-bold" style={{ color: selectedAsset.color }}>
                    ${currentPrice > 0 ? currentPrice.toFixed(selectedAsset.pricePrecision) : '---'}
                  </div>
                  {dataSource && (
                    <div className="text-xs text-gray-500 mt-1">{dataSource}</div>
                  )}
                </div>
                
                {gameStatus === 'resolved' && countdown > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Result in</div>
                    <div className={`text-4xl font-bold ${
                      countdown <= 5 ? 'text-red-500 animate-pulse' :
                      countdown <= 15 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {countdown}s
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <div className="h-[500px]">
                <TradingViewChart asset={selectedAsset} height={500} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Timer Selection */}
            {gameStatus === 'waiting' && (
              <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-bold mb-3">Round Duration</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTimerDuration(30)}
                    className={`py-3 rounded font-bold ${
                      timerDuration === 30
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-2xl">⚡</div>
                    <div className="text-sm">30s</div>
                  </button>
                  <button
                    onClick={() => setTimerDuration(60)}
                    className={`py-3 rounded font-bold ${
                      timerDuration === 60
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-2xl">⏱️</div>
                    <div className="text-sm">60s</div>
                  </button>
                </div>
              </div>
            )}

            {/* Game Controls */}
            {gameStatus === 'waiting' && (
              <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
                <button
                  onClick={startGame}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded"
                >
                  Start Round
                </button>
              </div>
            )}

            {/* Betting Phase */}
            {gameStatus === 'setup' && (
              <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-bold mb-2">Bet Amount</h3>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[10, 15, 20].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBetAmount(amount)}
                        className={`py-2 rounded font-bold ${
                          betAmount === amount
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={MAX_BET}
                    value={betAmount || ''}
                    onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Custom"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  />
                </div>

                {betAmount > 0 && (
                  <div>
                    <h3 className="text-sm font-bold mb-2">Your Prediction</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => placeBet(betAmount, 'buy')}
                        className="py-4 bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 rounded font-bold"
                      >
                        <div className="text-3xl">📈</div>
                        <div>BUY</div>
                      </button>
                      <button
                        onClick={() => placeBet(betAmount, 'sell')}
                        className="py-4 bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 rounded font-bold"
                      >
                        <div className="text-3xl">📉</div>
                        <div>SELL</div>
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 text-center">
                      Fee: ${((betAmount * SERVICE_FEE) / 100).toFixed(2)} | 
                      Total: ${(betAmount + (betAmount * SERVICE_FEE) / 100).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {gameStatus === 'resolved' && result && (
              <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 space-y-3">
                <div className="text-center">
                  {result.winner === 'host' && (
                    <div className="text-2xl font-bold text-green-400 mb-2">🏆 YOU WIN!</div>
                  )}
                  {result.winner === 'challenger' && (
                    <div className="text-2xl font-bold text-red-400 mb-2">💀 YOU LOSE</div>
                  )}
                  {result.winner === 'Draw' && (
                    <div className="text-2xl font-bold text-yellow-400 mb-2">🤝 DRAW</div>
                  )}
                </div>

                <div className="bg-gray-800/50 rounded p-3">
                  <div className="text-xs text-gray-400 mb-1">Price Movement</div>
                  <div className="flex items-center justify-between text-sm">
                    <span>${result.openPrice.toFixed(selectedAsset.pricePrecision)}</span>
                    <span className={result.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                      → ${result.targetClosePrice.toFixed(selectedAsset.pricePrecision)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className={`flex justify-between p-2 rounded ${
                    result.hostCorrect ? 'bg-green-900/20' : 'bg-red-900/20'
                  }`}>
                    <span>You ({result.hostBetDirection === 'buy' ? 'BUY' : 'SELL'})</span>
                    <span className={result.hostCorrect ? 'text-green-400' : 'text-red-400'}>
                      {result.hostCorrect ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className={`flex justify-between p-2 rounded ${
                    result.challengerCorrect ? 'bg-green-900/20' : 'bg-red-900/20'
                  }`}>
                    <span>Opponent ({result.challengerBetDirection === 'buy' ? 'BUY' : 'SELL'})</span>
                    <span className={result.challengerCorrect ? 'text-green-400' : 'text-red-400'}>
                      {result.challengerCorrect ? '✓' : '✗'}
                    </span>
                  </div>
                </div>

                {countdown === 0 && (
                  <button
                    onClick={resetGame}
                    className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded"
                  >
                    Play Again
                  </button>
                )}
              </div>
            )}

            {/* Message */}
            {message && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center text-sm">
                {message}
              </div>
            )}

            {/* Info */}
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Mode:</span>
                <span>{demoMode ? 'Demo' : 'Live'}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Bet:</span>
                <span>${MAX_BET}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee:</span>
                <span>{SERVICE_FEE}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
