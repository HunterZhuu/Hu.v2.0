import { useState, useEffect, useRef, useCallback } from 'react';
import TradingViewChart from './components/TradingViewChart';
import MarketOverview from './components/MarketOverview';
import PlayerSearch from './components/PlayerSearch';
import UserProfile from './components/UserProfile';
import ChallengeModal from './components/ChallengeModal';
import Wallet from './components/Wallet';
import DepositModal from './components/DepositModal';
import WithdrawModal from './components/WithdrawModal';
import PremiumModal from './components/PremiumModal';
import { 
  TradingAsset, 
  TradeDirection, 
  GameResult, 
  Transaction, 
  Player,
  TRADING_ASSETS,
  CURRENT_USER,
  SERVICE_FEE,
  PREMIUM_SERVICE_FEE,
  INITIAL_BALANCE,
  FREE_BET_LIMIT,
  PREMIUM_BET_LIMIT
} from './types';

type GameStatus = 'waiting' | 'setup' | 'resolved';

export default function App() {
  // ===== State Declarations =====
  const [selectedAsset, setSelectedAsset] = useState<TradingAsset>(TRADING_ASSETS[0]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
  const [timerDuration, setTimerDuration] = useState<30 | 60>(60);
  const [countdown, setCountdown] = useState(0);
  const [betAmount, setBetAmount] = useState(0);
  const [myDirection, setMyDirection] = useState<TradeDirection | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [scores, setScores] = useState({ host: 0, challenger: 0 });
  const [message, setMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengedPlayer, setChallengedPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<'markets' | 'players'>('markets');
  const [showWallet, setShowWallet] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [depositRequired, setDepositRequired] = useState(0);

  // ===== Refs =====
  const countdownRef = useRef<any>(null);
  const betInfoRef = useRef<{
    direction: TradeDirection;
    betAmount: number;
    fee: number;
    openPrice: number;
  } | null>(null);
  const currentPriceRef = useRef(currentPrice);
  const selectedAssetRef = useRef(selectedAsset);
  const scoresRef = useRef(scores);

  // ===== Sync Refs with State =====
  useEffect(() => {
    currentPriceRef.current = currentPrice;
  }, [currentPrice]);

  useEffect(() => {
    selectedAssetRef.current = selectedAsset;
  }, [selectedAsset]);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  // ===== Price Fetching =====
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        let price = 0;

        if (selectedAsset.category === 'crypto') {
          const symbol = selectedAsset.binanceSymbol || `${selectedAsset.id}usdt`;
          const res = await fetch(
            `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`,
            { signal: AbortSignal.timeout(3000) }
          );
          const data = await res.json();
          if (data.price) {
            price = parseFloat(data.price);
          }
        } else if (selectedAsset.id === 'gold') {
          price = 2650 + (Math.random() * 50 - 25);
        } else if (selectedAsset.id === 'silver') {
          price = 31.5 + (Math.random() * 1 - 0.5);
        } else if (selectedAsset.id === 'oil') {
          price = 71.5 + (Math.random() * 3 - 1.5);
        }

        if (price > 0) {
          setCurrentPrice(price);
        }
      } catch (err) {
        console.error('Price fetch error:', err);
      }
    };

    fetchPrice();
    const interval = selectedAsset.category === 'crypto' ? 2000 : 5000;
    const timer = setInterval(fetchPrice, interval);

    return () => clearInterval(timer);
  }, [selectedAsset]);

  // ===== Game Resolution =====
  const resolveGame = useCallback(() => {
    if (!betInfoRef.current) return;

    const { direction, betAmount, fee, openPrice } = betInfoRef.current;
    const closePrice = currentPriceRef.current + (Math.random() - 0.5) * 20;
    const priceWentUp = closePrice > openPrice;
    
    // Opponent makes a random choice (50/50 chance)
    const opponentDir: TradeDirection = Math.random() > 0.5 ? 'buy' : 'sell';
    
    const iCorrect = (direction === 'buy' && priceWentUp) || (direction === 'sell' && !priceWentUp);
    const oppCorrect = (opponentDir === 'buy' && priceWentUp) || (opponentDir === 'sell' && !priceWentUp);

    let winner: 'host' | 'challenger' | 'Draw' = 'Draw';
    let payout = '0';
    const actualBet = betAmount - fee;
    const pot = actualBet * 2;

    // Determine winner based on predictions
    if (iCorrect && !oppCorrect) {
      // Only host is correct
      winner = 'host';
      payout = pot.toFixed(2);
      setBalance(prev => prev + pot);
      
      setTransactions(prev => [{
        id: `win_${Date.now()}`,
        type: 'win',
        amount: pot,
        status: 'completed',
        description: `Won bet on ${selectedAssetRef.current.symbol}`,
        timestamp: new Date(),
        asset: selectedAssetRef.current.symbol,
      }, ...prev]);
      
    } else if (!iCorrect && oppCorrect) {
      // Only opponent is correct
      winner = 'challenger';
      payout = pot.toFixed(2);
      
      setTransactions(prev => [{
        id: `loss_${Date.now()}`,
        type: 'loss',
        amount: -betAmount,
        status: 'completed',
        description: `Lost bet on ${selectedAssetRef.current.symbol}`,
        timestamp: new Date(),
        asset: selectedAssetRef.current.symbol,
      }, ...prev]);
      
    } else {
      // Both correct OR both wrong = DRAW
      winner = 'Draw';
      payout = actualBet.toFixed(2);
      setBalance(prev => prev + actualBet);
      
      const drawReason = (iCorrect && oppCorrect) ? 'Both correct' : 'Both wrong';
      
      setTransactions(prev => [{
        id: `draw_${Date.now()}`,
        type: 'win',
        amount: actualBet,
        status: 'completed',
        description: `Draw on ${selectedAssetRef.current.symbol} (${drawReason})`,
        timestamp: new Date(),
        asset: selectedAssetRef.current.symbol,
      }, ...prev]);
    }

    setResult({
      targetClosePrice: closePrice,
      openPrice: openPrice,
      priceChange: closePrice - openPrice,
      hostBetDirection: direction,
      challengerBetDirection: opponentDir,
      hostCorrect: iCorrect,
      challengerCorrect: oppCorrect,
      winner,
      winnerPayout: payout,
      pot: pot.toFixed(2),
      serviceChargeCollected: (fee * 2).toFixed(2),
      actualBet: actualBet.toFixed(2),
      hostScore: scoresRef.current.host + (winner === 'host' ? 1 : 0),
      challengerScore: scoresRef.current.challenger + (winner === 'challenger' ? 1 : 0)
    });

    // Update scores
    if (winner === 'host') {
      setScores(prev => ({ ...prev, host: prev.host + 1 }));
    } else if (winner === 'challenger') {
      setScores(prev => ({ ...prev, challenger: prev.challenger + 1 }));
    }

    betInfoRef.current = null;
  }, []);

  // ===== Countdown Timer =====
  useEffect(() => {
    if (gameStatus !== 'resolved' || countdown <= 0 || result) return;

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          resolveGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [gameStatus, countdown, result, resolveGame]);

  // ===== Game Actions =====
  const startGame = useCallback((amount: number, asset?: TradingAsset) => {
    const maxBet = isPremium ? PREMIUM_BET_LIMIT : FREE_BET_LIMIT;
    if (amount > maxBet) {
      setMessage(`Maximum bet is $${maxBet}`);
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (asset) setSelectedAsset(asset);
    setBetAmount(amount);
    setGameStatus('setup');
    setMyDirection(null);
    setResult(null);
  }, [isPremium]);

  const placeBet = useCallback((direction: TradeDirection) => {
    const fee = betAmount * ((isPremium ? PREMIUM_SERVICE_FEE : SERVICE_FEE) / 100);

    if (betAmount > balance) {
      setDepositRequired(betAmount);
      setShowDeposit(true);
      return;
    }

    setBalance(prev => prev - betAmount);
    setMyDirection(direction);
    setGameStatus('resolved');
    setCountdown(timerDuration);

    betInfoRef.current = {
      direction,
      betAmount,
      fee,
      openPrice: currentPrice,
    };

    setTransactions(prev => [{
      id: `bet_${Date.now()}`,
      type: 'bet',
      amount: betAmount,
      status: 'completed',
      description: `Bet on ${selectedAsset.symbol} (${direction.toUpperCase()})`,
      timestamp: new Date(),
      fee: fee,
      asset: selectedAsset.symbol,
    }, {
      id: `fee_${Date.now()}`,
      type: 'fee',
      amount: fee,
      status: 'completed',
      description: `Service fee (${isPremium ? PREMIUM_SERVICE_FEE : SERVICE_FEE}%)`,
      timestamp: new Date(),
    }, ...prev]);
  }, [betAmount, balance, isPremium, timerDuration, currentPrice, selectedAsset]);

  const resetGame = useCallback(() => {
    setGameStatus('waiting');
    setResult(null);
    setMyDirection(null);
    setBetAmount(0);
    setCountdown(0);
  }, []);

  const handleChallenge = useCallback((player: Player) => {
    setChallengedPlayer(player);
    setShowChallenge(true);
  }, []);

  const handleDeposit = useCallback((amount: number, method: string) => {
    setBalance(prev => prev + amount);
    setTransactions(prev => [{
      id: `deposit_${Date.now()}`,
      type: 'deposit',
      amount: amount,
      method: method,
      status: 'completed',
      description: `Deposit via ${method}`,
      timestamp: new Date(),
    }, ...prev]);
    setMessage(`Deposited $${amount.toFixed(2)}`);
    setTimeout(() => setMessage(''), 3000);
  }, []);

  const handleWithdraw = useCallback((amount: number, method: string, details: string) => {
    const processingFee = amount * 0.02;
    const totalDeducted = amount + processingFee;
    
    if (totalDeducted > balance) {
      setMessage('Insufficient balance');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setBalance(prev => prev - totalDeducted);
    setTransactions(prev => [{
      id: `withdrawal_${Date.now()}`,
      type: 'withdrawal',
      amount: amount,
      method: method,
      status: 'pending',
      description: `Withdrawal via ${method}`,
      timestamp: new Date(),
      details: details,
      fee: processingFee,
    }, ...prev]);
    setMessage(`Withdrawal of $${amount.toFixed(2)} initiated`);
    setTimeout(() => setMessage(''), 5000);
  }, [balance]);

  const handleUpgrade = useCallback(() => {
    setIsPremium(true);
    setBalance(prev => prev + 50);
    setShowPremium(false);
    setTransactions(prev => [{
      id: `bonus_${Date.now()}`,
      type: 'bonus',
      amount: 50,
      status: 'completed',
      description: 'PRO upgrade welcome bonus',
      timestamp: new Date(),
    }, ...prev]);
    setMessage('Welcome to PRO! +$50 bonus');
    setTimeout(() => setMessage(''), 3000);
  }, []);

  // ===== Render =====
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <UserProfile
              username={CURRENT_USER.username}
              balance={balance}
              wins={CURRENT_USER.wins}
              losses={CURRENT_USER.losses}
              winRate={CURRENT_USER.winRate}
              streak={CURRENT_USER.streak}
              totalEarnings={CURRENT_USER.totalEarnings}
              rank={CURRENT_USER.rank}
              isPremium={isPremium}
            />

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
                {isPremium && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[50, 100, 250].map(amount => (
                      <button
                        key={amount}
                        onClick={() => startGame(amount)}
                        className="py-3 rounded font-bold bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 border border-amber-600/50"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                )}
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
                  Pot: <span className="text-green-400 font-bold">${((betAmount - (betAmount * (isPremium ? PREMIUM_SERVICE_FEE : SERVICE_FEE) / 100)) * 2).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Countdown Display */}
            {gameStatus === 'resolved' && countdown > 0 && !result && (
              <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-6">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Round ending in</div>
                  <div className={`text-6xl font-bold mb-2 ${
                    countdown <= 5 ? 'text-red-500 animate-pulse' :
                    countdown <= 15 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {countdown}
                  </div>
                  <div className="text-sm text-gray-400 mb-4">seconds</div>
                  
                  <div className="bg-gray-800/50 rounded p-3 mb-3">
                    <div className="text-xs text-gray-400 mb-1">Your Prediction</div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">{myDirection === 'buy' ? '📈' : '📉'}</span>
                      <span className="text-lg font-bold">{myDirection === 'buy' ? 'BUY (UP)' : 'SELL (DOWN)'}</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Bet: ${betAmount} on {selectedAsset.symbol}
                  </div>
                </div>
              </div>
            )}

            {gameStatus === 'resolved' && result && (
              <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
                {/* Winner/Loser/Draw Display */}
                <div className="text-center mb-4">
                  {result.winner === 'host' && (
                    <div className="animate-bounce">
                      <div className="text-5xl mb-2">🏆</div>
                      <div className="text-3xl font-bold text-green-400 mb-1">YOU WIN!</div>
                      <div className="text-sm text-gray-400">+${result.winnerPayout}</div>
                    </div>
                  )}
                  {result.winner === 'challenger' && (
                    <div>
                      <div className="text-5xl mb-2">💀</div>
                      <div className="text-3xl font-bold text-red-400 mb-1">YOU LOSE</div>
                      <div className="text-sm text-gray-400">-${betAmount.toFixed(2)}</div>
                    </div>
                  )}
                  {result.winner === 'Draw' && (
                    <div>
                      <div className="text-5xl mb-2">🤝</div>
                      <div className="text-3xl font-bold text-yellow-400 mb-1">DRAW</div>
                      <div className="text-sm text-gray-400">
                        {result.hostCorrect && result.challengerCorrect 
                          ? 'Both predicted correctly' 
                          : 'Both predicted wrong'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Refunded: ${result.winnerPayout}</div>
                    </div>
                  )}
                </div>

                {/* Price Movement */}
                <div className="bg-gray-800/50 rounded p-3 mb-3">
                  <div className="text-xs text-gray-400 mb-1">Price Movement</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">${result.openPrice.toFixed(selectedAsset.pricePrecision)}</span>
                    <span className={result.priceChange >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                      {result.priceChange >= 0 ? '📈' : '📉'} ${result.targetClosePrice.toFixed(selectedAsset.pricePrecision)}
                      <span className="ml-2 text-xs">({result.priceChange >= 0 ? '+' : ''}{result.priceChange.toFixed(selectedAsset.pricePrecision)})</span>
                    </span>
                  </div>
                </div>

                {/* Predictions */}
                <div className="space-y-2 mb-3">
                  <div className={`flex justify-between items-center p-2 rounded border ${
                    result.hostCorrect ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{result.hostBetDirection === 'buy' ? '📈' : '📉'}</span>
                      <span className="font-bold">You ({result.hostBetDirection === 'buy' ? 'BUY' : 'SELL'})</span>
                    </div>
                    <span className={`font-bold ${result.hostCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {result.hostCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center p-2 rounded border ${
                    result.challengerCorrect ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{result.challengerBetDirection === 'buy' ? '📈' : '📉'}</span>
                      <span className="font-bold">Opponent ({result.challengerBetDirection === 'buy' ? 'BUY' : 'SELL'})</span>
                    </div>
                    <span className={`font-bold ${result.challengerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {result.challengerCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                </div>

                {/* Pot Info */}
                <div className="bg-gray-800/30 rounded p-2 mb-3 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Pot:</span>
                    <span className="text-green-400 font-bold">${result.pot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Service Fee:</span>
                    <span className="text-amber-400">${result.serviceChargeCollected}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      // Rematch: Start new game with same bet amount and asset
                      setGameStatus('setup');
                      setResult(null);
                      setMyDirection(null);
                      setCountdown(0);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded transition-all"
                  >
                    🔄 Rematch (${betAmount})
                  </button>
                  <button
                    onClick={resetGame}
                    className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold rounded transition-all"
                  >
                    New Game
                  </button>
                </div>
              </div>
            )}

            {message && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center text-sm">
                {message}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-3 space-y-4">
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
                  <span className="text-gray-500">Account:</span>
                  <span className={isPremium ? 'text-amber-400' : 'text-gray-400'}>
                    {isPremium ? '⭐ PRO' : 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-800/30 rounded-lg p-4">
              <h3 className="text-sm font-bold mb-2 text-blue-400">💡 Pro Tip</h3>
              <p className="text-xs text-gray-400">
                Challenge online players for 1v1 duels! Higher ranked players offer bigger challenges and bigger rewards.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showChallenge && challengedPlayer && (
        <ChallengeModal
          isOpen={showChallenge}
          onClose={() => setShowChallenge(false)}
          opponent={challengedPlayer}
          onStartGame={startGame}
        />
      )}

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
              transactions={transactions}
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

      <WithdrawModal
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        currentBalance={balance}
        onWithdraw={handleWithdraw}
      />

      <PremiumModal
        isOpen={showPremium}
        onClose={() => setShowPremium(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
