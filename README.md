# ⚔️ PipDuel - BTC Price Prediction Game

A real-time multiplayer prediction game where two players bet on the closing price of a BTC/USDT 1-minute candle. The player whose prediction is closest to the actual closing price wins the pot!

## 🎮 Game Flow

1. **Waiting Phase** - Two players join (Host & Challenger)
2. **Betting Phase** - Both players place bets (max $10 each)
3. **Prediction Phase** - Both players predict the candle close price
4. **Resolution** - Candle closes, winner determined, pot awarded

## 💰 Betting System

- **Max Bet**: $10 per player
- **Service Charge**: 5% on each bet (goes to the house)
- **Starting Balance**: $100 per player
- **Winner Gets**: The entire pot (both bets combined)

### Example Round:
- Host bets $5 → pays $5 + $0.25 fee = $5.25
- Challenger bets $8 → pays $8 + $0.40 fee = $8.40
- **Total Pot**: $13.00
- **Service Fee Collected**: $0.65
- Winner receives $13.00

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

- ✅ Live BTC/USDT price data from Binance WebSocket
- ✅ Real-time candlestick chart
- ✅ Betting system with max $10 limit
- ✅ 5% service charge on each transaction
- ✅ Balance tracking per player
- ✅ Pot display with service fee breakdown
- ✅ Demo mode (works without backend)
- ✅ Responsive design

## 📡 Socket Events

### Client → Server
- `place_bet` - Submit bet amount
- `submit_prediction` - Submit price prediction

### Server → Client
- `role_assigned` - Player role (host/challenger)
- `balance_update` - Updated balance
- `bet_error` - Bet validation error
- `player_bet` - Other player placed bet
- `game_started` - Betting phase begins
- `both_bet` - Both bets placed, prediction phase
- `price_update` - Live candle data
- `player_locked` - Player locked prediction
- `both_locked` - Both predictions locked
- `game_resolved` - Round results
- `game_reset` - Ready for next round

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
