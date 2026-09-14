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
    status: 'waiting', // 'waiting', 'setup', 'betting', 'predicting', 'resolved'
    asset: 'BTC/USDT',
    timerDuration: 60, // 30 or 60 seconds
    currentOpenPrice: 0,
    targetClosePrice: null,
    pot: 0, // Total money in the pot
    serviceCharge: 0, // Total service charges collected
    gameMode: null, // 'opposite' or 'same_side'
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

    if (!host.betDirection || !challenger.betDirection) return;

    // Determine if price went up or down
    const priceWentUp = gameState.targetClosePrice > gameState.currentOpenPrice;
    const priceChange = gameState.targetClosePrice - gameState.currentOpenPrice;
    
    // Determine game mode
    const gameMode = host.betDirection === challenger.betDirection ? 'same_side' : 'opposite';
    
    let winner = 'Draw';
    let winnerPayout = 0;
    let hostCorrect = false;
    let challengerCorrect = false;
    
    if (gameMode === 'opposite') {
        // Standard mode: whoever predicted correctly wins
        hostCorrect = (host.betDirection === 'buy' && priceWentUp) || (host.betDirection === 'sell' && !priceWentUp);
        challengerCorrect = (challenger.betDirection === 'buy' && priceWentUp) || (challenger.betDirection === 'sell' && !priceWentUp);
        
        if (hostCorrect && !challengerCorrect) {
            winner = 'host';
            winnerPayout = gameState.pot;
            gameState.players.host.balance += winnerPayout;
            gameState.players.host.wins++;
            gameState.players.challenger.losses++;
        } else if (!hostCorrect && challengerCorrect) {
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
    } else {
        // Same side mode: both bet same direction, higher bet wins
        // Both are "correct" if price went their way
        hostCorrect = (host.betDirection === 'buy' && priceWentUp) || (host.betDirection === 'sell' && !priceWentUp);
        challengerCorrect = (challenger.betDirection === 'buy' && priceWentUp) || (challenger.betDirection === 'sell' && !priceWentUp);
        
        if (host.bet > challenger.bet) {
            winner = 'host';
            winnerPayout = gameState.pot;
            gameState.players.host.balance += winnerPayout;
            gameState.players.host.wins++;
            gameState.players.challenger.losses++;
        } else if (challenger.bet > host.bet) {
            winner = 'challenger';
            winnerPayout = gameState.pot;
            gameState.players.challenger.balance += winnerPayout;
            gameState.players.challenger.wins++;
            gameState.players.host.losses++;
        } else {
            // Equal bets - split pot
            const splitAmount = gameState.pot / 2;
            gameState.players.host.balance += splitAmount;
            gameState.players.challenger.balance += splitAmount;
            gameState.players.host.wins++;
            gameState.players.challenger.wins++;
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
        gameMode: gameMode,
        hostScore: gameState.players.host.wins,
        challengerScore: gameState.players.challenger.wins
    });

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

    // Handle bet placement with direction
    socket.on('place_bet', ({ amount, direction }) => {
        if (gameState.status !== 'betting') return;

        const bet = parseFloat(amount);
        if (isNaN(bet) || bet <= 0) {
            socket.emit('bet_error', 'Invalid bet amount');
            return;
        }

        if (bet > MAX_BET) {
            socket.emit('bet_error', `Maximum bet is $${MAX_BET}`);
            return;
        }

        if (direction !== 'buy' && direction !== 'sell') {
            socket.emit('bet_error', 'Invalid direction');
            return;
        }

        if (socket.id === gameState.players.host.id) {
            if (bet > gameState.players.host.balance) {
                socket.emit('bet_error', 'Insufficient balance');
                return;
            }
            
            const serviceCharge = calculateServiceCharge(bet);
            gameState.players.host.bet = bet;
            gameState.players.host.betDirection = direction;
            gameState.players.host.balance -= (bet + serviceCharge);
            gameState.pot += bet;
            gameState.serviceCharge += serviceCharge;
            
            socket.emit('balance_update', { balance: gameState.players.host.balance });
            io.emit('player_bet', { player: 'host', bet: bet, direction: direction, serviceCharge: serviceCharge });
        } else if (socket.id === gameState.players.challenger.id) {
            if (bet > gameState.players.challenger.balance) {
                socket.emit('bet_error', 'Insufficient balance');
                return;
            }
            
            const serviceCharge = calculateServiceCharge(bet);
            gameState.players.challenger.bet = bet;
            gameState.players.challenger.betDirection = direction;
            gameState.players.challenger.balance -= (bet + serviceCharge);
            gameState.pot += bet;
            gameState.serviceCharge += serviceCharge;
            
            socket.emit('balance_update', { balance: gameState.players.challenger.balance });
            io.emit('player_bet', { player: 'challenger', bet: bet, direction: direction, serviceCharge: serviceCharge });
        }

        // If both placed bets, determine game mode and start countdown
        if (gameState.players.host.bet > 0 && gameState.players.challenger.bet > 0) {
            gameState.status = 'predicting';
            
            // Determine game mode
            const gameMode = gameState.players.host.betDirection === gameState.players.challenger.betDirection 
                ? 'same_side' 
                : 'opposite';
            
            io.emit('both_bet', { 
                message: gameMode === 'opposite' 
                    ? 'Opposite positions! Whoever predicts correctly wins.'
                    : 'Same side duel! Higher bet wins.',
                pot: gameState.pot,
                serviceCharge: gameState.serviceCharge,
                gameMode: gameMode
            });
        }
    });

    // Note: Prediction is now part of bet placement (place_bet with direction)
    // No separate submit_prediction event needed

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
        io.emit('game_reset');
    });
});

server.listen(3000, () => {
    console.log('🚀 PipDuel Server running on http://localhost:3000');
    console.log(`💰 Max bet: $${MAX_BET} | Service charge: ${SERVICE_CHARGE_PERCENT}%`);
});
