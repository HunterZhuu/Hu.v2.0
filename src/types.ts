export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface GameState {
  status: 'waiting' | 'betting' | 'predicting' | 'resolved';
  asset: string;
  currentOpenPrice: number;
  targetClosePrice: number | null;
  pot: number;
  serviceCharge: number;
  players: {
    host: { id: string | null; name: string; prediction: number | null; bet: number; balance: number };
    challenger: { id: string | null; name: string; prediction: number | null; bet: number; balance: number };
  };
}

export interface GameResult {
  targetClosePrice: number;
  hostDiff: string;
  challengerDiff: string;
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
