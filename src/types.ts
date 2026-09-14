export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type PredictionDirection = 'buy' | 'sell' | null;

export interface GameState {
  status: 'waiting' | 'betting' | 'predicting' | 'resolved';
  asset: string;
  currentOpenPrice: number;
  targetClosePrice: number | null;
  pot: number;
  serviceCharge: number;
  players: {
    host: {
      id: string | null;
      name: string;
      prediction: PredictionDirection;
      bet: number;
      balance: number;
      wins: number;
      losses: number;
    };
    challenger: {
      id: string | null;
      name: string;
      prediction: PredictionDirection;
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
  hostPrediction: PredictionDirection;
  challengerPrediction: PredictionDirection;
  hostCorrect: boolean;
  challengerCorrect: boolean;
  winner: string;
  winnerPayout?: string;
  pot?: string;
  serviceChargeCollected?: string;
}

export interface PlayerBet {
  player: string;
  bet: number;
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
