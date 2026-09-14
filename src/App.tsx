import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import PriceChart from './components/PriceChart';
import PaymentModal from './components/PaymentModal';
import Leaderboard from './components/Leaderboard';
import { CandleData, GameResult, PredictionDirection, LeaderboardEntry } from './types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const MAX_BET = 10;
const SERVICE_CHARGE_PERCENT = 5;
const INITIAL_BALANCE = 100;
const PLAYER_ID = 'player_' + Math.random().toString(36).substring(7);
const PLAYER_NAME = 'Player_' + PLAYER_ID.substring(7, 11).toUpperCase();

type GameStatus = 'waiting' | 'betting' | 'predicting' | 'resolved';

interface PlayerBet {
  player: string;
  bet: number;
  serviceCharge: number;
}

// Load leaderboard from localStorage
function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const data = localStorage.getItem('pipduel_leaderboard');
    if (data) return JSON.parse(data);
  } catch {}
  return [];
}

// Save leaderboard to localStorage
function saveLeaderboard(entries: LeaderboardEntry[]) {
  try {
    localStorage.setItem('pipduel_leaderboard', JSON.stringify(entries));
  } catch {}
}

// Update leaderboard with game result
function updateLeaderboard(
  entries: LeaderboardEntry[],
  playerId: string,
  playerName: string,
  won: boolean,
  earnings: number
): LeaderboardEntry[] {
  const existing = entries.find(e => e.id === playerId);
  let updated: LeaderboardEntry[];

  if (existing) {
    updated = entries.map(e => {
      if (e.id === playerId) {
        const newWins = won ? e.wins + 1 : e.wins;
        const newLosses = won ? e.losses : e.losses + 1;
        const newStreak = won ? e.streak + 1 : 0;
        return {
          ...e,
          wins: newWins,
          losses: newLosses,
          winRate: ((newWins / (newWins + newLosses)) * 100) || 0,
          totalEarnings: e.totalEarnings + earnings,
          streak: newStreak,
        };
      }
      return e;
    });
  } else {
    const newEntry: LeaderboardEntry = {
      id: playerId,
      name: playerName,
      wins: won ? 1 : 0,
      losses: won ? 0 : 1,
      winRate: won ? 100 : 0,
      totalEarnings: earnings,
      streak: won ? 1 : 0,
    };
    updated = [...entries, newEntry];
  }

  saveLeaderboard(updated);
  return updated;
}

