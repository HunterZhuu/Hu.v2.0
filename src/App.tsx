import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import PriceChart from './components/PriceChart';
import PaymentModal from './components/PaymentModal';
import Leaderboard from './components/Leaderboard';
import RegistrationModal, { UserData } from './components/RegistrationModal';
import { CandleData, GameResult, TradeDirection, LeaderboardEntry } from './types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const MAX_BET = 10;
const SERVICE_CHARGE_PERCENT = 5;
const INITIAL_BALANCE = 100;
const PLAYER_ID = 'player_' + Math.random().toString(36).substring(7);
const PLAYER_NAME = 'Player_' + PLAYER_ID.substring(7, 11).toUpperCase();

type GameStatus = 'waiting' | 'setup' | 'betting' | 'resolved';

// Load leaderboard from localStorage
function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const data = localStorage.getItem('pipduel_leaderboard');
    if (data) return JSON.parse(data);
  } catch {}
  return [];
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  try {
    localStorage.setItem('pipduel_leaderboard', JSON.stringify(entries));
  } catch {}
}

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

// Load scores from localStorage
function loadScores(): { host: number; challenger: number } {
  try {
    const data = localStorage.getItem('pipduel_scores');
    if (data) return JSON.parse(data);
  } catch {}
  return { host: 0, challenger: 0 };
}

