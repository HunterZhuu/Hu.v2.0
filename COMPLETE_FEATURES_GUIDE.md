# 🎯 Complete Game Features Guide

## Overview

PipDuel is a comprehensive BTC price prediction game with multiple game modes, timer options, score tracking, and flexible betting. Players can compete head-to-head in different scenarios.

---

## 🆕 New Features

### 1. 📊 Score Counter

**What It Does:**
- Tracks wins for both Host and Challenger
- Displays score in header: `Host X vs Challenger Y`
- Persists across sessions (localStorage)
- Updates after each round

**Visual Display:**
```
┌─────────────────────────────────────┐
│  👑 Host          vs         ⚔️ Challenger  │
│      5                            3        │
└─────────────────────────────────────┘
```

**How It Works:**
- Winner gets +1 to their score
- Score persists even after page refresh
- Stored in browser localStorage
- Resets manually or clears browser data

---

### 2. ⏱️ Timer Selection (30s or 60s)

**What It Does:**
- Choose round duration before starting
- **30 seconds**: Fast-paced, quick decisions
- **60 seconds**: Standard, more time to analyze

**Timer Options:**

```
┌─────────────────┐    ┌─────────────────┐
│      ⚡         │    │      ⏱️         │
│   30 Seconds    │    │    1 Minute     │
│   Fast Round    │    │  Standard Round │
└─────────────────┘    └─────────────────┘
```

**How It Works:**
- Select timer in setup phase
- Countdown starts after both players place bets
- Visual countdown with color urgency
- Auto-resolves when timer hits zero

**Demo Mode:**
- 30s timer = faster testing
- 60s timer = realistic simulation

---

### 3. 🎮 Dual Game Modes

The game automatically detects which mode to play based on player choices:

#### Mode 1: Opposite Positions (⚔️ Standard Duel)

**When It Activates:**
- Player 1 chooses BUY
- Player 2 chooses SELL
- (or vice versa)

**How It Works:**
- Players bet on opposite outcomes
- Whoever predicts correctly wins the pot
- If both correct → split pot
- If both wrong → house keeps pot

**Example:**
```
Host: BUY ($5) → Predicts price goes UP
Challenger: SELL ($8) → Predicts price goes DOWN

Price goes UP → Host wins $13.00
Price goes DOWN → Challenger wins $13.00
```

#### Mode 2: Same Side Duel (🤝 Magnitude Contest)

**When It Activates:**
- Both players choose BUY
- OR both players choose SELL

**How It Works:**
- Both bet on same direction
- Winner is whoever bets MORE (higher risk/reward)
- If equal bets → split pot
- Shows confidence through bet size

**Example:**
```
Host: BUY ($10) → High confidence
Challenger: BUY ($5) → Lower confidence

Both bet UP → Host wins $15.00 (higher bet wins)
```

**Strategy Tips:**
- Bet big if you're very confident
- Bet small if you're unsure
- Psychological warfare: bluff with high bets

---

## 🎯 Complete Game Flow

### Phase 1: Setup
1. Choose timer duration (30s or 60s)
2. Wait for opponent to join
3. View current score

### Phase 2: Betting
1. Choose position: BUY (📈) or SELL (📉)
2. Enter bet amount ($1-$10)
3. Confirm bet placement
4. Wait for opponent

### Phase 3: Game Mode Detection
- System checks if positions are opposite or same
- Displays game mode message
- Starts countdown timer

### Phase 4: Countdown
- Timer counts down from selected duration
- Color changes: Green → Yellow → Red
- Large overlay shows remaining time
- Builds suspense

### Phase 5: Resolution
- Candle closes
- Price movement calculated
- Winner determined based on game mode
- Scores updated
- Results displayed

### Phase 6: Next Round
- 8-second countdown
- Scores persist
- Ready for next game

---

## 📊 Detailed Scenarios

### Scenario 1: Opposite Positions - Host Wins

```
Setup: 60 seconds
Host: BUY $7 (predicts UP)
Challenger: SELL $5 (predicts DOWN)

Price: $67,500 → $67,580 (+$80, went UP)

Result:
- Host correct (BUY was right)
- Challenger wrong (SELL was wrong)
- Host wins pot: $12.00
- Score: Host 1 - 0 Challenger
```

### Scenario 2: Opposite Positions - Both Wrong

```
Setup: 30 seconds
Host: BUY $5 (predicts UP)
Challenger: SELL $8 (predicts DOWN)

Price: $67,500 → $67,500 (no change, stayed same)

Result:
- Neither correct (price didn't move)
- House wins pot: $13.00
- Both lose bets
- Score: Host 0 - 0 Challenger
```

