# 📈 Buy/Sell Prediction System

## Overview

PipDuel now uses a simplified **Buy/Sell** prediction system instead of exact price predictions. Players predict whether the BTC price will go **UP** or **DOWN** by the end of the 1-minute candle.

## How It Works

### Prediction Options

- **📈 BUY (UP)**: You predict the price will be **higher** at candle close
- **📉 SELL (DOWN)**: You predict the price will be **lower** at candle close

### Game Flow

1. **Betting Phase**: Both players place bets (max $10 each)
2. **Prediction Phase**: Each player chooses BUY or SELL
3. **Candle Close**: After 60 seconds, the candle closes
4. **Resolution**: Winner determined based on predictions

### Winning Conditions

| Host Prediction | Challenger Prediction | Price Movement | Winner |
|----------------|----------------------|----------------|--------|
| BUY (UP) | SELL (DOWN) | Price went UP | **Host wins** |
| BUY (UP) | SELL (DOWN) | Price went DOWN | **Challenger wins** |
| SELL (DOWN) | BUY (UP) | Price went UP | **Challenger wins** |
| SELL (DOWN) | BUY (UP) | Price went DOWN | **Host wins** |
| BUY (UP) | BUY (UP) | Price went UP | **Draw** (split pot) |
| BUY (UP) | BUY (UP) | Price went DOWN | **House wins** (both lose) |
| SELL (DOWN) | SELL (DOWN) | Price went DOWN | **Draw** (split pot) |
| SELL (DOWN) | SELL (DOWN) | Price went UP | **House wins** (both lose) |

### Payout Rules

- **One correct, one wrong**: Correct player wins the entire pot
- **Both correct**: Pot is split 50/50
- **Both wrong**: House keeps the pot (players lose their bets)
- **Draw**: Pot is split 50/50

## User Interface

### Prediction Buttons

Players see two large, visually distinct buttons:

```
┌─────────────────┐    ┌─────────────────┐
│      📈         │    │      📉         │
│     BUY         │    │     SELL        │
│  Price goes UP  │    │  Price goes DOWN│
└─────────────────┘    └─────────────────┘
```

- **BUY Button**: Green gradient with upward arrow
- **SELL Button**: Red gradient with downward arrow
- Hover effects and scale animations
- Clear visual feedback

### Prediction Status

After locking in a prediction:
- Large display showing your choice
- Color-coded background (green for BUY, red for SELL)
- "✓ Prediction Locked" confirmation

### Results Display

When the round resolves:

```
┌─────────────────────────────────────┐
│  Price Movement                     │
│  $67,450.00 → $67,485.50 (📈 UP)   │
├─────────────────────────────────────┤
│  You (BUY)              ✓ Correct   │
│  Opponent (SELL)        ✗ Wrong     │
├─────────────────────────────────────┤
│  Winner Gets            $15.00      │
│  Service Fee            $0.75       │
└─────────────────────────────────────┘
```

## Technical Implementation

### Frontend (React)

**State Management:**
```typescript
const [myPrediction, setMyPrediction] = useState<PredictionDirection>(null);
const [hostPrediction, setHostPrediction] = useState<PredictionDirection>(null);
const [challengerPrediction, setChallengerPrediction] = useState<PredictionDirection>(null);

type PredictionDirection = 'buy' | 'sell' | null;
```

**Socket Events:**
```typescript
// Client sends prediction
socket.emit('submit_prediction', 'buy'); // or 'sell'

// Server broadcasts locked predictions
socket.on('player_locked', (data: { player: string, prediction: PredictionDirection }) => {
  if (data.player === 'host') {
    setHostPrediction(data.prediction);
  } else {
    setChallengerPrediction(data.prediction);
  }
});
```

### Backend (Node.js)

**Game Resolution Logic:**
```javascript
function determineWinner() {
    const priceWentUp = gameState.targetClosePrice > gameState.currentOpenPrice;
    
    const hostCorrect = (host.prediction === 'buy' && priceWentUp) || 
                        (host.prediction === 'sell' && !priceWentUp);
    const challengerCorrect = (challenger.prediction === 'buy' && priceWentUp) || 
                              (challenger.prediction === 'sell' && !priceWentUp);

    if (hostCorrect && !challengerCorrect) {
        winner = 'host';
        winnerPayout = gameState.pot;
    } else if (!hostCorrect && challengerCorrect) {
        winner = 'challenger';
        winnerPayout = gameState.pot;
    } else if (hostCorrect && challengerCorrect) {
        // Both correct - split pot
        winner = 'Draw';
    } else {
        // Both wrong - house wins
        winner = 'House';
    }
}
```

## Demo Mode

In demo mode, the system:
1. Simulates an opponent with random BUY/SELL choice
2. Generates a realistic price movement
3. Determines winner based on predictions
4. Updates balance accordingly
5. Records result in leaderboard

## Strategy Tips

### When to BUY (Predict UP)
- Strong bullish momentum in recent candles
- Price near support level
- Positive news/sentiment
- High trading volume on buy side

### When to SELL (Predict DOWN)
- Strong bearish momentum in recent candles
- Price near resistance level
- Negative news/sentiment
- High trading volume on sell side

### Risk Management
- Start with smaller bets while learning
- Don't chase losses
- Set a daily loss limit
- Take profits when ahead

## Advantages Over Price Prediction

### ✅ Simpler
- No need to predict exact price
- Binary choice (UP or DOWN)
- Easier for beginners

### ✅ Fairer
- Both players have equal information
- No advantage from complex calculations
- Pure market intuition

### ✅ Faster
- Quick decision making
- No time wasted on calculations
- More rounds per session

### ✅ More Exciting
- Clear visual feedback
- Immediate understanding of outcome
- Dramatic countdown tension

## Future Enhancements

- [ ] Multi-timeframe predictions (5m, 15m, 1h)
- [ ] Prediction confidence levels (low/medium/high)
- [ ] Historical accuracy tracking per player
- [ ] AI-powered market sentiment analysis
- [ ] Social trading (follow top predictors)
- [ ] Prediction streaks and achievements
- [ ] Tournament mode with brackets
- [ ] Live chat during prediction phase

## Summary

The Buy/Sell prediction system transforms PipDuel into a fast-paced, intuitive trading game where players test their market intuition against each other. With clear visual feedback, simple mechanics, and exciting countdown timers, it creates an engaging experience for both beginners and experienced traders.
