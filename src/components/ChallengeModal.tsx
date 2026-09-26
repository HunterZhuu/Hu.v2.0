import { useState } from 'react';
import { Player } from './PlayerSearch';
import { TradingAsset } from '../types';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponent: Player;
  onStartGame: (betAmount: number, asset: TradingAsset) => void;
}

const BET_OPTIONS = [10, 15, 20];

export default function ChallengeModal({ isOpen, onClose, opponent, onStartGame }: ChallengeModalProps) {
  const [selectedBet, setSelectedBet] = useState(10);
  const [customBet, setCustomBet] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  if (!isOpen) return null;

  const handleStart = () => {
    const betAmount = useCustom ? parseFloat(customBet) : selectedBet;
    if (betAmount > 0) {
      onStartGame(betAmount, opponent.favoriteAsset as any);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1419] border border-gray-700 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>⚔️</span>
            <span>Challenge Player</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Opponent Info */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-xl font-bold text-white">
                {opponent.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-bold text-white">{opponent.username}</div>
                <div className="text-xs text-gray-500">
                  Rank #{opponent.rank} • {opponent.winRate}% WR • {opponent.wins}W/{opponent.losses}L
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Favorite</div>
                <div className="text-sm font-bold text-white">{opponent.favoriteAsset}</div>
              </div>
            </div>
          </div>

          {/* Bet Amount */}
          <div>
            <label className="text-sm font-bold text-gray-400 mb-2 block">Bet Amount (Same for both)</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {BET_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedBet(amount);
                    setUseCustom(false);
                  }}
                  className={`py-3 rounded font-bold transition-all ${
                    !useCustom && selectedBet === amount
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <button
              onClick={() => setUseCustom(true)}
              className={`w-full py-2 rounded text-sm font-bold transition-all ${
                useCustom
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Custom Amount
            </button>
            {useCustom && (
              <input
                type="number"
                min="1"
                max="100"
                value={customBet}
                onChange={(e) => setCustomBet(e.target.value)}
                placeholder="Enter amount"
                className="w-full mt-2 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          {/* Game Info */}
          <div className="bg-gray-800/30 rounded p-3 text-xs text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Asset:</span>
              <span className="text-white font-bold">{opponent.favoriteAsset}</span>
            </div>
            <div className="flex justify-between">
              <span>Bet Amount:</span>
              <span className="text-white font-bold">${useCustom ? customBet || '0' : selectedBet}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Fee (5%):</span>
              <span className="text-amber-400 font-bold">
                ${((useCustom ? parseFloat(customBet) || 0 : selectedBet) * 0.05).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
              <span>Total Pot:</span>
              <span className="text-green-400 font-bold">
                ${((useCustom ? parseFloat(customBet) || 0 : selectedBet) * 2).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold rounded transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={useCustom && (!customBet || parseFloat(customBet) <= 0)}
              className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold rounded transition-all"
            >
              ⚔️ Start Duel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
