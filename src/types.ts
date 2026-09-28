// ===== Core Types =====
export type TradeDirection = 'buy' | 'sell';

export interface TradingAsset {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  color: string;
  binanceSymbol?: string;
  category: 'crypto' | 'commodity';
  pricePrecision: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface GameResult {
  targetClosePrice: number;
  openPrice: number;
  priceChange: number;
  hostBetDirection: TradeDirection;
  challengerBetDirection: TradeDirection;
  hostCorrect: boolean;
  challengerCorrect: boolean;
  winner: 'host' | 'challenger' | 'Draw';
  winnerPayout: string;
  pot: string;
  serviceChargeCollected: string;
  actualBet: string;
  hostScore: number;
  challengerScore: number;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'loss' | 'fee' | 'bonus';
  amount: number;
  method?: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  timestamp: Date;
  details?: string;
  fee?: number;
  asset?: string;
}

export interface Player {
  id: string;
  username: string;
  rank: number;
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
  totalEarnings: number;
  status: 'online' | 'in-game' | 'offline';
  favoriteAsset?: string;
  lastActive: string;
}

// ===== Constants =====
export const SERVICE_FEE = 5;
export const PREMIUM_SERVICE_FEE = 3;
export const INITIAL_BALANCE = 100;
export const FREE_BET_LIMIT = 20;
export const PREMIUM_BET_LIMIT = 1000;
export const PREMIUM_MONTHLY = 100;
export const PREMIUM_YEARLY = 1200;

// ===== Trading Assets =====
export const TRADING_ASSETS: TradingAsset[] = [
  // Crypto
  { id: 'btc', symbol: 'BTC/USDT', name: 'Bitcoin', icon: '₿', color: '#F7931A', binanceSymbol: 'BTCUSDT', category: 'crypto', pricePrecision: 2 },
  { id: 'eth', symbol: 'ETH/USDT', name: 'Ethereum', icon: 'Ξ', color: '#627EEA', binanceSymbol: 'ETHUSDT', category: 'crypto', pricePrecision: 2 },
  { id: 'bnb', symbol: 'BNB/USDT', name: 'BNB', icon: '◆', color: '#F3BA2F', binanceSymbol: 'BNBUSDT', category: 'crypto', pricePrecision: 2 },
  { id: 'sol', symbol: 'SOL/USDT', name: 'Solana', icon: '◎', color: '#9945FF', binanceSymbol: 'SOLUSDT', category: 'crypto', pricePrecision: 2 },
  { id: 'xrp', symbol: 'XRP/USDT', name: 'Ripple', icon: '✕', color: '#23292F', binanceSymbol: 'XRPUSDT', category: 'crypto', pricePrecision: 4 },
  { id: 'ada', symbol: 'ADA/USDT', name: 'Cardano', icon: '₳', color: '#0033AD', binanceSymbol: 'ADAUSDT', category: 'crypto', pricePrecision: 4 },
  { id: 'doge', symbol: 'DOGE/USDT', name: 'Dogecoin', icon: 'Ð', color: '#C2A633', binanceSymbol: 'DOGEUSDT', category: 'crypto', pricePrecision: 5 },
  // Commodities
  { id: 'gold', symbol: 'XAU/USD', name: 'Gold', icon: '🥇', color: '#FFD700', category: 'commodity', pricePrecision: 2 },
  { id: 'silver', symbol: 'XAG/USD', name: 'Silver', icon: '🥈', color: '#C0C0C0', category: 'commodity', pricePrecision: 3 },
  { id: 'oil', symbol: 'WTI/USD', name: 'Oil', icon: '🛢️', color: '#1A1A1A', category: 'commodity', pricePrecision: 2 },
];

// ===== Mock Players =====
export const MOCK_PLAYERS: Player[] = [
  { id: '1', username: 'CryptoKing99', rank: 1, wins: 156, losses: 44, winRate: 78, streak: 12, totalEarnings: 2450.50, status: 'online', favoriteAsset: 'BTC/USDT', lastActive: 'Now' },
  { id: '2', username: 'GoldHunter', rank: 2, wins: 142, losses: 58, winRate: 71, streak: 5, totalEarnings: 1890.25, status: 'online', favoriteAsset: 'XAU/USD', lastActive: 'Now' },
  { id: '3', username: 'OilTrader', rank: 3, wins: 128, losses: 72, winRate: 64, streak: 3, totalEarnings: 1520.00, status: 'in-game', favoriteAsset: 'WTI/USD', lastActive: 'In game' },
  { id: '4', username: 'SilverFox', rank: 4, wins: 115, losses: 85, winRate: 57.5, streak: 0, totalEarnings: 980.75, status: 'online', favoriteAsset: 'XAG/USD', lastActive: 'Now' },
  { id: '5', username: 'ETHMaster', rank: 5, wins: 98, losses: 52, winRate: 65.3, streak: 7, totalEarnings: 1340.00, status: 'offline', favoriteAsset: 'ETH/USDT', lastActive: '2h ago' },
  { id: '6', username: 'DiamondHands', rank: 6, wins: 89, losses: 61, winRate: 59.3, streak: 2, totalEarnings: 870.50, status: 'online', favoriteAsset: 'BTC/USDT', lastActive: 'Now' },
  { id: '7', username: 'MoonShot', rank: 7, wins: 76, losses: 44, winRate: 63.3, streak: 4, totalEarnings: 720.25, status: 'in-game', favoriteAsset: 'SOL/USDT', lastActive: 'In game' },
  { id: '8', username: 'BearSlayer', rank: 8, wins: 65, losses: 35, winRate: 65, streak: 8, totalEarnings: 650.00, status: 'online', favoriteAsset: 'XRP/USDT', lastActive: 'Now' },
];

export const CURRENT_USER: Player = {
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
