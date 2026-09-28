import { useState } from 'react';

interface Player {
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

// Simulated online players database
const MOCK_PLAYERS: Player[] = [
  { id: '1', username: 'CryptoKing99', rank: 1, wins: 156, losses: 44, winRate: 78, streak: 12, totalEarnings: 2450.50, status: 'online', favoriteAsset: 'BTC/USDT', lastActive: 'Now' },
  { id: '2', username: 'GoldHunter', rank: 2, wins: 142, losses: 58, winRate: 71, streak: 5, totalEarnings: 1890.25, status: 'online', favoriteAsset: 'XAU/USD', lastActive: 'Now' },
  { id: '3', username: 'OilTrader', rank: 3, wins: 128, losses: 72, winRate: 64, streak: 3, totalEarnings: 1520.00, status: 'in-game', favoriteAsset: 'WTI/USD', lastActive: 'In game' },
  { id: '4', username: 'SilverFox', rank: 4, wins: 115, losses: 85, winRate: 57.5, streak: 0, totalEarnings: 980.75, status: 'online', favoriteAsset: 'XAG/USD', lastActive: 'Now' },
  { id: '5', username: 'ETHMaster', rank: 5, wins: 98, losses: 52, winRate: 65.3, streak: 7, totalEarnings: 1340.00, status: 'offline', favoriteAsset: 'ETH/USDT', lastActive: '2h ago' },
  { id: '6', username: 'DiamondHands', rank: 6, wins: 89, losses: 61, winRate: 59.3, streak: 2, totalEarnings: 870.50, status: 'online', favoriteAsset: 'BTC/USDT', lastActive: 'Now' },
  { id: '7', username: 'MoonShot', rank: 7, wins: 76, losses: 44, winRate: 63.3, streak: 4, totalEarnings: 720.25, status: 'in-game', favoriteAsset: 'SOL/USDT', lastActive: 'In game' },
  { id: '8', username: 'BearSlayer', rank: 8, wins: 65, losses: 35, winRate: 65, streak: 8, totalEarnings: 650.00, status: 'online', favoriteAsset: 'XRP/USDT', lastActive: 'Now' },
  { id: '9', username: 'BullRunner', rank: 9, wins: 54, losses: 46, winRate: 54, streak: 1, totalEarnings: 420.75, status: 'offline', favoriteAsset: 'ADA/USDT', lastActive: '5h ago' },
  { id: '10', username: 'PipSniper', rank: 10, wins: 48, losses: 32, winRate: 60, streak: 6, totalEarnings: 380.50, status: 'online', favoriteAsset: 'DOGE/USDT', lastActive: 'Now' },
  { id: '11', username: 'TradeGod', rank: 11, wins: 42, losses: 28, winRate: 60, streak: 3, totalEarnings: 310.25, status: 'online', favoriteAsset: 'BNB/USDT', lastActive: 'Now' },
  { id: '12', username: 'ChartMaster', rank: 12, wins: 38, losses: 22, winRate: 63.3, streak: 0, totalEarnings: 280.00, status: 'offline', favoriteAsset: 'BTC/USDT', lastActive: '1d ago' },
];

interface PlayerSearchProps {
  onChallenge: (player: Player) => void;
  currentUser: Player;
}

export default function PlayerSearch({ onChallenge, currentUser }: PlayerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'in-game' | 'offline'>('all');
  const [sortBy, setSortBy] = useState<'rank' | 'winRate' | 'wins' | 'streak'>('rank');
  const [viewMode, setViewMode] = useState<'rankings' | 'search'>('rankings');

  // Filter and sort players
  const filteredPlayers = MOCK_PLAYERS
    .filter(p => p.id !== currentUser.id) // Don't show yourself
    .filter(p => {
      if (filterStatus === 'all') return true;
      return p.status === filterStatus;
    })
    .filter(p => 
      p.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'rank': return a.rank - b.rank;
        case 'winRate': return b.winRate - a.winRate;
        case 'wins': return b.wins - a.wins;
        case 'streak': return b.streak - a.streak;
        default: return 0;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'in-game': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'in-game': return 'In Game';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="bg-[#0f1419] border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-amber-900/20 to-yellow-900/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🏆</span>
            <span>Rankings & Players</span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('rankings')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === 'rankings'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Rankings
            </button>
            <button
              onClick={() => setViewMode('search')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === 'search'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Find Opponent
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        {viewMode === 'search' && (
          <div className="space-y-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Status</option>
                <option value="online">Online Only</option>
                <option value="in-game">In Game</option>
                <option value="offline">Offline</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="rank">Sort by Rank</option>
                <option value="winRate">Sort by Win Rate</option>
                <option value="wins">Sort by Wins</option>
                <option value="streak">Sort by Streak</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Player List */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredPlayers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm">No players found</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                className="p-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Rank */}
                    <div className="text-xl w-10 text-center">
                      {getRankBadge(player.rank)}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{player.username}</span>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(player.status)}`}></div>
                        <span className="text-xs text-gray-500">{getStatusText(player.status)}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{player.wins}W / {player.losses}L</span>
                        <span className={player.winRate >= 60 ? 'text-green-400' : player.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                          {player.winRate}% WR
                        </span>
                        {player.streak > 0 && (
                          <span className="text-orange-400">🔥 {player.streak}</span>
                        )}
                        <span className="text-gray-500">•</span>
                        <span>{player.favoriteAsset}</span>
                      </div>
                    </div>
                  </div>

                  {/* Challenge Button */}
                  <button
                    onClick={() => onChallenge(player)}
                    disabled={player.status !== 'online'}
                    className={`px-4 py-2 rounded text-sm font-bold transition-all ${
                      player.status === 'online'
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {player.status === 'online' ? '⚔️ Challenge' : 
                     player.status === 'in-game' ? 'In Game' : 'Offline'}
                  </button>
                </div>

                {/* Earnings */}
                <div className="ml-13 mt-2 text-xs text-gray-500">
                  Total Earnings: <span className="text-green-400 font-bold">${player.totalEarnings.toFixed(2)}</span>
                  <span className="ml-2">Last Active: {player.lastActive}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{filteredPlayers.length} players</span>
          <span>{filteredPlayers.filter(p => p.status === 'online').length} online</span>
          <span>{filteredPlayers.filter(p => p.status === 'in-game').length} in game</span>
        </div>
      </div>
    </div>
  );
}

export { MOCK_PLAYERS };
export type { Player };
