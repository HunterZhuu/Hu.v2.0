# ⚔️ PipDuel - BTC Price Prediction Game

A real-time multiplayer prediction game where two players bet on whether BTC/USDT price will go **UP** or **DOWN** in the next 1-minute candle. Predict correctly and win the pot!

## 🎮 Game Flow

1. **Waiting Phase** - Two players join (Host & Challenger)
2. **Betting Phase** - Both players place bets (max $10 each)
3. **Prediction Phase** - Both players choose BUY (UP) or SELL (DOWN)
4. **Resolution** - Candle closes, winner determined, pot awarded
5. **Leaderboard** - Track your wins, losses, and ranking

## 🆕 New Features

### 📈 Buy/Sell Predictions
- Simple binary choice: Will price go UP or DOWN?
- Large, intuitive buttons with visual feedback
- Clear results showing who predicted correctly
- Fair gameplay based on market intuition

### 🏆 Leaderboard System
- Track your wins, losses, and win rate
- See your ranking among top players
- Win streak indicators (🔥)
- Persistent stats across sessions (demo mode)
- Real-time updates after each game

### ⏱️ Countdown Timer
- Live countdown to candle close
- Color-coded urgency (green → yellow → red)
- Large overlay display during prediction phase
- Builds excitement and tension

## 💰 Betting System

- **Max Bet**: $10 per player
- **Service Charge**: 5% on each bet (goes to the house)
- **Starting Balance**: $100 per player
- **Winner Gets**: The entire pot (both bets combined)

### Winning Conditions

| Your Prediction | Opponent Prediction | Price Movement | Result |
|----------------|---------------------|----------------|--------|
| BUY (UP) | SELL (DOWN) | Price went UP | **You win pot** |
| BUY (UP) | SELL (DOWN) | Price went DOWN | **Opponent wins** |
| BUY (UP) | BUY (UP) | Price went UP | **Draw - split pot** |
| BUY (UP) | BUY (UP) | Price went DOWN | **House wins** |

### Example Round:
- Host bets $5 (BUY) → pays $5 + $0.25 fee = $5.25
- Challenger bets $8 (SELL) → pays $8 + $0.40 fee = $8.40
- **Total Pot**: $13.00
- **Service Fee Collected**: $0.65
- Price goes UP → Host wins $13.00

## 🚀 Setup

### Backend Server

```bash
# Install dependencies
npm install express socket.io cors ws

# Run the server
node server.js
```

Server runs on `http://localhost:3000`

### Frontend

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build
```

## 🎯 Features

- ✅ **Buy/Sell Predictions** - Simple UP or DOWN choice
- ✅ **Live BTC/USDT price data** from Binance WebSocket
- ✅ **Real-time candlestick chart** with price movement
- ✅ **Betting system** with max $10 limit
- ✅ **5% service charge** on each transaction
- ✅ **Balance tracking** per player
- ✅ **Pot display** with service fee breakdown
- ✅ **Countdown timer** with visual urgency indicators
- ✅ **Leaderboard system** with win/loss tracking
- ✅ **Win streaks** and performance statistics
- ✅ **Demo mode** (works without backend)
- ✅ **Payment integration** (PayPal, Apple Pay, Google Pay, Omannet)
- ✅ **Responsive design** for desktop and mobile

## 📡 Socket Events

### Client → Server
- `place_bet` - Submit bet amount
- `submit_prediction` - Submit prediction ('buy' or 'sell')
- `deposit` - Add funds to balance
- `get_leaderboard` - Request leaderboard data

### Server → Client
- `role_assigned` - Player role (host/challenger)
- `balance_update` - Updated balance
- `bet_error` - Bet validation error
- `player_bet` - Other player placed bet
- `game_started` - Betting phase begins
- `both_bet` - Both bets placed, prediction phase
- `price_update` - Live candle data
- `player_locked` - Player locked prediction (includes direction)
- `both_locked` - Both predictions locked
- `game_resolved` - Round results (includes correct/wrong status)
- `game_reset` - Ready for next round
- `leaderboard` - Leaderboard data

## 💳 Payment Methods

Players can deposit funds using multiple payment methods:

### Supported Payment Methods

1. **PayPal**
   - Email: `fhs_alhinai@hotmail.com`
   - Send payment with your player ID in the note

2. **Apple Pay**
   - Phone: `+96895188386`
   - Use Apple Pay to send funds

3. **Google Pay**
   - Phone: `+96895188386`
   - Use Google Pay to send funds

4. **Omannet Mobile Payment**
   - Phone: `+96895188386`
   - Mobile payment via Omannet app

### How to Deposit

1. Click the **"+ Deposit"** button in the sidebar
2. Select your preferred payment method
3. Follow the instructions to send payment
4. Enter the amount you sent
5. Click "Confirm Deposit"
6. Your balance will be updated instantly (demo mode) or after verification (production)

### Payment Verification

**Demo Mode:** Deposits are simulated instantly for testing purposes.

**Production Mode:** In a live environment, you would:
- Verify payments through payment processor APIs
- Match payments to player accounts using reference IDs
- Add funds only after confirmed receipt

## 🔧 Configuration

In `server.js`:
```javascript
const MAX_BET = 10;              // Maximum bet amount
const SERVICE_CHARGE_PERCENT = 5; // Service fee percentage
const INITIAL_BALANCE = 100;     // Starting balance
```

### Payment Details

Update these in the PaymentModal component:
```javascript
// PayPal
paypalEmail: 'fhs_alhinai@hotmail.com'

// Mobile Payments (Apple Pay, Google Pay, Omannet)
mobileNumber: '+96895188386'
```
