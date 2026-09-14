const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Available trading assets
const TRADING_ASSETS = {
  btc: { symbol: 'btcusdt', name: 'Bitcoin', precision: 2 },
  eth: { symbol: 'ethusdt', name: 'Ethereum', precision: 2 },
  bnb: { symbol: 'bnbusdt', name: 'Binance Coin', precision: 2 },
  sol: { symbol: 'solusdt', name: 'Solana', precision: 2 },
  xrp: { symbol: 'xrpusdt', name: 'Ripple', precision: 4 },
  ada: { symbol: 'adausdt', name: 'Cardano', precision: 4 },
  doge: { symbol: 'dogeusdt', name: 'Dogecoin', precision: 5 }
};

// Configuration
const MAX_BET = 10; // Maximum bet amount in dollars
const SERVICE_CHARGE_PERCENT = 5; // 5% service charge on each bet
const INITIAL_BALANCE = 100; // Starting balance for new players

// Game State
let gameState = {
    status: 'waiting', // 'waiting', 'setup', 'betting', 'resolved'
    asset: 'BTC/USDT',
    timerDuration: 60, // 30 or 60 seconds
    currentOpenPrice: 0,
    targetClosePrice: null,
    pot: 0, // Total money in the pot
    serviceCharge: 0, // Total service charges collected
    agreedBetAmount: 0, // The amount both players agreed to bet
    scores: {
        host: 0,
        challenger: 0
    },
    players: {
        host: { 
            id: null, 
            name: 'Host', 
            betDirection: null, // 'buy' or 'sell'
            bet: 0,
            balance: INITIAL_BALANCE,
            wins: 0,
            losses: 0
        },
        challenger: { 
            id: null, 
            name: 'Challenger', 
            betDirection: null, // 'buy' or 'sell'
            bet: 0,
            balance: INITIAL_BALANCE,
            wins: 0,
            losses: 0
        }
    }
};

// Dynamic WebSocket connections for different assets
const assetConnections = {};