// Demo mode: simulate price data
function useDemoMode(enabled: boolean) {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(67500);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

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
            newCandles[newCandles.length - 1] = {
              ...lastCandle,
              close: parseFloat(newPrice.toFixed(2)),
              high: parseFloat(Math.max(lastCandle.high, newPrice).toFixed(2)),
              low: parseFloat(Math.min(lastCandle.low, newPrice).toFixed(2)),
            };
          } else {
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
  const [openPrice, setOpenPrice] = useState(0);
  const [myPrediction, setMyPrediction] = useState<PredictionDirection>(null);
  const [hostLocked, setHostLocked] = useState(false);
  const [challengerLocked, setChallengerLocked] = useState(false);
  const [hostPrediction, setHostPrediction] = useState<PredictionDirection>(null);
  const [challengerPrediction, setChallengerPrediction] = useState<PredictionDirection>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [demoResult, setDemoResult] = useState<GameResult | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Betting state
  const [betAmount, setBetAmount] = useState('');
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [hostBet, setHostBet] = useState(0);
  const [challengerBet, setChallengerBet] = useState(0);
  const [hostServiceCharge, setHostServiceCharge] = useState(0);
  const [challengerServiceCharge, setChallengerServiceCharge] = useState(0);
  const [pot, setPot] = useState(0);
  const [totalServiceCharge, setTotalServiceCharge] = useState(0);
  const [betError, setBetError] = useState('');
  const [hostBetPlaced, setHostBetPlaced] = useState(false);
  const [challengerBetPlaced, setChallengerBetPlaced] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Countdown timer state
  const [candleCountdown, setCandleCountdown] = useState(60);
  const candleCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Demo mode data
  const demoData = useDemoMode(demoMode && !connected);

  // Load leaderboard on mount
  useEffect(() => {
    setLeaderboard(loadLeaderboard());
  }, []);

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

    newSocket.on('balance_update', (data: { balance: number }) => {
      setBalance(data.balance);
    });

    newSocket.on('bet_error', (error: string) => {
      setBetError(error);
      setTimeout(() => setBetError(''), 3000);
    });

    newSocket.on('player_bet', (data: PlayerBet) => {
      if (data.player === 'host') {
        setHostBet(data.bet);
        setHostServiceCharge(data.serviceCharge);
        setHostBetPlaced(true);
      } else {
        setChallengerBet(data.bet);
        setChallengerServiceCharge(data.serviceCharge);
        setChallengerBetPlaced(true);
      }
    });

    newSocket.on('game_started', (data: { message: string }) => {
      setGameStatus('betting');
      setMessage(data.message);
      setHostBetPlaced(false);
      setChallengerBetPlaced(false);
      setHostBet(0);
      setChallengerBet(0);
      setPot(0);
      setTotalServiceCharge(0);
      setMyPrediction(null);
      setHostPrediction(null);
      setChallengerPrediction(null);
      setHostLocked(false);
      setChallengerLocked(false);
    });

    newSocket.on('both_bet', (data: { message: string, pot: number, serviceCharge: number }) => {
      setGameStatus('predicting');
      setMessage(data.message);
      setPot(data.pot);
      setTotalServiceCharge(data.serviceCharge);
    });

    newSocket.on('price_update', (data: CandleData) => {
      setCurrentPrice(data.close);
      setOpenPrice(data.open);
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

    newSocket.on('player_locked', (data: { player: string, prediction: PredictionDirection }) => {
      if (data.player === 'host') {
        setHostLocked(true);
        setHostPrediction(data.prediction);
      } else {
        setChallengerLocked(true);
        setChallengerPrediction(data.prediction);
      }
    });

    newSocket.on('both_locked', () => {
      setMessage('Both players locked predictions! Waiting for candle close...');
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
      setHostBetPlaced(false);
      setChallengerBetPlaced(false);
      setHostBet(0);
      setChallengerBet(0);
      setResult(null);
      setBetAmount('');
      setMyPrediction(null);
      setHostPrediction(null);
      setChallengerPrediction(null);
      setMessage('');
      setPot(0);
      setTotalServiceCharge(0);
    });

    newSocket.on('connect_error', () => {
      setConnected(false);
    });

    setSocket(newSocket);

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

  // Countdown timer for candle close
  useEffect(() => {
    if (gameStatus === 'predicting' || gameStatus === 'betting') {
      if (connected) {
        const updateCountdown = () => {
          const now = Math.floor(Date.now() / 1000);
          const secondsUntilClose = 60 - (now % 60);
          setCandleCountdown(secondsUntilClose);
        };

        updateCountdown();
        candleCountdownRef.current = setInterval(updateCountdown, 1000);

        return () => {
          if (candleCountdownRef.current) {
            clearInterval(candleCountdownRef.current);
          }
        };
      } else if (demoMode) {
        setCandleCountdown(30);
        candleCountdownRef.current = setInterval(() => {
          setCandleCountdown(prev => {
            if (prev <= 1) {
              if (candleCountdownRef.current) clearInterval(candleCountdownRef.current);
              // Auto-resolve demo game when countdown hits 0
              if (gameStatus === 'predicting' && myPrediction) {
                resolveDemoGame();
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => {
          if (candleCountdownRef.current) {
            clearInterval(candleCountdownRef.current);
          }
        };
      }
    } else {
      setCandleCountdown(60);
    }
  }, [gameStatus, connected, demoMode, myPrediction]);

  const resolveDemoGame = useCallback(() => {
    const closePrice = currentPrice + (Math.random() - 0.5) * 20;
    const priceWentUp = closePrice > openPrice;
    
    // Host prediction (player)
    const hostCorrect = myPrediction === 'buy' ? priceWentUp : !priceWentUp;
    // Challenger prediction (simulated opponent)
    const challengerPred: PredictionDirection = Math.random() > 0.5 ? 'buy' : 'sell';
    const challengerCorrect = challengerPred === 'buy' ? priceWentUp : !priceWentUp;

    let winner = 'Draw';
    let winnerPayout = '0.00';

    if (hostCorrect && !challengerCorrect) {
      winner = 'host';
      winnerPayout = pot.toFixed(2);
      setBalance(prev => prev + pot);
      setLeaderboard(prev => updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, true, pot));
    } else if (!hostCorrect && challengerCorrect) {
      winner = 'challenger';
      winnerPayout = pot.toFixed(2);
      setLeaderboard(prev => updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, false, -hostBet));
    } else if (hostCorrect && challengerCorrect) {
      // Both correct - split pot
      const splitAmount = pot / 2;
      winner = 'Draw';
      winnerPayout = splitAmount.toFixed(2);
      setBalance(prev => prev + splitAmount);
      setLeaderboard(prev => updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, true, splitAmount - hostBet));
    } else {
      // Both wrong - house keeps pot
      winner = 'House';
      setLeaderboard(prev => updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, false, -hostBet));
    }

    const gameResult: GameResult = {
      targetClosePrice: parseFloat(closePrice.toFixed(2)),
      openPrice: openPrice,
      hostPrediction: myPrediction,
      challengerPrediction: challengerPred,
      hostCorrect,
      challengerCorrect,
      winner,
      winnerPayout,
      pot: pot.toFixed(2),
      serviceChargeCollected: totalServiceCharge.toFixed(2),
    };

    setDemoResult(gameResult);
    setGameStatus('resolved');
    setCountdown(8);
  }, [currentPrice, openPrice, myPrediction, pot, totalServiceCharge, hostBet]);

  // Handle deposit from payment modal
  const handleDeposit = useCallback((amount: number, method: string) => {
    if (connected && socket) {
      socket.emit('deposit', { amount, method });
    } else {
      setBalance(prev => prev + amount);
    }
    setMessage(`Deposited $${amount.toFixed(2)} via ${method}`);
    setTimeout(() => setMessage(''), 3000);
  }, [connected, socket]);

  const placeBet = useCallback(() => {
    if (!socket || !betAmount) return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setBetError('Invalid bet amount');
      return;
    }
    if (amount > MAX_BET) {
      setBetError(`Maximum bet is $${MAX_BET}`);
      return;
    }
    if (amount > balance) {
      setBetError('Insufficient balance');
      return;
    }
    socket.emit('place_bet', amount);
    setBetError('');
  }, [socket, betAmount, balance]);

  const submitPrediction = useCallback((direction: PredictionDirection) => {
    if (!socket || !direction) return;
    setMyPrediction(direction);
    socket.emit('submit_prediction', direction);
    setMessage('Prediction locked!');
  }, [socket]);

  // Demo mode betting
  const placeDemoBet = useCallback(() => {
    if (!betAmount) return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0 || amount > MAX_BET || amount > balance) {
      setBetError('Invalid bet or insufficient balance');
      return;
    }
    
    const serviceCharge = (amount * SERVICE_CHARGE_PERCENT) / 100;
    setBalance(prev => prev - amount - serviceCharge);
    setHostBet(amount);
    setHostServiceCharge(serviceCharge);
    setHostBetPlaced(true);
    setPot(prev => prev + amount);
    setTotalServiceCharge(prev => prev + serviceCharge);
    setBetError('');
  }, [betAmount, balance]);

  // Demo mode prediction
  const submitDemoPrediction = useCallback((direction: PredictionDirection) => {
    if (!direction) return;
    setMyPrediction(direction);
    setHostLocked(true);
    setChallengerLocked(true);
    setMessage('Predictions locked! Watch the countdown...');
  }, []);

  const getStatusColor = () => {
    switch (gameStatus) {
      case 'waiting': return 'text-yellow-400';
      case 'betting': return 'text-orange-400';
      case 'predicting': return 'text-green-400';
      case 'resolved': return 'text-blue-400';
    }
  };

  const getStatusText = () => {
    switch (gameStatus) {
      case 'waiting': return 'WAITING FOR PLAYERS';
      case 'betting': return 'BETTING PHASE';
      case 'predicting': return 'PREDICTION PHASE';
      case 'resolved': return 'ROUND COMPLETE';
    }
  };

  const displayResult = result || demoResult;
  const isBetting = gameStatus === 'betting';
  const isPredicting = gameStatus === 'predicting';
  const myBet = role === 'host' ? hostBet : (demoMode ? hostBet : 0);
  const myBetPlaced = role === 'host' ? hostBetPlaced : (demoMode ? hostBetPlaced : false);

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white font-mono flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between bg-[#0f1419]">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ⚔️ PipDuel
          </div>
          <span className="text-xs text-gray-500 hidden sm:inline">BTC/USDT 1m • Buy or Sell</span>
          {demoMode && !connected && (
            <span className="text-xs px-2 py-0.5 bg-amber-900/40 text-amber-400 rounded border border-amber-700/50">
              DEMO
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-xs font-bold rounded transition-all flex items-center gap-1"
          >
            <span>🏆</span>
            <span className="hidden sm:inline">Leaderboard</span>
          </button>
          <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
            <span className={`w-2 h-2 rounded-full ${
              gameStatus === 'predicting' ? 'bg-green-400 animate-pulse' : 
              gameStatus === 'betting' ? 'bg-orange-400 animate-pulse' :
              gameStatus === 'resolved' ? 'bg-blue-400' : 'bg-yellow-400 animate-pulse'
            }`}></span>
            <span className="hidden sm:inline">{getStatusText()}</span>
          </div>
          <div className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full ${connected ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></span>
            {connected ? 'Live' : 'Offline'}
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
            {openPrice > 0 && (
              <div className="hidden sm:block">
                <div className="text-xs text-gray-500">Open</div>
                <div className={`text-sm font-bold ${currentPrice >= openPrice ? 'text-green-400' : 'text-red-400'}`}>
                  ${openPrice.toFixed(2)}
                </div>
              </div>
            )}
            {/* Pot Display */}
            {pot > 0 && (
              <div className="hidden sm:block">
                <div className="text-xs text-gray-500">Pot</div>
                <div className="text-sm font-bold text-green-400">${pot.toFixed(2)}</div>
              </div>
            )}
            {/* Countdown Timer */}
            {(gameStatus === 'predicting' || gameStatus === 'betting') && (
              <div className="ml-auto">
                <div className="text-xs text-gray-500 mb-1">
                  {gameStatus === 'betting' ? 'Betting closes in' : 'Winner in'}
                </div>
                <div className={`text-3xl font-bold font-mono ${
                  candleCountdown <= 10 ? 'text-red-500 animate-pulse' :
                  candleCountdown <= 30 ? 'text-yellow-500' :
                  'text-green-500'
                }`}>
                  {candleCountdown}s
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-1000 ${
                      candleCountdown <= 10 ? 'bg-red-500' :
                      candleCountdown <= 30 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${(candleCountdown / 60) * 100}%` }}
                  />
                </div>
              </div>
            )}
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
              hostPrediction={null}
              challengerPrediction={null}
              targetClosePrice={displayResult?.targetClosePrice || null}
            />
            {/* Large Countdown Overlay */}
            {gameStatus === 'predicting' && hostLocked && challengerLocked && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-2">🏆 Winner Determined In</div>
                    <div className={`text-7xl font-bold font-mono ${
                      candleCountdown <= 10 ? 'text-red-500 animate-pulse scale-110' :
                      candleCountdown <= 30 ? 'text-yellow-500' :
                      'text-green-500'
                    } transition-all duration-300`}>
                      {candleCountdown}
                    </div>
                    <div className="text-sm text-gray-400 mt-2">seconds</div>
                  </div>
                </div>
              </div>
            )}
            {/* Betting Phase Countdown */}
            {gameStatus === 'betting' && (
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
                <div className="text-xs text-gray-400">Betting closes in</div>
                <div className={`text-2xl font-bold font-mono ${
                  candleCountdown <= 10 ? 'text-red-500 animate-pulse' :
                  candleCountdown <= 30 ? 'text-yellow-500' :
                  'text-green-500'
                }`}>
                  {candleCountdown}s
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col bg-[#0f1419] overflow-y-auto">
          {/* Balance & Role */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Your Balance</span>
                <span className="text-lg font-bold text-green-400">${balance.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-bold rounded transition-all flex items-center gap-1"
              >
                <span>+</span>
                <span>Deposit</span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Your Role</span>
              {(role || demoMode) && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  role === 'host' || demoMode ? 'bg-blue-900/40 text-blue-400 border border-blue-700' : 'bg-purple-900/40 text-purple-400 border border-purple-700'
                }`}>
                  {role === 'host' || demoMode ? '👑 HOST' : '⚔️ CHALLENGER'}
                </span>
              )}
            </div>
          </div>

          {/* Pot & Service Charge */}
          {(pot > 0 || totalServiceCharge > 0) && (
            <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-green-900/10 to-blue-900/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">💰 Total Pot</span>
                <span className="text-xl font-bold text-green-400">${pot.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">🏦 Service Fee ({SERVICE_CHARGE_PERCENT}%)</span>
                <span className="text-sm font-bold text-amber-400">${totalServiceCharge.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Players Panel */}
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Players</h3>
            <div className="space-y-2">
              <div className={`p-3 rounded-lg ${hostBetPlaced ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-gray-800/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">👑</span>
                    <span className="text-sm font-bold">Host</span>
                  </div>
                  {hostBetPlaced && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white">
                      ${hostBet.toFixed(2)}
                    </span>
                  )}
                </div>
                {hostPrediction && (
                  <div className={`text-xs mt-1 font-bold ${hostPrediction === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                    {hostPrediction === 'buy' ? '📈 BUY (Up)' : '📉 SELL (Down)'}
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-lg ${challengerBetPlaced ? 'bg-purple-900/20 border border-purple-800/30' : 'bg-gray-800/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">⚔️</span>
                    <span className="text-sm font-bold">Challenger</span>
                  </div>
                  {challengerBetPlaced && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-600 text-white">
                      ${challengerBet.toFixed(2)}
                    </span>
                  )}
                </div>
                {challengerPrediction && (
                  <div className={`text-xs mt-1 font-bold ${challengerPrediction === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                    {challengerPrediction === 'buy' ? '📈 BUY (Up)' : '📉 SELL (Down)'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Betting Phase */}
          {isBetting && (
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Place Your Bet</h3>
              <p className="text-xs text-gray-400 mb-2">
                Max bet: <span className="text-green-400 font-bold">${MAX_BET}</span> | Fee: <span className="text-amber-400 font-bold">{SERVICE_CHARGE_PERCENT}%</span>
              </p>
              {betError && (
                <div className="mb-2 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-400">
                  {betError}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  max={MAX_BET}
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder={`Max $${MAX_BET}`}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  disabled={myBetPlaced}
                />
                <button
                  onClick={connected ? placeBet : placeDemoBet}
                  disabled={myBetPlaced || !betAmount}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded transition-all"
                >
                  Bet
                </button>
              </div>
              {betAmount && !myBetPlaced && (
                <div className="mt-2 text-xs text-gray-400">
                  Total cost: <span className="text-white">${(parseFloat(betAmount) + (parseFloat(betAmount) * SERVICE_CHARGE_PERCENT / 100)).toFixed(2)}</span>
                  {' '}(bet + fee)
                </div>
              )}
              {myBetPlaced && (
                <p className="text-xs text-green-400 mt-2">✓ Bet placed! Now choose your prediction.</p>
              )}
            </div>
          )}

          {/* Prediction Phase - Buy/Sell Buttons */}
          {isPredicting && !myPrediction && (
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Your Prediction</h3>
              <p className="text-xs text-gray-400 mb-4">
                Will BTC price go <span className="text-green-400 font-bold">UP</span> or <span className="text-red-400 font-bold">DOWN</span> by candle close?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => connected ? submitPrediction('buy') : submitDemoPrediction('buy')}
                  className="py-4 bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white font-bold rounded-lg transition-all flex flex-col items-center gap-2 border-2 border-green-500/30 hover:border-green-400/60 hover:scale-105"
                >
                  <span className="text-3xl">📈</span>
                  <span className="text-lg">BUY</span>
                  <span className="text-xs opacity-75">Price goes UP</span>
                </button>
                <button
                  onClick={() => connected ? submitPrediction('sell') : submitDemoPrediction('sell')}
                  className="py-4 bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-lg transition-all flex flex-col items-center gap-2 border-2 border-red-500/30 hover:border-red-400/60 hover:scale-105"
                >
                  <span className="text-3xl">📉</span>
                  <span className="text-lg">SELL</span>
                  <span className="text-xs opacity-75">Price goes DOWN</span>
                </button>
              </div>
              <div className="mt-3 text-xs text-center text-gray-500">
                Your bet: <span className="text-green-400 font-bold">${myBet.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Prediction Locked */}
          {isPredicting && myPrediction && (
            <div className="p-4 border-b border-gray-800">
              <div className={`p-4 rounded-lg border-2 ${
                myPrediction === 'buy' ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'
              }`}>
                <div className="text-center">
                  <div className="text-3xl mb-2">
                    {myPrediction === 'buy' ? '📈' : '📉'}
                  </div>
                  <div className={`text-lg font-bold ${myPrediction === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                    {myPrediction === 'buy' ? 'BUY (UP)' : 'SELL (DOWN)'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">✓ Prediction Locked</div>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {gameStatus === 'resolved' && displayResult && (
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Round Result</h3>
              <div className="text-center py-3">
                <div className="text-xl font-bold mb-2">
                  {displayResult.winner === 'host' && <span className="text-blue-400">🏆 YOU WIN!</span>}
                  {displayResult.winner === 'challenger' && <span className="text-purple-400">💀 CHALLENGER WINS</span>}
                  {displayResult.winner === 'Draw' && <span className="text-yellow-400">🤝 DRAW - POT SPLIT</span>}
                  {displayResult.winner === 'House' && <span className="text-gray-400">🏦 HOUSE WINS</span>}
                </div>

                {/* Price Movement */}
                <div className="my-3 p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Price Movement</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-300">${displayResult.openPrice.toFixed(2)}</span>
                    <span className={`text-lg ${displayResult.targetClosePrice >= displayResult.openPrice ? 'text-green-400' : 'text-red-400'}`}>
                      →
                    </span>
                    <span className="text-sm text-gray-300">${displayResult.targetClosePrice.toFixed(2)}</span>
                    <span className={`text-sm font-bold ${displayResult.targetClosePrice >= displayResult.openPrice ? 'text-green-400' : 'text-red-400'}`}>
                      ({displayResult.targetClosePrice >= displayResult.openPrice ? '📈 UP' : '📉 DOWN'})
                    </span>
                  </div>
                </div>

                {/* Predictions */}
                <div className="space-y-2 mt-3">
                  <div className={`flex justify-between items-center px-3 py-2 rounded ${displayResult.hostCorrect ? 'bg-green-900/20 border border-green-800/30' : 'bg-red-900/20 border border-red-800/30'}`}>
                    <span className="text-sm text-blue-400">You ({displayResult.hostPrediction === 'buy' ? 'BUY' : 'SELL'})</span>
                    <span className={`text-sm font-bold ${displayResult.hostCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {displayResult.hostCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center px-3 py-2 rounded ${displayResult.challengerCorrect ? 'bg-green-900/20 border border-green-800/30' : 'bg-red-900/20 border border-red-800/30'}`}>
                    <span className="text-sm text-purple-400">Opponent ({displayResult.challengerPrediction === 'buy' ? 'BUY' : 'SELL'})</span>
                    <span className={`text-sm font-bold ${displayResult.challengerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {displayResult.challengerCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-green-900/20 rounded border border-green-800/30">
                    <span className="text-sm text-green-400">Winner Gets</span>
                    <span className="text-sm text-green-300 font-bold">${displayResult.winnerPayout}</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-amber-900/20 rounded border border-amber-800/30">
                    <span className="text-sm text-amber-400">Service Fee</span>
                    <span className="text-sm text-amber-300 font-bold">${displayResult.serviceChargeCollected}</span>
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
                      setMyPrediction(null);
                      setHostBetPlaced(false);
                      setChallengerBetPlaced(false);
                      setHostBet(0);
                      setPot(0);
                      setTotalServiceCharge(0);
                      setHostLocked(false);
                      setChallengerLocked(false);
                      setHostPrediction(null);
                      setChallengerPrediction(null);
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
                      setGameStatus('betting');
                      setMessage('Place your bets!');
                      setHostBetPlaced(false);
                      setChallengerBetPlaced(true);
                      setChallengerBet(5);
                      setChallengerServiceCharge(0.25);
                      setPot(5);
                      setTotalServiceCharge(0.25);
                    }}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold rounded hover:from-amber-500 hover:to-orange-500 transition-all"
                  >
                    Start Demo Round
                  </button>
                )}
                <p className="text-xs text-gray-600 mt-2">
                  {demoMode ? 'Predict if price goes UP or DOWN' : !role ? 'Connect to be assigned a role' : role === 'host' ? 'Share the link with a friend!' : 'Get ready!'}
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

          {/* Leaderboard */}
          {showLeaderboard && (
            <div className="p-4 border-b border-gray-800">
              <Leaderboard entries={leaderboard} currentPlayerId={PLAYER_ID} />
            </div>
          )}

          {/* Connection Info */}
          <div className="p-4 mt-auto">
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Player:</span>
                <span className="text-gray-500">{PLAYER_NAME}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Bet:</span>
                <span className="text-gray-500">${MAX_BET}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee:</span>
                <span className="text-gray-500">{SERVICE_CHARGE_PERCENT}%</span>
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
        <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 bg-gray-900/95 border border-gray-700 rounded-lg p-4 backdrop-blur-sm shadow-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl">{demoMode ? '🎮' : '⚠️'}</span>
            <div>
              <h4 className="text-sm font-bold text-white">
                {demoMode ? 'Demo Mode Active' : 'Server Not Connected'}
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                {demoMode
                  ? `Predict UP or DOWN! Max bet: $${MAX_BET} | Fee: ${SERVICE_CHARGE_PERCENT}%`
                  : 'Start the backend server on port 3000 to play multiplayer.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onDeposit={handleDeposit}
        currentBalance={balance}
      />
    </div>
  );
}