function saveScores(scores: { host: number; challenger: number }) {
  try {
    localStorage.setItem('pipduel_scores', JSON.stringify(scores));
  } catch {}
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
  const [myBetDirection, setMyBetDirection] = useState<TradeDirection | null>(null);
  const [hostBetDirection, setHostBetDirection] = useState<TradeDirection | null>(null);
  const [challengerBetDirection, setChallengerBetDirection] = useState<TradeDirection | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [demoResult, setDemoResult] = useState<GameResult | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer selection
  const [timerDuration, setTimerDuration] = useState<30 | 60>(60);
  const [candleCountdown, setCandleCountdown] = useState(60);
  const candleCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Score counter
  const [scores, setScores] = useState<{ host: number; challenger: number }>({ host: 0, challenger: 0 });

  // Betting state
  const [betAmount, setBetAmount] = useState('');
  const [agreedBetAmount, setAgreedBetAmount] = useState(0); // The amount both players agreed to
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [hostBetPlaced, setHostBetPlaced] = useState(false);
  const [challengerBetPlaced, setChallengerBetPlaced] = useState(false);
  const [betError, setBetError] = useState('');

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // User registration state
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [selectedBetAmount, setSelectedBetAmount] = useState<number | null>(null);
  const [customBetAmount, setCustomBetAmount] = useState('');

  // Demo mode data
  const demoData = useDemoMode(demoMode && !connected);

  // Load leaderboard and scores on mount
  useEffect(() => {
    setLeaderboard(loadLeaderboard());
    setScores(loadScores());
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

    newSocket.on('bet_amount_set', (data: { amount: number }) => {
      setAgreedBetAmount(data.amount);
      setMessage(`Both players agreed to bet $${data.amount.toFixed(2)} each!`);
    });

    newSocket.on('player_bet', (data: { player: string; direction: TradeDirection }) => {
      if (data.player === 'host') {
        setHostBetDirection(data.direction);
        setHostBetPlaced(true);
      } else {
        setChallengerBetDirection(data.direction);
        setChallengerBetPlaced(true);
      }
    });

    newSocket.on('game_started', (data: { message: string }) => {
      setGameStatus('betting');
      setMessage(data.message);
      setHostBetPlaced(false);
      setChallengerBetPlaced(false);
      setHostBetDirection(null);
      setChallengerBetDirection(null);
      setAgreedBetAmount(0);
      setMyBetDirection(null);
    });

    newSocket.on('both_bet', (data: { message: string; pot: number }) => {
      setGameStatus('resolved');
      setMessage(data.message);
      setCandleCountdown(timerDuration);
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

    newSocket.on('game_resolved', (data: GameResult) => {
      setResult(data);
      setCountdown(8);
      // Update scores
      const newScores = { ...scores };
      if (data.winner === 'host') newScores.host++;
      else if (data.winner === 'challenger') newScores.challenger++;
      setScores(newScores);
      saveScores(newScores);
    });

    newSocket.on('game_reset', () => {
      setGameStatus('waiting');
      setHostBetPlaced(false);
      setChallengerBetPlaced(false);
      setHostBetDirection(null);
      setChallengerBetDirection(null);
      setResult(null);
      setBetAmount('');
      setAgreedBetAmount(0);
      setMyBetDirection(null);
      setMessage('');
      setCandleCountdown(timerDuration);
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
  }, [timerDuration, scores]);

  // Countdown timer
  useEffect(() => {
    if (gameStatus === 'resolved' && candleCountdown > 0) {
      if (connected) {
        candleCountdownRef.current = setInterval(() => {
          setCandleCountdown(prev => {
            if (prev <= 1) {
              if (candleCountdownRef.current) clearInterval(candleCountdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (demoMode) {
        candleCountdownRef.current = setInterval(() => {
          setCandleCountdown(prev => {
            if (prev <= 1) {
              if (candleCountdownRef.current) clearInterval(candleCountdownRef.current);
              if (myBetDirection) {
                resolveDemoGame();
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      return () => {
        if (candleCountdownRef.current) {
          clearInterval(candleCountdownRef.current);
        }
      };
    }
  }, [gameStatus, connected, demoMode, myBetDirection, candleCountdown]);

  const resolveDemoGame = useCallback(() => {
    const closePrice = currentPrice + (Math.random() - 0.5) * 20;
    const priceWentUp = closePrice > openPrice;
    const priceChange = closePrice - openPrice;

    // Simulate opponent with opposite direction
    const opponentDirection: TradeDirection = myBetDirection === 'buy' ? 'sell' : 'buy';
    setChallengerBetDirection(opponentDirection);
    setChallengerBetPlaced(true);

    const pot = agreedBetAmount * 2;
    const serviceCharge = (agreedBetAmount * SERVICE_CHARGE_PERCENT) / 100 * 2;

    // Determine winner
    const hostCorrect = (myBetDirection === 'buy' && priceWentUp) || (myBetDirection === 'sell' && !priceWentUp);
    const challengerCorrect = (opponentDirection === 'buy' && priceWentUp) || (opponentDirection === 'sell' && !priceWentUp);

    let winner = 'Draw';
    let winnerPayout = '0.00';

    if (hostCorrect && !challengerCorrect) {
      winner = 'host';
      winnerPayout = pot.toFixed(2);
      setBalance(prev => prev + pot);
      setScores(prev => {
        const newScores = { ...prev, host: prev.host + 1 };
        saveScores(newScores);
        return newScores;
      });
      setLeaderboard(prev => updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, true, pot - agreedBetAmount));
    } else if (!hostCorrect && challengerCorrect) {
      winner = 'challenger';
      winnerPayout = pot.toFixed(2);
      setScores(prev => {
        const newScores = { ...prev, challenger: prev.challenger + 1 };
        saveScores(newScores);
        return newScores;
      });
      setLeaderboard(prev => updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, false, -agreedBetAmount));
    } else {
      // Both correct or both wrong - split pot
      const splitAmount = pot / 2;
      winnerPayout = splitAmount.toFixed(2);
      setBalance(prev => prev + splitAmount);
      setLeaderboard(prev => updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, true, splitAmount - agreedBetAmount));
    }

    const gameResult: GameResult = {
      targetClosePrice: parseFloat(closePrice.toFixed(2)),
      openPrice: openPrice,
      priceChange: parseFloat(priceChange.toFixed(2)),
      hostBetDirection: myBetDirection!,
      challengerBetDirection: opponentDirection,
      hostCorrect,
      challengerCorrect,
      winner,
      winnerPayout,
      pot: pot.toFixed(2),
      serviceChargeCollected: serviceCharge.toFixed(2),
      hostScore: scores.host + (winner === 'host' ? 1 : 0),
      challengerScore: scores.challenger + (winner === 'challenger' ? 1 : 0),
    };

    setDemoResult(gameResult);
    setCountdown(8);
  }, [currentPrice, openPrice, myBetDirection, agreedBetAmount, scores]);

  const handleDeposit = useCallback((amount: number, method: string) => {
    if (connected && socket) {
      socket.emit('deposit', { amount, method });
    } else {
      setBalance(prev => prev + amount);
    }
    setMessage(`Deposited $${amount.toFixed(2)} via ${method}`);
    setTimeout(() => setMessage(''), 3000);
  }, [connected, socket]);

  const proposeBetAmount = useCallback(() => {
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
    socket.emit('propose_bet_amount', amount);
    setBetError('');
    setMessage(`Proposed bet: $${amount.toFixed(2)} - Waiting for opponent to accept...`);
  }, [socket, betAmount, balance]);

  const acceptBetAmount = useCallback(() => {
    if (!socket || !myBetDirection) return;
    socket.emit('accept_bet_and_direction', { direction: myBetDirection });
    setBetError('');
  }, [socket, myBetDirection]);

  const placeDemoBet = useCallback(() => {
    if (!betAmount || !myBetDirection) return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0 || amount > MAX_BET || amount > balance) {
      setBetError('Invalid bet or insufficient balance');
      return;
    }

    const serviceCharge = (amount * SERVICE_CHARGE_PERCENT) / 100;
    setBalance(prev => prev - amount - serviceCharge);
    setHostBetDirection(myBetDirection);
    setHostBetPlaced(true);
    setAgreedBetAmount(amount);
    setBetError('');

    // Start countdown
    setGameStatus('resolved');
    setCandleCountdown(timerDuration);
  }, [betAmount, balance, myBetDirection, timerDuration]);

  const getStatusColor = () => {
    switch (gameStatus) {
      case 'waiting': return 'text-yellow-400';
      case 'setup': return 'text-purple-400';
      case 'betting': return 'text-orange-400';
      case 'resolved': return 'text-blue-400';
    }
  };

  const getStatusText = () => {
    switch (gameStatus) {
      case 'waiting': return 'WAITING FOR PLAYERS';
      case 'setup': return 'SETUP PHASE';
      case 'betting': return 'BETTING PHASE';
      case 'resolved': return 'ROUND IN PROGRESS';
    }
  };

  const displayResult = result || demoResult;
  const pot = agreedBetAmount * 2;

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white font-mono flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between bg-[#0f1419]">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ⚔️ PipDuel
          </div>
          <span className="text-xs text-gray-500 hidden sm:inline">BTC/USDT • Buy or Sell</span>
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
          {!currentUser ? (
            <button
              onClick={() => setShowRegistration(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold rounded transition-all flex items-center gap-1"
            >
              <span>👤</span>
              <span className="hidden sm:inline">Login/Register</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {currentUser.isPremium && (
                <span className="text-xs px-2 py-1 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded font-bold">
                  ⭐ Premium
                </span>
              )}
              <span className="text-xs text-gray-400 hidden sm:inline">
                {currentUser.username}
              </span>
            </div>
          )}
          <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
            <span className={`w-2 h-2 rounded-full ${
              gameStatus === 'resolved' ? 'bg-blue-400 animate-pulse' :
              gameStatus === 'betting' ? 'bg-orange-400 animate-pulse' :
              'bg-yellow-400 animate-pulse'
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
          {/* Price Display with Score Counter */}
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
            {/* Score Counter */}
            <div className="flex items-center gap-4 ml-auto">
              <div className="text-center">
                <div className="text-xs text-blue-400 mb-1">👑 Host</div>
                <div className="text-2xl font-bold text-blue-400">{scores.host}</div>
              </div>
              <div className="text-gray-600 text-xl">vs</div>
              <div className="text-center">
                <div className="text-xs text-purple-400 mb-1">⚔️ Challenger</div>
                <div className="text-2xl font-bold text-purple-400">{scores.challenger}</div>
              </div>
            </div>
            {/* Countdown Timer */}
            {gameStatus === 'resolved' && candleCountdown > 0 && (
              <div className="ml-4">
                <div className="text-xs text-gray-500 mb-1">Result in</div>
                <div className={`text-3xl font-bold font-mono ${
                  candleCountdown <= 5 ? 'text-red-500 animate-pulse' :
                  candleCountdown <= 15 ? 'text-yellow-500' :
                  'text-green-500'
                }`}>
                  {candleCountdown}s
                </div>
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

          {/* Timer Selection */}
          {(gameStatus === 'waiting' || gameStatus === 'setup') && (
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Round Duration</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTimerDuration(30)}
                  className={`py-3 rounded-lg font-bold transition-all ${
                    timerDuration === 30
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white border-2 border-orange-400'
                      : 'bg-gray-800 text-gray-400 border-2 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl">⚡</div>
                  <div className="text-sm">30 Seconds</div>
                  <div className="text-xs opacity-75">Fast Round</div>
                </button>
                <button
                  onClick={() => setTimerDuration(60)}
                  className={`py-3 rounded-lg font-bold transition-all ${
                    timerDuration === 60
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-2 border-blue-400'
                      : 'bg-gray-800 text-gray-400 border-2 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl">⏱️</div>
                  <div className="text-sm">1 Minute</div>
                  <div className="text-xs opacity-75">Standard Round</div>
                </button>
              </div>
            </div>
          )}

          {/* Pot Display */}
          {agreedBetAmount > 0 && (
            <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-green-900/10 to-blue-900/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">💰 Total Pot</span>
                <span className="text-xl font-bold text-green-400">${pot.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 text-center">
                ${agreedBetAmount.toFixed(2)} each • Winner takes all!
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
                  {agreedBetAmount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white">
                      ${agreedBetAmount.toFixed(2)}
                    </span>
                  )}
                </div>
                {hostBetDirection && (
                  <div className={`text-xs mt-1 font-bold ${hostBetDirection === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                    {hostBetDirection === 'buy' ? '📈 BUY (Long)' : '📉 SELL (Short)'}
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-lg ${challengerBetPlaced ? 'bg-purple-900/20 border border-purple-800/30' : 'bg-gray-800/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">⚔️</span>
                    <span className="text-sm font-bold">Challenger</span>
                  </div>
                  {agreedBetAmount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-600 text-white">
                      ${agreedBetAmount.toFixed(2)}
                    </span>
                  )}
                </div>
                {challengerBetDirection && (
                  <div className={`text-xs mt-1 font-bold ${challengerBetDirection === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                    {challengerBetDirection === 'buy' ? '📈 BUY (Long)' : '📉 SELL (Short)'}
                  </div>
                )}
              </div>
            </div>
          </div>

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
                      setGameStatus('setup');
                      setMessage('Choose your bet amount and position!');
                    }}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold rounded hover:from-amber-500 hover:to-orange-500 transition-all"
                  >
                    Start Demo Round
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Betting Phase */}
          {gameStatus === 'setup' && (
            <div className="p-4 border-b border-gray-800">
              {/* Step 1: Choose bet amount */}
              {agreedBetAmount === 0 && (
                <>
                  <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Step 1: Choose Bet Amount</h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Select a preset amount or use custom (Premium only)
                  </p>
                  
                  {/* Preset Bet Buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={() => {
                        setSelectedBetAmount(10);
                        if (!connected) {
                          setAgreedBetAmount(10);
                        } else {
                          socket?.emit('propose_bet_amount', 10);
                        }
                      }}
                      className="py-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all border-2 border-blue-500/30 hover:border-blue-400/60 hover:scale-105"
                    >
                      <div className="text-2xl">$10</div>
                      <div className="text-xs opacity-75">Standard</div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBetAmount(15);
                        if (!connected) {
                          setAgreedBetAmount(15);
                        } else {
                          socket?.emit('propose_bet_amount', 15);
                        }
                      }}
                      className="py-4 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold rounded-lg transition-all border-2 border-purple-500/30 hover:border-purple-400/60 hover:scale-105"
                    >
                      <div className="text-2xl">$15</div>
                      <div className="text-xs opacity-75">Popular</div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBetAmount(20);
                        if (!connected) {
                          setAgreedBetAmount(20);
                        } else {
                          socket?.emit('propose_bet_amount', 20);
                        }
                      }}
                      className="py-4 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold rounded-lg transition-all border-2 border-green-500/30 hover:border-green-400/60 hover:scale-105"
                    >
                      <div className="text-2xl">$20</div>
                      <div className="text-xs opacity-75">High Roller</div>
                    </button>
                  </div>

                  {/* Custom Bet Button */}
                  <button
                    onClick={() => {
                      if (currentUser?.isPremium) {
                        // Show custom bet input
                        setSelectedBetAmount(null);
                      } else {
                        // Show registration modal
                        setShowRegistration(true);
                      }
                    }}
                    className={`w-full py-3 rounded-lg font-bold transition-all border-2 ${
                      currentUser?.isPremium
                        ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border-amber-500/30 hover:border-amber-400/60'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-amber-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl">{currentUser?.isPremium ? '⭐' : '🔒'}</span>
                      <span>Custom Amount</span>
                      {!currentUser?.isPremium && <span className="text-xs">(Premium)</span>}
                    </div>
                  </button>

                  {/* Custom Bet Input (only for premium users) */}
                  {selectedBetAmount === null && currentUser?.isPremium && (
                    <div className="mt-3 space-y-2">
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={customBetAmount}
                        onChange={(e) => setCustomBetAmount(e.target.value)}
                        placeholder="Enter custom amount"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => {
                          const amount = parseFloat(customBetAmount);
                          if (amount > 0 && amount <= balance) {
                            if (!connected) {
                              setAgreedBetAmount(amount);
                            } else {
                              socket?.emit('propose_bet_amount', amount);
                            }
                          }
                        }}
                        disabled={!customBetAmount}
                        className="w-full py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded transition-all"
                      >
                        Set Custom Amount
                      </button>
                    </div>
                  )}

                  {betError && (
                    <div className="mt-2 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-400">
                      {betError}
                    </div>
                  )}

                  {selectedBetAmount && (
                    <div className="mt-3 text-xs text-gray-400 text-center">
                      Selected: <span className="text-white font-bold">${selectedBetAmount}</span> | 
                      Fee: <span className="text-amber-400">${(selectedBetAmount * SERVICE_CHARGE_PERCENT / 100).toFixed(2)}</span> | 
                      Total: <span className="text-green-400">${(selectedBetAmount + selectedBetAmount * SERVICE_CHARGE_PERCENT / 100).toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              {/* Step 2: Choose direction */}
              {agreedBetAmount > 0 && !myBetDirection && (
                <>
                  <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Step 2: Choose Your Position</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Will BTC price go <span className="text-green-400 font-bold">UP</span> or <span className="text-red-400 font-bold">DOWN</span>?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setMyBetDirection('buy');
                        if (!connected) {
                          placeDemoBet();
                        }
                      }}
                      className="py-4 rounded-lg font-bold transition-all flex flex-col items-center gap-2 border-2 bg-gray-800 text-gray-400 border-gray-700 hover:border-green-600 hover:bg-gradient-to-br hover:from-green-600 hover:to-emerald-700 hover:text-white"
                    >
                      <span className="text-3xl">📈</span>
                      <span className="text-lg">BUY</span>
                      <span className="text-xs opacity-75">Price goes UP</span>
                    </button>
                    <button
                      onClick={() => {
                        setMyBetDirection('sell');
                        if (!connected) {
                          placeDemoBet();
                        }
                      }}
                      className="py-4 rounded-lg font-bold transition-all flex flex-col items-center gap-2 border-2 bg-gray-800 text-gray-400 border-gray-700 hover:border-red-600 hover:bg-gradient-to-br hover:from-red-600 hover:to-rose-700 hover:text-white"
                    >
                      <span className="text-3xl">📉</span>
                      <span className="text-lg">SELL</span>
                      <span className="text-xs opacity-75">Price goes DOWN</span>
                    </button>
                  </div>
                  <div className="mt-3 text-xs text-center text-gray-500">
                    Bet amount: <span className="text-green-400 font-bold">${agreedBetAmount.toFixed(2)}</span>
                  </div>
                </>
              )}

              {/* Direction chosen, waiting for multiplayer */}
              {agreedBetAmount > 0 && myBetDirection && connected && (
                <>
                  <div className={`p-4 rounded-lg border-2 ${
                    myBetDirection === 'buy' ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'
                  }`}>
                    <div className="text-center">
                      <div className="text-3xl mb-2">
                        {myBetDirection === 'buy' ? '📈' : '📉'}
                      </div>
                      <div className={`text-lg font-bold ${myBetDirection === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {myBetDirection === 'buy' ? 'BUY (UP)' : 'SELL (DOWN)'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">✓ Position Locked</div>
                    </div>
                  </div>
                  <button
                    onClick={acceptBetAmount}
                    className="w-full mt-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-bold rounded transition-all"
                  >
                    Confirm & Start Duel
                  </button>
                </>
              )}
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
                </div>

                {/* Price Movement */}
                <div className="my-3 p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Price Movement</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-300">${displayResult.openPrice.toFixed(2)}</span>
                    <span className={`text-lg ${displayResult.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      →
                    </span>
                    <span className="text-sm text-gray-300">${displayResult.targetClosePrice.toFixed(2)}</span>
                    <span className={`text-sm font-bold ${displayResult.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ({displayResult.priceChange >= 0 ? '+' : ''}{displayResult.priceChange.toFixed(2)})
                    </span>
                  </div>
                </div>

                {/* Predictions */}
                <div className="space-y-2 mt-3">
                  <div className={`flex justify-between items-center px-3 py-2 rounded ${displayResult.hostCorrect ? 'bg-green-900/20 border border-green-800/30' : 'bg-red-900/20 border border-red-800/30'}`}>
                    <span className="text-sm text-blue-400">You ({displayResult.hostBetDirection === 'buy' ? 'BUY' : 'SELL'})</span>
                    <span className={`text-sm font-bold ${displayResult.hostCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {displayResult.hostCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center px-3 py-2 rounded ${displayResult.challengerCorrect ? 'bg-green-900/20 border border-green-800/30' : 'bg-red-900/20 border border-red-800/30'}`}>
                    <span className="text-sm text-purple-400">Opponent ({displayResult.challengerBetDirection === 'buy' ? 'BUY' : 'SELL'})</span>
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
                      setMyBetDirection(null);
                      setHostBetPlaced(false);
                      setChallengerBetPlaced(false);
                      setAgreedBetAmount(0);
                      setHostBetDirection(null);
                      setChallengerBetDirection(null);
                      setBetAmount('');
                    }}
                    className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded hover:from-blue-500 hover:to-purple-500 transition-all"
                  >
                    Play Again
                  </button>
                )}
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
                <span>Timer:</span>
                <span className="text-gray-500">{timerDuration}s</span>
              </div>
              <div className="flex justify-between">
                <span>Max Bet:</span>
                <span className="text-gray-500">${MAX_BET}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee:</span>
                <span className="text-gray-500">{SERVICE_CHARGE_PERCENT}%</span>
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
                  ? `Same bet amount! Winner takes all! Timer: ${timerDuration}s`
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

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        onRegister={(userData) => {
          setCurrentUser(userData);
          setBalance(userData.balance);
          setShowRegistration(false);
          setMessage(`Welcome${userData.isPremium ? ' Premium' : ''} member! You now have $${userData.balance}`);
          setTimeout(() => setMessage(''), 3000);
        }}
      />
    </div>
  );
}