function connectToAsset(assetId) {
    if (assetConnections[assetId]) {
        return assetConnections[assetId];
    }

    const asset = TRADING_ASSETS[assetId] || TRADING_ASSETS.btc;
    const wsUrl = `wss://stream.binance.com:9443/ws/${asset.symbol}@kline_1m`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
        console.log(`✅ Connected to ${asset.name} (${asset.symbol}) price feed`);
    });

    ws.on('message', (data) => {
        const message = JSON.parse(data);
        const kline = message.k;
        
        const currentPrice = parseFloat(kline.c);
        gameState.currentOpenPrice = parseFloat(kline.o);

        // If the candle just closed (x=true), resolve the game
        if (kline.x && gameState.status === 'resolved') {
            gameState.targetClosePrice = currentPrice;
            determineWinner();
        }

        // Broadcast price update to all clients
        io.emit('price_update', { 
            time: kline.t / 1000, 
            open: parseFloat(kline.o), 
            high: parseFloat(kline.h), 
            low: parseFloat(kline.l), 
            close: currentPrice 
        });
    });

    ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${asset.name}:`, error);
    });

    ws.on('close', () => {
        console.log(`🔌 Disconnected from ${asset.name} price feed`);
        delete assetConnections[assetId];
    });

    assetConnections[assetId] = ws;
    return ws;
}

// Default connection to BTC
connectToAsset('btc');

function calculateServiceCharge(betAmount) {
    return (betAmount * SERVICE_CHARGE_PERCENT) / 100;
}

function determineWinner() {
    const host = gameState.players.host;
    const challenger = gameState.players.challenger;

    if (!host.betDirection || !challenger.betDirection) return;

    // Determine if price went up or down
    const priceWentUp = gameState.targetClosePrice > gameState.currentOpenPrice;
    const priceChange = gameState.targetClosePrice - gameState.currentOpenPrice;
    
    // Check who predicted correctly
    const hostCorrect = (host.betDirection === 'buy' && priceWentUp) || 
                        (host.betDirection === 'sell' && !priceWentUp);
    const challengerCorrect = (challenger.betDirection === 'buy' && priceWentUp) || 
                              (challenger.betDirection === 'sell' && !priceWentUp);

    let winner = 'Draw';
    let winnerPayout = 0;
    
    if (hostCorrect && !challengerCorrect) {
        // Host wins - takes entire pot
        winner = 'host';
        winnerPayout = gameState.pot;
        gameState.players.host.balance += winnerPayout;
        gameState.players.host.wins++;
        gameState.players.challenger.losses++;
    } else if (!hostCorrect && challengerCorrect) {
        // Challenger wins - takes entire pot
        winner = 'challenger';
        winnerPayout = gameState.pot;
        gameState.players.challenger.balance += winnerPayout;
        gameState.players.challenger.wins++;
        gameState.players.host.losses++;
    } else {
        // Both correct or both wrong - split the pot
        const splitAmount = gameState.pot / 2;
        gameState.players.host.balance += splitAmount;
        gameState.players.challenger.balance += splitAmount;
        if (hostCorrect && challengerCorrect) {
            // Both correct - both get a win
            gameState.players.host.wins++;
            gameState.players.challenger.wins++;
        } else {
            // Both wrong - both get a loss
            gameState.players.host.losses++;
            gameState.players.challenger.losses++;
        }
    }

    io.emit('game_resolved', {
        targetClosePrice: gameState.targetClosePrice,
        openPrice: gameState.currentOpenPrice,
        priceChange: parseFloat(priceChange.toFixed(2)),
        hostBetDirection: host.betDirection,
        challengerBetDirection: challenger.betDirection,
        hostCorrect: hostCorrect,
        challengerCorrect: challengerCorrect,
        winner: winner,
        winnerPayout: winnerPayout.toFixed(2),
        pot: gameState.pot.toFixed(2),
        serviceChargeCollected: gameState.serviceCharge.toFixed(2),
        hostScore: gameState.scores.host + (winner === 'host' ? 1 : 0),
        challengerScore: gameState.scores.challenger + (winner === 'challenger' ? 1 : 0)
    });

    // Update scores
    if (winner === 'host') gameState.scores.host++;
    else if (winner === 'challenger') gameState.scores.challenger++;

    // Reset game after 8 seconds
    setTimeout(() => {
        gameState.status = 'waiting';
        gameState.players.host.betDirection = null;
        gameState.players.host.bet = 0;
        gameState.players.challenger.betDirection = null;
        gameState.players.challenger.bet = 0;
        gameState.targetClosePrice = null;
        gameState.pot = 0;
        gameState.serviceCharge = 0;
        gameState.agreedBetAmount = 0;
        io.emit('game_reset');
    }, 8000);
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle asset selection
    socket.on('select_asset', (assetId) => {
        console.log(`User ${socket.id} selected asset: ${assetId}`);
        // In a multi-asset system, you'd create separate game rooms per asset
        // For now, we'll just acknowledge the selection
        socket.emit('asset_selected', { assetId, asset: TRADING_ASSETS[assetId] || TRADING_ASSETS.btc });
    });

    // Assign roles
    if (!gameState.players.host.id) {
        gameState.players.host.id = socket.id;
        socket.emit('role_assigned', 'host');
        socket.emit('balance_update', { balance: gameState.players.host.balance });
    } else if (!gameState.players.challenger.id) {
        gameState.players.challenger.id = socket.id;
        socket.emit('role_assigned', 'challenger');
        socket.emit('balance_update', { balance: gameState.players.challenger.balance });
        
        // Start the game when challenger joins
        gameState.status = 'setup';
        io.emit('game_started', { message: 'Both players joined! Agree on bet amount.' });
    } else {
        socket.emit('room_full');
    }

    // Handle bet amount proposal
    socket.on('propose_bet_amount', (amount) => {
        if (gameState.status !== 'setup') return;

        const bet = parseFloat(amount);
        if (isNaN(bet) || bet <= 0) {
            socket.emit('bet_error', 'Invalid bet amount');
            return;
        }

        if (bet > MAX_BET) {
            socket.emit('bet_error', `Maximum bet is $${MAX_BET}`);
            return;
        }

        // Check if player has enough balance
        const player = socket.id === gameState.players.host.id ? 'host' : 'challenger';
        if (bet > gameState.players[player].balance) {
            socket.emit('bet_error', 'Insufficient balance');
            return;
        }

        gameState.agreedBetAmount = bet;
        io.emit('bet_amount_set', { amount: bet });
    });

    // Handle bet acceptance with direction
    socket.on('accept_bet_and_direction', ({ direction }) => {
        if (gameState.status !== 'setup') return;
        if (direction !== 'buy' && direction !== 'sell') {
            socket.emit('bet_error', 'Invalid direction');
            return;
        }

        const player = socket.id === gameState.players.host.id ? 'host' : 'challenger';
        const bet = gameState.agreedBetAmount;
        const serviceCharge = calculateServiceCharge(bet);

        // Deduct bet and service charge from balance
        gameState.players[player].balance -= (bet + serviceCharge);
        gameState.players[player].bet = bet;
        gameState.players[player].betDirection = direction;
        
        // Add to pot
        gameState.pot += bet;
        gameState.serviceCharge += serviceCharge;

        socket.emit('balance_update', { balance: gameState.players[player].balance });
        io.emit('player_bet', { player: player, direction: direction });

        // If both players have placed their bets, start the countdown
        if (gameState.players.host.bet > 0 && gameState.players.challenger.bet > 0) {
            gameState.status = 'resolved';
            io.emit('both_bet', { 
                message: 'Both players locked in! Winner takes all!',
                pot: gameState.pot
            });
        }
    });

    // Handle deposit
    socket.on('deposit', ({ amount, method }) => {
        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            socket.emit('deposit_error', 'Invalid deposit amount');
            return;
        }

        if (socket.id === gameState.players.host.id) {
            gameState.players.host.balance += depositAmount;
            socket.emit('balance_update', { balance: gameState.players.host.balance });
            socket.emit('deposit_success', { amount: depositAmount, method });
        } else if (socket.id === gameState.players.challenger.id) {
            gameState.players.challenger.balance += depositAmount;
            socket.emit('balance_update', { balance: gameState.players.challenger.balance });
            socket.emit('deposit_success', { amount: depositAmount, method });
        }

        console.log(`💰 Deposit: $${depositAmount} via ${method} from ${socket.id}`);
    });

    // Get leaderboard
    socket.on('get_leaderboard', () => {
        const leaderboard = [
            {
                id: 'host',
                name: gameState.players.host.name,
                wins: gameState.players.host.wins,
                losses: gameState.players.host.losses,
                winRate: gameState.players.host.wins + gameState.players.host.losses > 0 
                    ? (gameState.players.host.wins / (gameState.players.host.wins + gameState.players.host.losses)) * 100 
                    : 0,
                totalEarnings: 0,
                streak: 0
            },
            {
                id: 'challenger',
                name: gameState.players.challenger.name,
                wins: gameState.players.challenger.wins,
                losses: gameState.players.challenger.losses,
                winRate: gameState.players.challenger.wins + gameState.players.challenger.losses > 0 
                    ? (gameState.players.challenger.wins / (gameState.players.challenger.wins + gameState.players.challenger.losses)) * 100 
                    : 0,
                totalEarnings: 0,
                streak: 0
            }
        ].filter(p => p.wins + p.losses > 0);
        
        socket.emit('leaderboard', leaderboard);
    });

    socket.on('disconnect', () => {
        // Reset on disconnect
        if (socket.id === gameState.players.host.id) {
            gameState.players.host.id = null;
            gameState.players.host.balance = INITIAL_BALANCE;
            gameState.players.host.betDirection = null;
        }
        if (socket.id === gameState.players.challenger.id) {
            gameState.players.challenger.id = null;
            gameState.players.challenger.balance = INITIAL_BALANCE;
            gameState.players.challenger.betDirection = null;
        }
        
        gameState.status = 'waiting';
        gameState.players.host.bet = 0;
        gameState.players.challenger.bet = 0;
        gameState.pot = 0;
        gameState.serviceCharge = 0;
        gameState.agreedBetAmount = 0;
        io.emit('game_reset');
    });
});

server.listen(3000, () => {
    console.log('🚀 PipDuel Server running on http://localhost:3000');
    console.log(`💰 Max bet: $${MAX_BET} | Service charge: ${SERVICE_CHARGE_PERCENT}%`);
});
