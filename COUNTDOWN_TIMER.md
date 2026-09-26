# ⏱️ Countdown Timer Feature

## Overview

PipDuel now features a prominent countdown timer that shows players exactly how much time remains until the candle closes and the winner is determined.

## Timer Features

### 🎯 Visual Countdown Display

**Header Timer:**
- Located in the price display area (top right)
- Shows seconds remaining until candle close
- Color-coded urgency levels:
  - 🟢 **Green** (31-60s): Plenty of time
  - 🟡 **Yellow** (11-30s): Time is running out
  - 🔴 **Red + Pulse** (0-10s): Final seconds!
- Progress bar showing time remaining

**Large Overlay Timer:**
- Appears in center of chart when both players lock predictions
- Massive countdown display (7xl font size)
- Semi-transparent backdrop for visibility
- Shows "Winner Determined In" message
- Pulses and scales in final 10 seconds

**Betting Phase Timer:**
- Smaller timer in top-right of chart during betting phase
- Shows "Betting closes in" message
- Same color-coded urgency system

### 🎮 Game Phase Integration

**Betting Phase:**
- Timer counts down from 60 seconds (live) or 30 seconds (demo)
- Players must place bets before timer expires
- Timer visible in header and chart overlay

**Prediction Phase:**
- Timer continues counting down
- Large overlay appears when both players lock predictions
- Creates suspense and excitement
- Auto-resolves when timer hits zero

**Resolution Phase:**
- Timer disappears
- Winner announcement displays
- 8-second countdown to next round

### 🔄 Live vs Demo Mode

**Live Mode (Connected to Server):**
- Syncs to real Binance candle close times
- Counts down from 60 seconds
- Resets every minute on the minute
- Accurate to real market data

**Demo Mode (Standalone):**
- Faster 30-second countdown for testing
- Auto-resolves game when timer expires
- Simulates candle close price
- Calculates winner automatically

### 🎨 Visual Design

**Color Transitions:**
```javascript
// Green phase (31-60s)
text-green-500

// Yellow phase (11-30s)
text-yellow-500

// Red phase (0-10s)
text-red-500 animate-pulse scale-110
```

**Progress Bar:**
- Thin horizontal bar below timer
- Matches timer color
- Smooth width transition
- Visual representation of time remaining

**Animations:**
- Pulse animation in final 10 seconds
- Scale effect on large overlay
- Smooth color transitions
- Backdrop blur effects

### 📊 Timer Logic

**Live Mode Calculation:**
```javascript
const now = Math.floor(Date.now() / 1000);
const secondsUntilClose = 60 - (now % 60);
```
- Uses Unix timestamp
- Calculates seconds until next minute boundary
- Updates every second
- Synced across all players

**Demo Mode:**
```javascript
setCandleCountdown(30);
// Decrements every second
// Auto-resolves at 0
```
- Starts at 30 seconds
- Decrements each second
- Triggers game resolution at zero

### 🎯 User Experience

**During Betting Phase:**
1. Timer appears in header
2. Small overlay in chart corner
3. Creates urgency to place bets
4. Color changes as time runs out

**During Prediction Phase:**
1. Timer continues in header
2. Large overlay appears when both lock
3. Builds suspense
4. Pulses in final seconds
5. Auto-resolves at zero

**After Resolution:**
1. Timer disappears
2. Winner announcement shows
3. 8-second countdown to next round
4. Timer resets for new round

### 🔧 Technical Implementation

**State Management:**
```typescript
const [candleCountdown, setCandleCountdown] = useState(60);
const candleCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

**Interval Management:**
- Creates interval when game starts
- Clears interval on cleanup
- Prevents memory leaks
- Handles phase transitions

**Auto-Resolution (Demo):**
```typescript
if (prev <= 1) {
  // Calculate winner
  // Update balance
  // Set game status to resolved
  // Show results
}
```

### 🎮 Demo Mode Testing

**Quick Test Flow:**
1. Start demo round
2. Place bet
3. Lock prediction
4. Watch large countdown overlay
5. See winner determined automatically
6. View results after countdown

**Timer Behavior:**
- 30-second countdown (faster for testing)
- Visible throughout prediction phase
- Auto-resolves without manual intervention
- Simulates real candle close

### 🌐 Multiplayer Sync

**Live Mode:**
- All players see same countdown
- Synced to real candle close time
- No lag or desync
- Fair for all participants

**Server Integration:**
```javascript
// Server resolves game when candle closes
if (kline.x && gameState.status === 'predicting') {
  gameState.targetClosePrice = currentPrice;
  gameState.status = 'resolved';
  determineWinner();
}
```

### 📱 Responsive Design

**Desktop:**
- Full-size timer in header
- Large overlay in chart center
- Progress bar visible

**Mobile:**
- Timer adapts to smaller screens
- Overlay scales appropriately
- Touch-friendly design
- Readable font sizes

### 🎨 Accessibility

**Visual Indicators:**
- Color changes for urgency
- Pulsing animation for final seconds
- Clear numeric display
- Progress bar for visual reference

**Screen Reader Support:**
- Semantic HTML structure
- Clear labels ("Winner in", "Betting closes in")
- Numeric countdown readable

### 🚀 Performance

**Optimization:**
- Single interval per phase
- Efficient state updates
- Cleanup on unmount
- No memory leaks

**Updates:**
- 1-second intervals
- Smooth transitions
- No jank or stuttering
- Battery efficient

## Future Enhancements

- [ ] Sound effects for final 10 seconds
- [ ] Haptic feedback on mobile
- [ ] Customizable timer themes
- [ ] Timer pause/resume for admin
- [ ] Extended timer for special events
- [ ] Timer history/stats
- [ ] Countdown animations (particles, etc.)
- [ ] Time bonus power-ups

## Summary

The countdown timer adds excitement and urgency to PipDuel, creating a thrilling experience as players watch the seconds tick down to determine the winner. The color-coded system, large overlay display, and smooth animations make it impossible to miss how much time remains, keeping players engaged throughout each round.
