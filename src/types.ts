export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type TradeDirection = 'buy' | 'sell';

export interface TradingAsset {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  color: string;
  binanceSymbol?: string;
  category: 'crypto' | 'commodity' | 'forex';
  pricePrecision: number;
}

export const TRADING_ASSETS: TradingAsset[] = [
  {
    id: 'btc',
    symbol: 'BTC/USDT',
    name: 'Bitcoin',
    icon: '₿',
    color: '#F7931A',
    binanceSymbol: 'btcusdt',
    category: 'crypto',
    pricePrecision: 2
  },
  {
    id: 'eth',
    symbol: 'ETH/USDT',
    name: 'Ethereum',
    icon: 'Ξ',
    color: '#627EEA',
    binanceSymbol: 'ethusdt',
    category: 'crypto',
    pricePrecision: 2
  },
  {
    id: 'bnb',
    symbol: 'BNB/USDT',
    name: 'Binance Coin',
    icon: '◆',
    color: '#F3BA2F',
    binanceSymbol: 'bnbusdt',
    category: 'crypto',
    pricePrecision: 2
  },
  {
    id: 'sol',
    symbol: 'SOL/USDT',
    name: 'Solana',
    icon: '◎',
    color: '#9945FF',
    binanceSymbol: 'solusdt',
    category: 'crypto',
    pricePrecision: 2
  },
  {
    id: 'xrp',
    symbol: 'XRP/USDT',
    name: 'Ripple',
    icon: '✕',
    color: '#23292F',
    binanceSymbol: 'xrpusdt',
    category: 'crypto',
    pricePrecision: 4
  },
  {
    id: 'ada',
    symbol: 'ADA/USDT',
    name: 'Cardano',
    icon: '₳',
    color: '#0033AD',
    binanceSymbol: 'adausdt',
    category: 'crypto',
    pricePrecision: 4
  },
  {
    id: 'doge',
    symbol: 'DOGE/USDT',
    name: 'Dogecoin',
    icon: 'Ð',
    color: '#C2A633',
    binanceSymbol: 'dogeusdt',
    category: 'crypto',
    pricePrecision: 5
  },
  {
    id: 'gold',
    symbol: 'XAU/USD',
    name: 'Gold',
    icon: '🥇',
    color: '#FFD700',
    category: 'commodity',
    pricePrecision: 2
  },
  {
    id: 'silver',
    symbol: 'XAG/USD',
    name: 'Silver',
    icon: '🥈',
    color: '#C0C0C0',
    category: 'commodity',
    pricePrecision: 3
  },
  {
    id: 'oil',
    symbol: 'WTI/USD',
    name: 'Crude Oil',
    icon: '🛢️',
    color: '#1A1A1A',
    category: 'commodity',
    pricePrecision: 2
  }
];

export interface UserData {
  id: string;
  email: string;
  username: string;
  password: string;
  isPremium: boolean;
  walletAddress?: string;
  bankAccount?: {
    accountNumber: string;
    bankName: string;
    accountHolder: string;
  };
  balance: number;
  createdAt: string;
}

export interface GameState {
  status: 'waiting' | 'setup' | 'betting' | 'predicting' | 'resolved';
  asset: string;
  timerDuration: 30 | 60;
  currentOpenPrice: number;
  targetClosePrice: number | null;
  pot: number;
  serviceCharge: number;
  scores: {
    host: number;
    challenger: number;
  };
  players: {
    host: {
      id: string | null;
      name: string;
      betDirection: TradeDirection | null;
      bet: number;
      balance: number;
      wins: number;
      losses: number;
    };
    challenger: {
      id: string | null;
      name: string;
      betDirection: TradeDirection | null;
      bet: number;
      balance: number;
      wins: number;
      losses: number;
    };
  };
}

export interface GameResult {
  targetClosePrice: number;
  openPrice: number;
  priceChange: number;
  hostBetDirection: TradeDirection;
  challengerBetDirection: TradeDirection;
  hostCorrect: boolean;
  challengerCorrect: boolean;
  winner: string;
  winnerPayout?: string;
  pot?: string;
  serviceChargeCollected?: string;
  hostScore: number;
  challengerScore: number;
}

export interface PlayerBet {
  player: string;
  bet: number;
  direction: TradeDirection;
  serviceCharge: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  wins: number;
  losses: number;
  winRate: number;
  totalEarnings: number;
  streak: number;
}
