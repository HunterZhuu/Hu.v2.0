import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import PriceChart from './components/PriceChart';
import { CandleData, GameResult } from './types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

type GameStatus = 'waiting' | 'predicting' | 'resolved';

// Demo mode: simulate price data
function useDemoMode(enabled: boolean) {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(67500);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Initialize with some candles
    const basePrice = 67500;
    const initialCandles: CandleData[] = [];
    let price = basePrice;
    const now = Math.floor(Date.now() / 1000);

    for (let i = 30; i > 0; i--) {
      const open = price;
      const change = (Math.random() - 0.5) * 50;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 20;
      const low = Math.min(open, close) - Math.random() * 20;
      initialCandles.push({
        time: now - i * 60,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
      });
      price = close;
    }

    setCandles(initialCandles);
    setCurrentPrice(price);

    // Simulate live updates
    intervalRef.current = setInterval(() => {
      setCurrentPrice((prev) => {
        const change = (Math.random() - 0.5) * 30;
        const newPrice = prev + change;
        const now = Math.floor(Date.now() / 1000);
        const candleTime = now - (now % 60);

        setCandles((prevCandles) => {
          const newCandles = [...prevCandles];
          const lastCandle = newCandles[newCandles.length - 1];

          if (lastCandle && lastCandle.time === candleTime) {
            // Update current candle
            newCandles[newCandles.length - 1] = {
              ...lastCandle,
              close: parseFloat(newPrice.toFixed(2)),
              high: parseFloat(Math.max(lastCandle.high, newPrice).toFixed(2)),
              low: parseFloat(Math.min(lastCandle.low, newPrice).toFixed(2)),
            };
          } else {
            // New candle
            newCandles.push({
              time: candleTime,
              open: parseFloat(prev.toFixed(2)),
              high: parseFloat(Math.max(prev, newPrice).toFixed(2)),
              low: parseFloat(Math.min(prev, newPrice).toFixed(2)),
              close: parseFloat(newPrice.toFixed(2)),
            });
            if (newCandles.length > 60) newCandles.shift();
          }
          return newCandles;
        });

        return parseFloat(newPrice.toFixed(2));
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);

  return { candles, currentPrice };
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [prediction, setPrediction] = useState('');
  const [hostLocked, setHostLocked] = useState(false);
  const [challengerLocked, setChallengerLocked] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [demoPrediction, setDemoPrediction] = useState('');
  const [demoResult, setDemoResult] = useState<GameResult | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Demo mode data
  const demoData = useDemoMode(demoMode && !connected);

  useEffect(() => {
    if (demoMode && !connected) {
      setCandles(demoData.candles);
      setCurrentPrice(demoData.currentPrice);
    }
  }, [demoData.candles, demoData.currentPrice, demoMode, connected]);

  useEffect(() => {
    const newSocket = io(SERVER_URL, { transports: ['websocket', 'polling'], timeout: 5000 });

    newSocket.on('connect', () => {
      setConnected(true);
      setDemoMode(false);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('role_assigned', (assignedRole: string) => {
      setRole(assignedRole);
    });

    newSocket.on('room_full', () => {
      setMessage('Room is full! Only 2 players allowed.');
    });

    newSocket.on('game_started', (data: { message: string }) => {
      setGameStatus('predicting');
      setMessage(data.message);
      setHostLocked(false);
      setChallengerLocked(false);
      setResult(null);
    });

    newSocket.on('price_update', (data: CandleData) => {
      setCurrentPrice(data.close);
      setCandles((prev) => {
        const newCandles = [...prev];
        const lastCandle = newCandles[newCandles.length - 1];
        if (lastCandle && Math.abs(lastCandle.time - data.time) < 2) {
          newCandles[newCandles.length - 1] = data;
        } else {
          newCandles.push(data);
          if (newCandles.length > 60) newCandles.shift();
        }
        return newCandles;
      });
    });

    newSocket.on('player_locked', (player: string) => {
      if (player === 'host') setHostLocked(true);
      if (player === 'challenger') setChallengerLocked(true);
    });

    newSocket.on('both_locked', () => {
      setMessage('Both players locked! Waiting for candle close...');
    });

    newSocket.on('game_resolved', (data: GameResult) => {
      setGameStatus('resolved');
      setResult(data);
      setCountdown(8);
    });

    newSocket.on('game_reset', () => {
      setGameStatus('waiting');
      setHostLocked(false);
      setChallengerLocked(false);
      setResult(null);
      setPrediction('');
      setMessage('');
    });

    newSocket.on('connect_error', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    // Enable demo mode after timeout if not connected
    const demoTimeout = setTimeout(() => {
      if (!newSocket.connected) {
        setDemoMode(true);
      }
    }, 3000);

    return () => {
      clearTimeout(demoTimeout);
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [countdown > 0]);

  const submitPrediction = useCallback(() => {
    if (!socket || !prediction) return;
    const price = parseFloat(prediction);
    if (isNaN(price)) return;
    socket.emit('submit_prediction', price);
    setMessage('Prediction locked!');
  }, [socket, prediction]);

  // Demo mode prediction
  const submitDemoPrediction = useCallback(() => {
    if (!demoPrediction) return;
    const predPrice = parseFloat(demoPrediction);
    if (isNaN(predPrice)) return;

    // Simulate resolution after a few seconds
    setGameStatus('predicting');
    setHostLocked(true);
    setMessage('Prediction locked! Simulating candle close...');

    setTimeout(() => {
      const closePrice = currentPrice + (Math.random() - 0.5) * 20;
      const diff = Math.abs(predPrice - closePrice).toFixed(2);
      const challengerDiff = (parseFloat(diff) + Math.random() * 50).toFixed(2);
      const winner = parseFloat(diff) < parseFloat(challengerDiff) ? 'host' : 'challenger';

      setDemoResult({
        targetClosePrice: parseFloat(closePrice.toFixed(2)),
        hostDiff: diff,
        challengerDiff: challengerDiff,
        winner,
      });
      setGameStatus('resolved');
      setCountdown(8);
    }, 3000);
  }, [demoPrediction, currentPrice]);

  const getStatusColor = () => {
    switch (gameStatus) {
      case 'waiting': return 'text-yellow-400';
      case 'predicting': return 'text-green-400';
      case 'resolved': return 'text-blue-400';
    }
  };

  const getStatusText = () => {
    switch (gameStatus) {
      case 'waiting': return 'WAITING FOR PLAYERS';
      case 'predicting': return 'PREDICTION PHASE';
      case 'resolved': return 'ROUND COMPLETE';
    }
  };

  const displayResult = result || demoResult;
  const displayHostLocked = hostLocked || (demoMode && gameStatus === 'predicting');
  const isPredicting = gameStatus === 'predicting';

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white font-mono flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between bg-[#0f1419]">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ⚔️ PipDuel
          </div>
          <span className="text-xs text-gray-500 hidden sm:inline">BTC/USDT 1m Prediction</span>
          {demoMode && !connected && (
            <span className="text-xs px-2 py-0.5 bg-amber-900/40 text-amber-400 rounded border border-amber-700/50">
              DEMO
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
            <span className={`w-2 h-2 rounded-full ${gameStatus === 'predicting' ? 'bg-green-400 animate-pulse' : gameStatus === 'resolved' ? 'bg-blue-400' : 'bg-yellow-400 animate-pulse'}`}></span>
            {getStatusText()}
          </div>
          <div className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full ${connected ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></span>
            {connected ? 'Connected' : 'Offline'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0">
        {/* Chart Section */}
        <div className="flex-1 flex flex-col">
          {/* Price Display */}
          <div className="px-4 py-3 flex items-center gap-6 border-b border-gray-800 bg-[#0f1419]">
            <div>
              <div className="text-xs text-gray-500">BTC/USDT</div>
              <div className="text-2xl font-bold text-yellow-400">
                ${currentPrice > 0 ? currentPrice.toFixed(2) : '---'}
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-xs text-gray-500">Timeframe</div>
              <div className="text-sm text-white">1 Minute</div>
            </div>
            <div className="hidden sm:block">
              <div className="text-xs text-gray-500">Source</div>
              <div className="text-sm text-white">{connected ? 'Binance WS' : 'Demo'}</div>
            </div>
            {displayResult && (
              <div className="ml-auto">
                <div className="text-xs text-gray-500">Close Price</div>
                <div className="text-lg font-bold text-amber-400">${displayResult.targetClosePrice.toFixed(2)}</div>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-[300px] relative">
            <PriceChart
              candles={candles}
              currentPrice={currentPrice}
              hostPrediction={displayHostLocked ? parseFloat(demoMode ? demoPrediction || prediction : prediction) || null : null}
              challengerPrediction={null}
              targetClosePrice={displayResult?.targetClosePrice || null}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col bg-[#0f1419]">
          {/* Role Badge */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Your Role</span>
              {role && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  role === 'host' ? 'bg-blue-900/40 text-blue-400 border border-blue-700' : 'bg-purple-900/40 text-purple-400 border border-purple-700'
                }`}>
                  {role === 'host' ? '👑 HOST' : '⚔️ CHALLENGER'}
                </span>
              )}
              {!role && demoMode && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-900/40 text-amber-400 border border-amber-700">
                  👑 HOST (Demo)
                </span>
              )}
            </div>
            {!role && connected && (
              <div className="mt-2 text-sm text-yellow-400 animate-pulse">
                Waiting for role assignment...
              </div>
            )}
          </div>

          {/* Players Panel */}
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Players</h3>
            <div className="space-y-2">
              <div className={`flex items-center justify-between p-2 rounded ${displayHostLocked ? 'bg-blue-900/20' : 'bg-gray-800/30'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">👑</span>
                  <span className="text-sm">Host</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${displayHostLocked ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  {displayHostLocked ? '✓ Locked' : 'Pending'}
                </span>
              </div>
              <div className={`flex items-center justify-between p-2 rounded ${challengerLocked ? 'bg-purple-900/20' : 'bg-gray-800/30'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">⚔️</span>
                  <span className="text-sm">Challenger</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${challengerLocked ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  {challengerLocked ? '✓ Locked' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Prediction Input - Connected Mode */}
          {isPredicting && role && (
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Your Prediction</h3>
              <p className="text-xs text-gray-400 mb-3">
                Predict the closing price of this 1-minute candle
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={prediction}
                  onChange={(e) => setPrediction(e.target.value)}
                  placeholder={`e.g. ${(currentPrice + (Math.random() * 10 - 5)).toFixed(2)}`}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  disabled={role === 'host' ? hostLocked : challengerLocked}
                />
                <button
                  onClick={submitPrediction}
                  disabled={(role === 'host' ? hostLocked : challengerLocked) || !prediction}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded transition-all"
                >
                  Lock
                </button>
              </div>
              {(role === 'host' ? hostLocked : challengerLocked) && (
                <p className="text-xs text-green-400 mt-2">✓ Prediction locked!</p>
              )}
            </div>
          )}

          {/* Prediction Input - Demo Mode */}
          {isPredicting && demoMode && !role && (
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Your Prediction (Demo)</h3>
              <p className="text-xs text-gray-400 mb-3">
                Predict the closing price of this 1-minute candle
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={demoPrediction}
                  onChange={(e) => setDemoPrediction(e.target.value)}
                  placeholder={`e.g. ${currentPrice.toFixed(2)}`}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={submitDemoPrediction}
                  disabled={!demoPrediction}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded transition-all"
                >
                  Lock
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {gameStatus === 'resolved' && displayResult && (
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Round Result</h3>
              <div className="text-center py-3">
                <div className="text-xl font-bold mb-2">
                  {displayResult.winner === 'host' && <span className="text-blue-400">🏆 HOST WINS!</span>}
                  {displayResult.winner === 'challenger' && <span className="text-purple-400">🏆 CHALLENGER WINS!</span>}
                  {displayResult.winner === 'Draw' && <span className="text-yellow-400">🤝 DRAW!</span>}
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center px-3 py-2 bg-gray-800/50 rounded">
                    <span className="text-sm text-blue-400">Host</span>
                    <span className="text-sm text-gray-300">${displayResult.hostDiff} away</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-gray-800/50 rounded">
                    <span className="text-sm text-purple-400">Challenger</span>
                    <span className="text-sm text-gray-300">${displayResult.challengerDiff} away</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-amber-900/20 rounded border border-amber-800/30">
                    <span className="text-sm text-amber-400">Close Price</span>
                    <span className="text-sm text-amber-300 font-bold">${displayResult.targetClosePrice.toFixed(2)}</span>
                  </div>
                </div>
                {countdown > 0 && (
                  <div className="mt-3 text-xs text-gray-500">
                    Next round in {countdown}s...
                  </div>
                )}
                {demoMode && countdown === 0 && (
                  <button
                    onClick={() => {
                      setGameStatus('waiting');
                      setDemoResult(null);
                      setDemoPrediction('');
                    }}
                    className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded hover:from-blue-500 hover:to-purple-500 transition-all"
                  >
                    Play Again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Waiting State */}
          {gameStatus === 'waiting' && (
            <div className="p-4 border-b border-gray-800">
              <div className="text-center py-6">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-sm text-gray-400">
                  {demoMode ? 'Demo mode active - click below to start' : !role ? 'Waiting for connection...' : role === 'host' ? 'Waiting for a challenger...' : 'Game starting...'}
                </p>
                {demoMode && (
                  <button
                    onClick={() => {
                      setGameStatus('predicting');
                      setMessage('Candle is live! Lock in your prediction.');
                    }}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold rounded hover:from-amber-500 hover:to-orange-500 transition-all"
                  >
                    Start Demo Round
                  </button>
                )}
                <p className="text-xs text-gray-600 mt-2">
                  {demoMode ? 'Live BTC price data from Binance' : !role ? 'Connect to be assigned a role' : role === 'host' ? 'Share the link with a friend!' : 'Lock in your prediction soon!'}
                </p>
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className="p-4 border-b border-gray-800">
              <div className="bg-gray-800/50 rounded px-3 py-2 text-sm text-center text-gray-300">
                {message}
              </div>
            </div>
          )}

          {/* Connection Info */}
          <div className="p-4 mt-auto">
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Server:</span>
                <span className="text-gray-500">{connected ? SERVER_URL : 'Demo Mode'}</span>
              </div>
              <div className="flex justify-between">
                <span>Feed:</span>
                <span className="text-gray-500">{connected ? 'Binance WS' : 'Simulated'}</span>
              </div>
              <div className="flex justify-between">
                <span>Candles:</span>
                <span className="text-gray-500">{candles.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Banner */}
      {!connected && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 bg-gray-900/95 border border-gray-700 rounded-lg p-4 backdrop-blur-sm shadow-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl">{demoMode ? '🎮' : '⚠️'}</span>
            <div>
              <h4 className="text-sm font-bold text-white">
                {demoMode ? 'Demo Mode Active' : 'Server Not Connected'}
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                {demoMode
                  ? 'Playing with simulated BTC price data. Start the backend to play multiplayer.'
                  : 'Start the backend server on port 3000 to play multiplayer.'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
