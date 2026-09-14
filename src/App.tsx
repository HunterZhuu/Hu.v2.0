import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import TradingViewChart from './components/TradingViewChart';
import MarketOverview from './components/MarketOverview';
import PlayerSearch, { Player, MOCK_PLAYERS } from './components/PlayerSearch';
import UserProfile from './components/UserProfile';
import ChallengeModal from './components/ChallengeModal';
import Wallet from './components/Wallet';
import DepositModal from './components/DepositModal';
import WithdrawModal from './components/WithdrawModal';
import PremiumModal from './components/PremiumModal';
import { CandleData, GameResult, TradeDirection, TradingAsset, TRADING_ASSETS } from './types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const SERVICE_FEE = 5;
const PREMIUM_SERVICE_FEE = 3;
const INITIAL_BALANCE = 100;
const FREE_BET_LIMIT = 20;
const PREMIUM_BET_LIMIT = 1000;

// Current user (simulated)
const CURRENT_USER: Player = {
  id: 'current',
  username: 'You',
  rank: 15,
  wins: 42,
  losses: 28,
  winRate: 60,
  streak: 3,
  totalEarnings: 320.50,
  status: 'online',
  favoriteAsset: 'BTC/USDT',
  lastActive: 'Now'
};

type GameStatus = 'waiting' | 'setup' | 'resolved';

