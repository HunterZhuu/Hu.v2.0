# 🏆 Leaderboard System

## Overview

PipDuel features a comprehensive leaderboard system that tracks player performance, rankings, and statistics. Players compete to climb the ranks and prove their prediction skills.

## Features

### Player Statistics

Each player's profile tracks:

- **Wins**: Total number of rounds won
- **Losses**: Total number of rounds lost
- **Win Rate**: Percentage of wins (wins / total games)
- **Total Earnings**: Net profit/loss from all games
- **Current Streak**: Consecutive wins (🔥 indicator)
- **Rank**: Position on the leaderboard

### Leaderboard Display

**Top 10 Players:**
- Sorted by wins (primary) and win rate (secondary)
- Medal icons for top 3 (🥇 🥈 🥉)
- Current player highlighted with "YOU" badge
- Win streak indicator (🔥) for hot players
- Real-time updates after each game

### Visual Design

```
┌─────────────────────────────────────────┐
│  🏆 Leaderboard              Top 10     │
├─────────────────────────────────────────┤
│  🥇 ProTrader99        15W / 3L         │
│     83.3%  +$245.50  🔥 5              │
├─────────────────────────────────────────┤
│  🥈 CryptoKing         12W / 4L         │
│     75.0%  +$180.25                    │
├─────────────────────────────────────────┤
│  🥉 MarketMaven        10W / 5L         │
│     66.7%  +$125.00  🔥 3              │
├─────────────────────────────────────────┤
│  #4 You (Player_A1B2)   8W / 6L   YOU  │
│     57.1%  +$85.50                     │
└─────────────────────────────────────────┘
```

## Data Storage

### Demo Mode (LocalStorage)

In demo mode, leaderboard data is stored in the browser's localStorage:

```javascript
// Storage key
'pipduel_leaderboard'

// Data structure
[
  {
    id: 'player_a1b2',
    name: 'Player_A1B2',
    wins: 8,
    losses: 6,
    winRate: 57.14,
    totalEarnings: 85.50,
    streak: 2
  },
  // ... more players
]
```

### Multiplayer Mode (Server-Side)

In multiplayer mode, the server maintains:
- Player statistics per session
- Real-time leaderboard updates
- Win/loss tracking per game
- Earnings calculation

## Implementation

### Frontend Components

**Leaderboard.tsx:**
```typescript
interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerId?: string;
}

export default function Leaderboard({ entries, currentPlayerId }: LeaderboardProps) {
  const sortedEntries = [...entries].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.winRate - a.winRate;
  });

  const top10 = sortedEntries.slice(0, 10);
  // Render leaderboard UI
}
```

**Integration in App.tsx:**
```typescript
const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
const [showLeaderboard, setShowLeaderboard] = useState(false);

// Load on mount
useEffect(() => {
  setLeaderboard(loadLeaderboard());
}, []);

// Update after each game
setLeaderboard(prev => 
  updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, won, earnings)
);
```

### Helper Functions

**Load Leaderboard:**
```javascript
function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const data = localStorage.getItem('pipduel_leaderboard');
    if (data) return JSON.parse(data);
  } catch {}
  return [];
}
```

**Save Leaderboard:**
```javascript
function saveLeaderboard(entries: LeaderboardEntry[]) {
  try {
    localStorage.setItem('pipduel_leaderboard', JSON.stringify(entries));
  } catch {}
}
```

**Update Leaderboard:**
```javascript
function updateLeaderboard(
  entries: LeaderboardEntry[],
  playerId: string,
  playerName: string,
  won: boolean,
  earnings: number
): LeaderboardEntry[] {
  const existing = entries.find(e => e.id === playerId);
  
  if (existing) {
    // Update existing player
    return entries.map(e => {
      if (e.id === playerId) {
        const newWins = won ? e.wins + 1 : e.wins;
        const newLosses = won ? e.losses : e.losses + 1;
        const newStreak = won ? e.streak + 1 : 0;
        return {
          ...e,
          wins: newWins,
          losses: newLosses,
          winRate: ((newWins / (newWins + newLosses)) * 100) || 0,
          totalEarnings: e.totalEarnings + earnings,
          streak: newStreak,
        };
      }
      return e;
    });
  } else {
    // Add new player
    const newEntry: LeaderboardEntry = {
      id: playerId,
      name: playerName,
      wins: won ? 1 : 0,
      losses: won ? 0 : 1,
      winRate: won ? 100 : 0,
      totalEarnings: earnings,
      streak: won ? 1 : 0,
    };
    return [...entries, newEntry];
  }
}
```

## Game Result Integration

After each game resolves, the leaderboard is updated:

```typescript
// Demo mode
if (winner === 'host') {
  setBalance(prev => prev + pot);
  setLeaderboard(prev => 
    updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, true, pot)
  );
} else if (winner === 'challenger') {
  setLeaderboard(prev => 
    updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, false, -hostBet)
  );
} else if (winner === 'Draw') {
  const splitAmount = pot / 2;
  setBalance(prev => prev + splitAmount);
  setLeaderboard(prev => 
    updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, true, splitAmount - hostBet)
  );
} else {
  // House wins
  setLeaderboard(prev => 
    updateLeaderboard(prev, PLAYER_ID, PLAYER_NAME, false, -hostBet)
  );
}
```