### Scenario 3: Same Side Duel - Higher Bet Wins

```
Setup: 60 seconds
Host: BUY $10 (high confidence)
Challenger: BUY $3 (low confidence)

Price: $67,500 → $67,650 (+$150, went UP)

Result:
- Both correct (both bet UP)
- Same side mode activated
- Host wins (higher bet: $10 > $3)
- Host gets pot: $13.00
- Score: Host 1 - 0 Challenger
```

### Scenario 4: Same Side Duel - Equal Bets

```
Setup: 30 seconds
Host: SELL $6
Challenger: SELL $6

Price: $67,500 → $67,420 (-$80, went DOWN)

Result:
- Both correct (both bet DOWN)
- Same side mode activated
- Equal bets → split pot
- Each gets $6.00 back
- Score: Host 1 - 1 Challenger (both get win credit)
```

---

## 🎨 User Interface Elements

### Header Section
```
┌─────────────────────────────────────────────────────┐
│  ⚔️ PipDuel  BTC/USDT • Buy or Sell    [DEMO]      │
│  [🏆 Leaderboard]  [🟢 BETTING PHASE]  [🟢 Live]   │
└─────────────────────────────────────────────────────┘
```

### Price Display with Score
```
┌─────────────────────────────────────────────────────┐
│  BTC/USDT              👑 Host    vs    ⚔️ Challenger│
│  $67,542.50               5              3          │
│  Open: $67,500.00                                   │
│  Pot: $13.00                    Result in: 45s      │
└─────────────────────────────────────────────────────┘
```

### Timer Selection
```
┌─────────────────────────────────────────────────────┐
│  Round Duration                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │     ⚡       │  │     ⏱️       │                │
│  │  30 Seconds  │  │   1 Minute   │                │
│  │  Fast Round  │  │Std Round     │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
```

### Bet Placement
```
┌─────────────────────────────────────────────────────┐
│  Choose Your Position                               │
│  ┌──────────────┐  ┌──────────────┐                │
│  │     📈       │  │     📉       │                │
│  │     BUY      │  │     SELL     │                │
│  │ Price goes UP│  │Price goes DOWN│               │
│  └──────────────┘  └──────────────┘                │
│                                                     │
│  Bet Amount                                         │
│  [Max $10]  [Place Bet]                            │
│  Total cost: $10.50 (bet + fee)                    │
└─────────────────────────────────────────────────────┘
```

### Results Display
```
┌─────────────────────────────────────────────────────┐
│  🏆 YOU WIN!                                        │
│                                                     │
│  ⚔️ Opposite Positions Duel                        │
│                                                     │
│  Price Movement                                     │
│  $67,500.00 → $67,580.00 (+$80.00)                 │
│                                                     │
│  You (BUY)              ✓ Correct                   │
│  Opponent (SELL)        ✗ Wrong                     │
│                                                     │
│  Winner Gets            $12.00                      │
│  Service Fee            $0.60                       │
│                                                     │
│  Next round in 8s...                                │
└─────────────────────────────────────────────────────┘
```

---

## 💡 Strategy Guide

### When to Choose 30 Seconds
- Quick decision making
- Less time for analysis
- More rounds per session
- Exciting, fast-paced gameplay
- Good for experienced players

### When to Choose 60 Seconds
- More time to analyze chart
- Check multiple indicators
- Consider market sentiment
- Better for beginners
- More strategic gameplay

### When to Choose BUY
- Strong upward momentum
- Price near support level
- Positive news/sentiment
- High buying volume
- Bullish chart patterns

### When to Choose SELL
- Strong downward momentum
- Price near resistance level
- Negative news/sentiment
- High selling volume
- Bearish chart patterns

### Betting Strategy

**Opposite Positions Mode:**
- Bet based on confidence level
- Higher bet = higher risk/reward
- Consider opponent's likely choice
- Psychological warfare

**Same Side Duel Mode:**
- Bet higher if very confident
- Bet lower if unsure
- Bluff with high bets
- Read opponent's confidence

### Score Management
- Track your win rate
- Adjust strategy based on performance
- Don't chase losses
- Take breaks after losing streaks
- Celebrate winning streaks

---

## 🔧 Technical Details

### Timer Implementation
```javascript
// Timer selection
const [timerDuration, setTimerDuration] = useState<30 | 60>(60);

// Countdown logic
useEffect(() => {
  if (gameStatus === 'resolved' && candleCountdown > 0) {
    candleCountdownRef.current = setInterval(() => {
      setCandleCountdown(prev => {
        if (prev <= 1) {
          clearInterval(candleCountdownRef.current);
          resolveGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }
}, [gameStatus]);
```

