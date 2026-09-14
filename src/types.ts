export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type TradeDirection = 'buy' | 'sell';

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
