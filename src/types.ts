export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface GameState {
  status: 'waiting' | 'predicting' | 'resolved';
  asset: string;
  currentOpenPrice: number;
  targetClosePrice: number | null;
  players: {
    host: { id: string | null; name: string; prediction: number | null };
    challenger: { id: string | null; name: string; prediction: number | null };
  };
}

export interface GameResult {
  targetClosePrice: number;
  hostDiff: string;
  challengerDiff: string;
  winner: string;
}