export default function App() {
  // Core state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  
  // Asset & price
  const [selectedAsset, setSelectedAsset] = useState<TradingAsset>(TRADING_ASSETS[0]);
  const [currentPrice, setCurrentPrice] = useState(0);
  
  // Game state
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
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
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengedPlayer, setChallengedPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<'markets' | 'players'>('markets');
  const [showWallet, setShowWallet] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [depositRequired, setDepositRequired] = useState(0);
  
  const countdownRef = useRef<any>(null);

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
  }, [demoMode]);

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

  const startGame = (amount: number, asset?: TradingAsset) => {
    // Check if bet amount exceeds limits
    const maxBet = isPremium ? PREMIUM_BET_LIMIT : FREE_BET_LIMIT;
    if (amount > maxBet) {
      if (!isPremium) {
        setMessage(`Maximum bet for free accounts is $${FREE_BET_LIMIT}. Upgrade to PRO for higher limits.`);
        setTimeout(() => setShowPremium(true), 1500);
      } else {
        setMessage(`Maximum bet is $${maxBet}`);
      }
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (asset) setSelectedAsset(asset);
    setBetAmount(amount);
    setGameStatus('setup');
    setMyDirection(null);
    setResult(null);
  };

  const placeBet = (direction: TradeDirection) => {
    const fee = betAmount * ((isPremium ? PREMIUM_SERVICE_FEE : SERVICE_FEE) / 100);
    const actualBet = betAmount - fee; // Service charge deducted from bet amount

    // Check if user has enough balance (only need the bet amount now)
    if (betAmount > balance) {
      setDepositRequired(betAmount);
      setShowDeposit(true);
      return;
    }

    setBalance(prev => prev - betAmount);
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

        const actualBet = betAmount - (betAmount * (isPremium ? PREMIUM_SERVICE_FEE : SERVICE_FEE) / 100);
        const pot = actualBet * 2;

        if (iCorrect && !oppCorrect) {
          winner = 'host';
          payout = pot.toFixed(2);
          setBalance(prev => prev + pot);
        } else if (!iCorrect && oppCorrect) {
          winner = 'challenger';
          payout = pot.toFixed(2);
        } else {
          payout = actualBet.toFixed(2);
          setBalance(prev => prev + actualBet);
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
          pot: pot.toFixed(2),
          serviceChargeCollected: (fee * 2).toFixed(2),
          actualBet: actualBet.toFixed(2),
          hostScore: scores.host + (winner === 'host' ? 1 : 0),
          challengerScore: scores.challenger + (winner === 'challenger' ? 1 : 0)
        });
      }, timerDuration * 1000);
    } else if (socket) {
      socket.emit('place_bet', { amount: betAmount, direction });
    }
  };

  const handleChallenge = (player: Player) => {
    setChallengedPlayer(player);
    setShowChallenge(true);
  };

  const handleDeposit = (amount: number, method: string) => {
    setBalance(prev => prev + amount);
    setMessage(`Successfully deposited $${amount.toFixed(2)} via ${method}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleWithdraw = (amount: number, method: string, details: string) => {
    const processingFee = amount * 0.02; // 2% processing fee
    const totalDeducted = amount + processingFee;
    
    if (totalDeducted > balance) {
      setMessage('Insufficient balance for withdrawal');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setBalance(prev => prev - totalDeducted);
    setMessage(`Withdrawal of $${amount.toFixed(2)} initiated via ${method}. Processing time: 1-3 business days.`);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleUpgrade = () => {
    setIsPremium(true);
    setBalance(prev => prev + 50); // Welcome bonus
    setShowPremium(false);
    setMessage('Welcome to PRO! You received a $50 bonus.');
    setTimeout(() => setMessage(''), 3000);
  };

  const resetGame = () => {
    setGameStatus('waiting');
    setResult(null);
    setMyDirection(null);
    setBetAmount(0);
    setCountdown(0);
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 bg-[#0f1419] sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              ⚔️ PipDuel
            </h1>
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span style={{ color: selectedAsset.color }}>{selectedAsset.icon}</span>
              <span className="font-bold">{selectedAsset.symbol}</span>
              <span className="text-gray-500">•</span>
              <span className="text-2xl font-bold" style={{ color: selectedAsset.color }}>
                ${currentPrice > 0 ? currentPrice.toFixed(selectedAsset.pricePrecision) : '---'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWallet(true)}
              className="text-right hidden sm:block hover:bg-gray-800 rounded p-2 transition-all"
            >
              <div className="text-xs text-gray-500">Balance</div>
              <div className="text-sm font-bold text-green-400">${balance.toFixed(2)}</div>
            </button>
            
            <div className="flex items-center gap-2">
              <div className="text-center">
                <div className="text-xs text-blue-400">You</div>
                <div className="text-lg font-bold">{scores.host}</div>
              </div>
              <div className="text-gray-600">vs</div>
              <div className="text-center">
                <div className="text-xs text-purple-400">Opp</div>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Markets & Players */}
          <div className="lg:col-span-3 space-y-4">
            {/* User Profile */}
            <UserProfile
              username={CURRENT_USER.username}
              balance={balance}
              wins={CURRENT_USER.wins}
              losses={CURRENT_USER.losses}
              winRate={CURRENT_USER.winRate}
              streak={CURRENT_USER.streak}
              totalEarnings={CURRENT_USER.totalEarnings}
              rank={CURRENT_USER.rank}
              isPremium={false}
            />

            {/* Tab Switcher */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('markets')}
                className={`flex-1 py-2 rounded text-sm font-bold transition-all ${
                  activeTab === 'markets'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                📊 Markets
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className={`flex-1 py-2 rounded text-sm font-bold transition-all ${
                  activeTab === 'players'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                👥 Players
              </button>
            </div>

            {/* Markets or Players */}
            {activeTab === 'markets' ? (
              <MarketOverview
                onSelectAsset={setSelectedAsset}
                selectedAsset={selectedAsset}
              />
            ) : (
              <PlayerSearch
                onChallenge={handleChallenge}
                currentUser={CURRENT_USER}
              />
            )}
          </div>

          {/* Center - Chart & Game */}
          <div className="lg:col-span-6 space-y-4">
            {/* Chart */}
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" style={{ color: selectedAsset.color }}>
                    {selectedAsset.icon}
                  </span>
                  <div>
                    <div className="font-bold text-white">{selectedAsset.symbol}</div>
                    <div className="text-xs text-gray-500">{selectedAsset.name}</div>
                  </div>
                </div>
                {gameStatus === 'resolved' && countdown > 0 && (
                  <div className={`text-3xl font-bold ${
                    countdown <= 5 ? 'text-red-500 animate-pulse' :
                    countdown <= 15 ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {countdown}s
                  </div>
                )}
              </div>
              <div className="h-[500px]">
                <TradingViewChart asset={selectedAsset} height={500} />
              </div>
            </div>

            {/* Game Controls */}
            {gameStatus === 'waiting' && (
              <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-bold mb-3">Start a Round</h3>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setTimerDuration(30)}
                    className={`flex-1 py-2 rounded font-bold text-sm ${
                      timerDuration === 30
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    ⚡ 30s
                  </button>
                  <button
                    onClick={() => setTimerDuration(60)}
                    className={`flex-1 py-2 rounded font-bold text-sm ${
                      timerDuration === 60
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    ⏱️ 60s
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[10, 15, 20].map(amount => (
                    <button
                      key={amount}
                      onClick={() => startGame(amount)}
                      className={`py-3 rounded font-bold ${
                        betAmount === amount
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                
                {/* Premium-only bet options */}
                {isPremium && (
                  <>
                    <div className="text-xs text-amber-400 font-bold mb-2">⭐ PRO Bet Options</div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[50, 100, 250].map(amount => (
                        <button
                          key={amount}
                          onClick={() => startGame(amount)}
                          className={`py-3 rounded font-bold border-2 border-amber-600/50 ${
                            betAmount === amount
                              ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white'
                              : 'bg-amber-900/20 text-amber-400 hover:bg-amber-900/40'
                          }`}
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[500, 1000].map(amount => (
                        <button
                          key={amount}
                          onClick={() => startGame(amount)}
                          className={`py-3 rounded font-bold border-2 border-amber-600/50 ${
                            betAmount === amount
                              ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white'
                              : 'bg-amber-900/20 text-amber-400 hover:bg-amber-900/40'
                          }`}
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                
                {/* Upgrade prompt for free users */}
                {!isPremium && (
                  <button
                    onClick={() => setShowPremium(true)}
                    className="w-full py-2 mb-3 bg-gradient-to-r from-amber-900/40 to-yellow-900/40 hover:from-amber-900/60 hover:to-yellow-900/60 border border-amber-700/50 text-amber-400 text-sm font-bold rounded transition-all"
                  >
                    ⭐ Unlock Higher Bets (Up to $1,000)
                  </button>
                )}
                <button
                  onClick={() => startGame(betAmount || 10)}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded"
                >
                  Start Round
                </button>
              </div>
            )}

            {/* Betting Phase */}
            {gameStatus === 'setup' && (
              <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-bold mb-3">Your Prediction</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Will {selectedAsset.name} price go UP or DOWN?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => placeBet('buy')}
                    className="py-6 bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 rounded font-bold"
                  >
                    <div className="text-4xl mb-1">📈</div>
                    <div className="text-lg">BUY</div>
                    <div className="text-xs opacity-75">Price goes UP</div>
                  </button>
                  <button
                    onClick={() => placeBet('sell')}
                    className="py-6 bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 rounded font-bold"
                  >
                    <div className="text-4xl mb-1">📉</div>
                    <div className="text-lg">SELL</div>
                    <div className="text-xs opacity-75">Price goes DOWN</div>
                  </button>
                </div>
                <div className="mt-3 text-xs text-gray-400 text-center">
                  Bet: <span className="text-white font-bold">${betAmount}</span> | 
                  Fee: <span className="text-amber-400">{isPremium ? PREMIUM_SERVICE_FEE : SERVICE_FEE}% (${(betAmount * (isPremium ? PREMIUM_SERVICE_FEE : SERVICE_FEE) / 100).toFixed(2)} deducted)</span> | 
                  Playing: <span className="text-blue-400 font-bold">${(betAmount - (betAmount * (isPremium ? PREMIUM_SERVICE_FEE : SERVICE_FEE) / 100)).toFixed(2)}</span> | 
                  Pot: <span className="text-green-400 font-bold">${((betAmount - (betAmount * (isPremium ? PREMIUM_SERVICE_FEE : SERVICE_FEE) / 100)) * 2).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Results */}
            {gameStatus === 'resolved' && result && (
              <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
                <div className="text-center mb-4">
                  {result.winner === 'host' && (
                    <div className="text-3xl font-bold text-green-400 mb-2">🏆 YOU WIN!</div>
                  )}
                  {result.winner === 'challenger' && (
                    <div className="text-3xl font-bold text-red-400 mb-2">💀 YOU LOSE</div>
                  )}
                  {result.winner === 'Draw' && (
                    <div className="text-3xl font-bold text-yellow-400 mb-2">🤝 DRAW</div>
                  )}
                </div>

                <div className="bg-gray-800/50 rounded p-3 mb-3">
                  <div className="text-xs text-gray-400 mb-1">Price Movement</div>
                  <div className="flex items-center justify-between text-sm">
                    <span>${result.openPrice.toFixed(selectedAsset.pricePrecision)}</span>
                    <span className={result.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                      → ${result.targetClosePrice.toFixed(selectedAsset.pricePrecision)}
                      <span className="ml-2">({result.priceChange >= 0 ? '+' : ''}{result.priceChange.toFixed(selectedAsset.pricePrecision)})</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className={`flex justify-between p-2 rounded ${
                    result.hostCorrect ? 'bg-green-900/20' : 'bg-red-900/20'
                  }`}>
                    <span>You ({result.hostBetDirection === 'buy' ? 'BUY' : 'SELL'})</span>
                    <span className={result.hostCorrect ? 'text-green-400' : 'text-red-400'}>
                      {result.hostCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                  <div className={`flex justify-between p-2 rounded ${
                    result.challengerCorrect ? 'bg-green-900/20' : 'bg-red-900/20'
                  }`}>
                    <span>Opponent ({result.challengerBetDirection === 'buy' ? 'BUY' : 'SELL'})</span>
                    <span className={result.challengerCorrect ? 'text-green-400' : 'text-red-400'}>
                      {result.challengerCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                </div>

                {countdown === 0 && (
                  <button
                    onClick={resetGame}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded"
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
          </div>

          {/* Right Sidebar - Quick Info */}
          <div className="lg:col-span-3 space-y-4">
            {/* Quick Stats */}
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-bold mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Timer:</span>
                  <span className="text-white font-bold">{timerDuration}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Service Fee:</span>
                  <span className="text-amber-400 font-bold">
                    {isPremium ? PREMIUM_SERVICE_FEE : SERVICE_FEE}%
                    {isPremium && <span className="text-xs text-green-400 ml-1">(PRO)</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mode:</span>
                  <span className={demoMode ? 'text-amber-400' : 'text-green-400'}>
                    {demoMode ? 'Demo' : 'Live'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Connection:</span>
                  <span className={connected ? 'text-green-400' : 'text-red-400'}>
                    {connected ? '● Online' : '● Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-bold mb-3">Recent Activity</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Won $10 on BTC/USDT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400">✗</span>
                  <span>Lost $15 on ETH/USDT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Won $20 on XAU/USD</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-800/30 rounded-lg p-4">
              <h3 className="text-sm font-bold mb-2 text-blue-400">💡 Pro Tip</h3>
              <p className="text-xs text-gray-400">
                Challenge online players for 1v1 duels! Higher ranked players offer bigger challenges and bigger rewards.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Challenge Modal */}
      {showChallenge && challengedPlayer && (
        <ChallengeModal
          isOpen={showChallenge}
          onClose={() => setShowChallenge(false)}
          opponent={challengedPlayer}
          onStartGame={startGame}
        />
      )}

      {/* Wallet Modal */}
      {showWallet && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowWallet(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            <Wallet
              balance={balance}
              isPremium={isPremium}
              onDeposit={() => {
                setShowWallet(false);
                setShowDeposit(true);
              }}
              onWithdrawRequest={() => {
                setShowWallet(false);
                setShowWithdraw(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      <DepositModal
        isOpen={showDeposit}
        onClose={() => {
          setShowDeposit(false);
          setDepositRequired(0);
        }}
        currentBalance={balance}
        requiredAmount={depositRequired > 0 ? depositRequired : undefined}
        onDeposit={handleDeposit}
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        currentBalance={balance}
        onWithdraw={handleWithdraw}
      />

      {/* Premium Modal */}
      <PremiumModal
        isOpen={showPremium}
        onClose={() => setShowPremium(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
