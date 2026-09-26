import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerId?: string;
}

export default function Leaderboard({ entries, currentPlayerId }: LeaderboardProps) {
  const sortedEntries = [...entries].sort((a, b) => {
    // Sort by wins first, then by win rate
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.winRate - a.winRate;
  });

  const top10 = sortedEntries.slice(0, 10);

  return (
    <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🏆</span>
          <span>Leaderboard</span>
        </h3>
        <span className="text-xs text-gray-500">Top 10 Players</span>
      </div>

      {top10.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No players yet. Be the first to play!
        </div>
      ) : (
        <div className="space-y-2">
          {top10.map((entry, index) => {
            const isCurrentPlayer = entry.id === currentPlayerId;
            const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 p-2 rounded ${
                  isCurrentPlayer ? 'bg-blue-900/20 border border-blue-700/50' : 'bg-gray-800/30'
                }`}
              >
                <div className="text-lg w-8 text-center">{rankIcon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{entry.name}</span>
                    {isCurrentPlayer && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-600 text-white rounded">YOU</span>
                    )}
                    {entry.streak > 0 && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-600 text-white rounded">
                        🔥 {entry.streak}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span>{entry.wins}W / {entry.losses}L</span>
                    <span>{entry.winRate.toFixed(1)}%</span>
                    <span className="text-green-400">+${entry.totalEarnings.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