### Score Tracking
```javascript
// Load scores
const [scores, setScores] = useState(() => {
  const saved = localStorage.getItem('pipduel_scores');
  return saved ? JSON.parse(saved) : { host: 0, challenger: 0 };
});

// Update scores
if (winner === 'host') {
  setScores(prev => {
    const newScores = { ...prev, host: prev.host + 1 };
    localStorage.setItem('pipduel_scores', JSON.stringify(newScores));
    return newScores;
  });
}
```

### Game Mode Detection
```javascript
// Determine game mode
const gameMode = host.betDirection === challenger.betDirection 
  ? 'same_side' 
  : 'opposite';

// Apply different winning logic
if (gameMode === 'opposite') {
  // Whoever predicted correctly wins
} else {
  // Higher bet wins
}
```

---

## 📱 Mobile Optimization

### Responsive Design
- Timer buttons stack vertically on mobile
- Score counter adapts to smaller screens
- Touch-friendly bet placement buttons
- Readable font sizes
- Scrollable sidebar

### Touch Interactions
- Large tap targets for BUY/SELL buttons
- Clear visual feedback on selection
- Swipeable panels
- Optimized for thumb navigation

---

## 🎯 Key Advantages

### Over Single-Mode Games
✅ **Variety**: Two different game modes
✅ **Strategy**: Multiple ways to win
✅ **Replayability**: Different scenarios each round
✅ **Skill Development**: Learn when to use each mode
✅ **Psychological Depth**: Bluffing and reading opponents

### Over Fixed-Timer Games
✅ **Flexibility**: Choose your preferred pace
✅ **Accessibility**: 30s for quick play, 60s for strategy
✅ **Variety**: Mix up gameplay
✅ **Player Preference**: Cater to different styles

### Over No-Score Games
✅ **Progress Tracking**: See improvement over time
✅ **Competition**: Motivate to win more
✅ **Achievement**: Build winning streaks
✅ **Pride**: Show off high scores

---

## 🚀 Quick Start Guide

### First Game (Demo Mode)

1. **Open the app**
   - Wait 3 seconds for demo mode
   
2. **Start Demo Round**
   - Click "Start Demo Round" button

3. **Choose Timer**
   - Select 30s (fast) or 60s (standard)

4. **Choose Position**
   - Click BUY (📈) or SELL (📉)

5. **Place Bet**
   - Enter amount ($1-$10)
   - Click "Place Bet"

6. **Watch Countdown**
   - Timer counts down
   - See large overlay

7. **View Results**
   - See who won
   - Check score update
   - View price movement

8. **Play Again**
   - Click "Play Again"
   - Scores persist
   - Try different strategies

---

## 📊 Statistics & Analytics

### What's Tracked
- Total wins per player
- Total losses per player
- Win rate percentage
- Current win streak
- Total earnings
- Game mode preferences
- Timer preferences

### Where to View
- **Header**: Live score counter
- **Leaderboard**: Detailed stats
- **Results**: After each round
- **LocalStorage**: Persistent data

---

## 🔮 Future Enhancements

### Planned Features
- [ ] Multiple timer options (15s, 45s, 90s, 2min)
- [ ] Best-of series (first to 5 wins)
- [ ] Tournament brackets
- [ ] Custom bet limits
- [ ] Advanced statistics dashboard
- [ ] Performance charts
- [ ] Achievement badges
- [ ] Social sharing
- [ ] Replay history
- [ ] AI opponent with difficulty levels

---

## 📞 Support & FAQ

### Q: Can I change timer mid-game?
**A:** No, timer is set before the round starts.

### Q: What if both players choose same direction?
**A:** Game switches to "Same Side Duel" mode. Higher bet wins.

### Q: How are scores calculated?
**A:** +1 for each win, persists in localStorage.

### Q: Can I reset my score?
**A:** Clear browser data or use reset button (future feature).

### Q: What happens if price doesn't move?
**A:** In opposite mode, house wins. In same side mode, higher bet still wins.

---

## 🎉 Summary

PipDuel now offers a complete gaming experience with:

✅ **Score Counter** - Track wins across sessions
✅ **Timer Selection** - Choose 30s or 60s rounds
✅ **Dual Game Modes** - Opposite positions OR same side duel
✅ **Flexible Betting** - Choose direction AND amount
✅ **Strategic Depth** - Multiple ways to win
✅ **Persistent Stats** - Never lose your progress
✅ **Visual Feedback** - Clear, intuitive interface

**Play smart. Choose wisely. Win the duel!** 🏆
