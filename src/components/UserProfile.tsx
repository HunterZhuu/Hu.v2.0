interface UserProfileProps {
  username: string;
  balance: number;
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
  totalEarnings: number;
  rank: number;
  isPremium: boolean;
}

export default function UserProfile({
  username,
  balance,
  wins,
  losses,
  winRate,
  streak,
  totalEarnings,
  rank,
  isPremium
}: UserProfileProps) {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{username}</span>
              {isPremium && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-xs font-bold rounded">
                  ⭐ PRO
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">Rank {getRankBadge(rank)}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Balance</div>
          <div className="text-lg font-bold text-green-400">${balance.toFixed(2)}</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 rounded p-3">
          <div className="text-xs text-gray-500 mb-1">Win Rate</div>
          <div className={`text-xl font-bold ${
            winRate >= 60 ? 'text-green-400' : winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {winRate}%
          </div>
        </div>
        <div className="bg-gray-800/50 rounded p-3">
          <div className="text-xs text-gray-500 mb-1">Win Streak</div>
          <div className="text-xl font-bold text-orange-400">
            {streak > 0 ? `🔥 ${streak}` : '0'}
          </div>
        </div>
        <div className="bg-gray-800/50 rounded p-3">
          <div className="text-xs text-gray-500 mb-1">Record</div>
          <div className="text-xl font-bold">
            <span className="text-green-400">{wins}</span>
            <span className="text-gray-500"> / </span>
            <span className="text-red-400">{losses}</span>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded p-3">
          <div className="text-xs text-gray-500 mb-1">Total Earnings</div>
          <div className={`text-xl font-bold ${
            totalEarnings >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            ${totalEarnings.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 flex gap-2">
        <button className="flex-1 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-bold rounded transition-all">
          + Deposit
        </button>
        <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm font-bold rounded transition-all">
          ⚙️ Settings
        </button>
      </div>
    </div>
  );
}