## Server-Side Leaderboard (Multiplayer)

### Socket Events

**Get Leaderboard:**
```javascript
// Client requests leaderboard
socket.emit('get_leaderboard');

// Server responds
socket.on('leaderboard', (leaderboard) => {
  // Update UI with server data
});
```

**Server Implementation:**
```javascript
socket.on('get_leaderboard', () => {
    const leaderboard = [
        {
            id: 'host',
            name: gameState.players.host.name,
            wins: gameState.players.host.wins,
            losses: gameState.players.host.losses,
            winRate: /* calculate */,
            totalEarnings: 0,
            streak: 0
        },
        {
            id: 'challenger',
            name: gameState.players.challenger.name,
            wins: gameState.players.challenger.wins,
            losses: gameState.players.challenger.losses,
            winRate: /* calculate */,
            totalEarnings: 0,
            streak: 0
        }
    ].filter(p => p.wins + p.losses > 0);
    
    socket.emit('leaderboard', leaderboard);
});
```

## Ranking Algorithm

### Primary Sort: Wins
Players are first sorted by total wins (descending).

### Secondary Sort: Win Rate
If wins are equal, players are sorted by win rate (descending).

### Example Ranking:
```
1. Player A: 15 wins, 83.3% win rate
2. Player B: 15 wins, 75.0% win rate
3. Player C: 12 wins, 80.0% win rate
4. Player D: 10 wins, 90.0% win rate
```

## Visual Indicators

### Medal Icons
- 🥇 **Gold**: 1st place
- 🥈 **Silver**: 2nd place
- 🥉 **Bronze**: 3rd place
- #4, #5, etc.: Numeric rank for 4th place and below

### "YOU" Badge
Current player is highlighted with a blue "YOU" badge for easy identification.

### Win Streak (🔥)
Players on a winning streak display a fire emoji with the streak count:
- 🔥 3 = 3 consecutive wins
- 🔥 5 = 5 consecutive wins
- Streak resets to 0 after a loss

## Statistics Breakdown

### Win Rate Calculation
```javascript
winRate = (wins / (wins + losses)) * 100
```

### Total Earnings
```javascript
// Win: +pot amount
// Loss: -bet amount
// Draw: +(pot/2 - bet)
totalEarnings = sum of all game results
```

### Streak Tracking
```javascript
if (won) {
  streak = streak + 1;
} else {
  streak = 0; // Reset on loss
}
```

## User Experience

### Accessing Leaderboard
1. Click the **🏆 Leaderboard** button in the header
2. Leaderboard panel expands in the sidebar
3. View top 10 players
4. See your own ranking highlighted
5. Click again to collapse

### Real-Time Updates
- Leaderboard updates immediately after each game
- No page refresh required
- Smooth transitions and animations
- Persistent across sessions (demo mode)

### Mobile Responsive
- Leaderboard adapts to smaller screens
- Touch-friendly design
- Readable font sizes
- Scrollable if needed

## Future Enhancements

### Global Leaderboard
- [ ] Server-side persistent storage (database)
- [ ] Cross-session player tracking
- [ ] Global rankings across all players
- [ ] Regional leaderboards (by country)

### Advanced Statistics
- [ ] Average bet size
- [ ] Best/worst prediction streaks
- [ ] Performance by time of day
- [ ] Win rate by market condition (bullish/bearish)
- [ ] ROI (Return on Investment) tracking

### Achievements & Badges
- [ ] First win badge
- [ ] 10-win streak badge
- [ ] $1000 earnings badge
- [ ] Perfect round (100% win rate)
- [ ] Comeback king (win after 5 losses)

### Social Features
- [ ] Friend system
- [ ] Challenge specific players
- [ ] Share achievements on social media
- [ ] Player profiles with avatars
- [ ] Follow top players

### Leaderboard Variants
- [ ] Daily leaderboard (reset every 24h)
- [ ] Weekly leaderboard
- [ ] Monthly leaderboard
- [ ] All-time leaderboard
- [ ] Tournament-specific leaderboards

### Analytics Dashboard
- [ ] Performance charts over time
- [ ] Prediction accuracy heatmap
- [ ] Betting pattern analysis
- [ ] Comparison with top players
- [ ] Personalized tips based on performance

## Privacy Considerations

### Demo Mode
- Data stored locally in browser
- No server communication
- Can be cleared by clearing browser data
- Private to the user's device

### Multiplayer Mode
- Player names visible to others
- Statistics shared in leaderboard
- Consider anonymization options
- GDPR compliance for EU players

## Summary

The leaderboard system adds a competitive layer to PipDuel, motivating players to improve their prediction skills and climb the ranks. With real-time updates, visual indicators, and comprehensive statistics, it creates an engaging competitive environment that keeps players coming back for more.
