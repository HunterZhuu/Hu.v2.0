const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Configuration
const MAX_BET = 10; // Maximum bet amount in dollars
const SERVICE_CHARGE_PERCENT = 5; // 5% service charge on each bet
const INITIAL_BALANCE = 100; // Starting balance for new players

// Game State
let gameState = {
    status: 'waiting', // 'waiting', 'betting', 'predicting', 'resolved'
    asset: 'BTC/USDT',
    currentOpenPrice: 0,
    targetClosePrice: null,
    pot: 0, // Total money in the pot
    serviceCharge: 0, // Total service charges collected
    players: {
        host: { 
            id: null, 
            name: 'Host', 
            prediction: null, // 'buy' or 'sell'
            bet: 0,
            balance: INITIAL_BALANCE,
            wins: 0,
            losses: 0
        },
        challenger: { 
            id: null, 
            name: 'Challenger', 
            prediction: null, // 'buy' or 'sell'
            bet: 0,
            balance: INITIAL_BALANCE,
            wins: 0,
            losses: 0
        }
    }
};

// Connect to Binance Public WebSocket for live 1-minute BTC candles
const binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');

binanceWs.on('message', (data) => {
    const message = JSON.parse(data);
    const kline = message.k;
    
    const currentPrice = parseFloat(kline.c);
    gameState.currentOpenPrice = parseFloat(kline.o);

    // If the candle just closed (x=true), resolve the game
    if (kline.x && gameState.status === 'predicting') {
        gameState.targetClosePrice = currentPrice;
        gameState.status = 'resolved';
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

function calculateServiceCharge(betAmount) {
    return (betAmount * SERVICE_CHARGE_PERCENT) / 100;
}

function determineWinner() {
    const host = gameState.players.host;
    const challenger = gameState.players.challenger;

    if (!host.prediction || !challenger.prediction) return;

    // Determine if price went up or down
    const priceWentUp = gameState.targetClosePrice > gameState.currentOpenPrice;
    
    // Check if predictions were correct
    const hostCorrect = (host.prediction === 'buy' && priceWentUp) || (host.prediction === 'sell' && !priceWentUp);
    const challengerCorrect = (challenger.prediction === 'buy' && priceWentUp) || (challenger.prediction === 'sell' && !priceWentUp);

    let winner = 'Draw';
    let winnerPayout = 0;
    
    if (hostCorrect && !challengerCorrect) {
        // Host wins
        winner = 'host';
        winnerPayout = gameState.pot;
        gameState.players.host.balance += winnerPayout;
        gameState.players.host.wins++;
        gameState.players.challenger.losses++;
    } else if (!hostCorrect && challengerCorrect) {
        // Challenger wins
        winner = 'challenger';
        winnerPayout = gameState.pot;
        gameState.players.challenger.balance += winnerPayout;
        gameState.players.challenger.wins++;
        gameState.players.host.losses++;
    } else if (hostCorrect && challengerCorrect) {
        // Both correct - split the pot
        const splitAmount = gameState.pot / 2;
        gameState.players.host.balance += splitAmount;
        gameState.players.challenger.balance += splitAmount;
        gameState.players.host.wins++;
        gameState.players.challenger.wins++;
    } else {
        // Both wrong - house keeps the pot
        winner = 'House';
        gameState.players.host.losses++;
        gameState.players.challenger.losses++;
    }

    io.emit('game_resolved', {
        targetClosePrice: gameState.targetClosePrice,
        openPrice: gameState.currentOpenPrice,
        hostPrediction: host.prediction,
        challengerPrediction: challenger.prediction,
        hostCorrect: hostCorrect,
        challengerCorrect: challengerCorrect,
        winner: winner,
        winnerPayout: winnerPayout.toFixed(2),
        pot: gameState.pot.toFixed(2),
        serviceChargeCollected: gameState.serviceCharge.toFixed(2)
    });

    // Reset game after 8 seconds
    setTimeout(() => {
        gameState.status = 'waiting';
        gameState.players.host.prediction = null;
        gameState.players.host.bet = 0;
        gameState.players.challenger.prediction = null;
        gameState.players.challenger.bet = 0;
        gameState.targetClosePrice = null;
        gameState.pot = 0;
        gameState.serviceCharge = 0;
        io.emit('game_reset');
    }, 8000);
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Assign roles
    if (!gameState.players.host.id) {
        gameState.players.host.id = socket.id;
        socket.emit('role_assigned', 'host');
        socket.emit('balance_update', { balance: gameState.players.host.balance });
    } else if (!gameState.players.challenger.id) {
        gameState.players.challenger.id = socket.id;
        socket.emit('role_assigned', 'challenger');
        socket.emit('balance_update', { balance: gameState.players.challenger.balance });
        
        // Start the betting phase when challenger joins
        gameState.status = 'betting';
        io.emit('game_started', { message: 'Both players joined! Place your bets.' });
    } else {
        socket.emit('room_full');
    }

    // Handle bet placement
    socket.on('place_bet', (betAmount) => {
        if (gameState.status !== 'betting') return;

        const bet = parseFloat(betAmount);
        if (isNaN(bet) || bet <= 0) {
            socket.emit('bet_error', 'Invalid bet amount');
            return;
        }

        if (bet > MAX_BET) {
            socket.emit('bet_error', `Maximum bet is $${MAX_BET}`);
            return;
        }

        if (socket.id === gameState.players.host.id) {
            if (bet > gameState.players.host.balance) {
                socket.emit('bet_error', 'Insufficient balance');
                return;
            }
            
            const serviceCharge = calculateServiceCharge(bet);
            gameState.players.host.bet = bet;
            gameState.players.host.balance -= (bet + serviceCharge);
            gameState.pot += bet;
            gameState.serviceCharge += serviceCharge;
            
            socket.emit('balance_update', { balance: gameState.players.host.balance });
            io.emit('player_bet', { player: 'host', bet: bet, serviceCharge: serviceCharge });
        } else if (socket.id === gameState.players.challenger.id) {
            if (bet > gameState.players.challenger.balance) {
                socket.emit('bet_error', 'Insufficient balance');
                return;
            }
            
            const serviceCharge = calculateServiceCharge(bet);
            gameState.players.challenger.bet = bet;
            gameState.players.challenger.balance -= (bet + serviceCharge);
            gameState.pot += bet;
            gameState.serviceCharge += serviceCharge;
            
            socket.emit('balance_update', { balance: gameState.players.challenger.balance });
            io.emit('player_bet', { player: 'challenger', bet: bet, serviceCharge: serviceCharge });
        }

        // If both placed bets, start prediction phase
        if (gameState.players.host.bet > 0 && gameState.players.challenger.bet > 0) {
            gameState.status = 'predicting';
            io.emit('both_bet', { 
                message: 'Both players placed bets! Now make your predictions.',
                pot: gameState.pot,
                serviceCharge: gameState.serviceCharge
            });
        }
    });

    // Handle prediction (buy/sell)
    socket.on('submit_prediction', (direction) => {
        if (gameState.status !== 'predicting') return;
        if (direction !== 'buy' && direction !== 'sell') return;

        if (socket.id === gameState.players.host.id) {
            gameState.players.host.prediction = direction;
            io.emit('player_locked', { player: 'host', prediction: direction });
        } else if (socket.id === gameState.players.challenger.id) {
            gameState.players.challenger.prediction = direction;
            io.emit('player_locked', { player: 'challenger', prediction: direction });
        }

        // If both locked, wait for candle close
        if (gameState.players.host.prediction && gameState.players.challenger.prediction) {
            io.emit('both_locked');
        }
    });

    // Handle deposit
    socket.on('deposit', ({ amount, method }) => {
        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            socket.emit('deposit_error', 'Invalid deposit amount');
            return;
        }

        // In production, you would verify the payment here
        // For now, we'll just add the amount to the player's balance
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
            gameState.players.host.prediction = null;
        }
        if (socket.id === gameState.players.challenger.id) {
            gameState.players.challenger.id = null;
            gameState.players.challenger.balance = INITIAL_BALANCE;
            gameState.players.challenger.prediction = null;
        }
        
        gameState.status = 'waiting';
        gameState.players.host.bet = 0;
        gameState.players.challenger.bet = 0;
        gameState.pot = 0;
        gameState.serviceCharge = 0;
        io.emit('game_reset');
    });
});

server.listen(3000, () => {
    console.log('🚀 PipDuel Server running on http://localhost:3000');
    console.log(`💰 Max bet: $${MAX_BET} | Service charge: ${SERVICE_CHARGE_PERCENT}%`);
});
