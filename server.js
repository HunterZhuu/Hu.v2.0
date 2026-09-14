const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Available trading assets with real data sources
const TRADING_ASSETS = {
  // Cryptocurrencies - Binance WebSocket
  btc: { 
    symbol: 'btcusdt', 
    name: 'Bitcoin', 
    precision: 2,
    source: 'binance',
    wsUrl: 'wss://stream.binance.com:9443/ws/btcusdt@kline_1m'
  },
  eth: { 
    symbol: 'ethusdt', 
    name: 'Ethereum', 
    precision: 2,
    source: 'binance',
    wsUrl: 'wss://stream.binance.com:9443/ws/ethusdt@kline_1m'
  },
  bnb: { 
    symbol: 'bnbusdt', 
    name: 'Binance Coin', 
    precision: 2,
    source: 'binance',
    wsUrl: 'wss://stream.binance.com:9443/ws/bnbusdt@kline_1m'
  },
  sol: { 
    symbol: 'solusdt', 
    name: 'Solana', 
    precision: 2,
    source: 'binance',
    wsUrl: 'wss://stream.binance.com:9443/ws/solusdt@kline_1m'
  },
  xrp: { 
    symbol: 'xrpusdt', 
    name: 'Ripple', 
    precision: 4,
    source: 'binance',
    wsUrl: 'wss://stream.binance.com:9443/ws/xrpusdt@kline_1m'
  },
  ada: { 
    symbol: 'adausdt', 
    name: 'Cardano', 
    precision: 4,
    source: 'binance',
    wsUrl: 'wss://stream.binance.com:9443/ws/adausdt@kline_1m'
  },
  doge: { 
    symbol: 'dogeusdt', 
    name: 'Dogecoin', 
    precision: 5,
    source: 'binance',
    wsUrl: 'wss://stream.binance.com:9443/ws/dogeusdt@kline_1m'
  },
  
  // Commodities - Real API data
  gold: { 
    symbol: 'XAU/USD', 
    name: 'Gold', 
    precision: 2,
    source: 'metals-api',
    apiEndpoint: 'https://www.goldapi.io/api/XAU/USD',
    lastPrice: 2650.00
  },
  silver: { 
    symbol: 'XAG/USD', 
    name: 'Silver', 
    precision: 3,
    source: 'metals-api',
    apiEndpoint: 'https://www.goldapi.io/api/XAG/USD',
    lastPrice: 31.50
  },
  oil: { 
    symbol: 'WTI/USD', 
    name: 'Crude Oil', 
    precision: 2,
    source: 'commodity-api',
    apiEndpoint: 'https://api.commoditypriceapi.com/v1/latest?api_key=demo&symbol=WTI',
    lastPrice: 71.50
  }
};

// Configuration
const MAX_BET = 10;
const SERVICE_CHARGE_PERCENT = 5;
const INITIAL_BALANCE = 100;

// Game State
let gameState = {
    status: 'waiting',
    asset: 'btc',
    timerDuration: 60,
    currentOpenPrice: 0,
    targetClosePrice: null,
    pot: 0,
    serviceCharge: 0,
    agreedBetAmount: 0,
    scores: { host: 0, challenger: 0 },
    players: {
        host: { 
            id: null, 
            name: 'Host', 
            betDirection: null,
            bet: 0,
            balance: INITIAL_BALANCE,
            wins: 0,
            losses: 0
        },
        challenger: { 
            id: null, 
            name: 'Challenger', 
            betDirection: null,
            bet: 0,
            balance: INITIAL_BALANCE,
            wins: 0,
            losses: 0
        }
    }
};

// Active WebSocket connections
const assetConnections = {};
let currentAsset = 'btc';

// Connect to Binance WebSocket for crypto assets
function connectToCryptoAsset(assetId) {
    const asset = TRADING_ASSETS[assetId];
    if (!asset || asset.source !== 'binance') return;
    
    if (assetConnections[assetId]) {
        assetConnections[assetId].close();
    }

    console.log(`🔌 Connecting to ${asset.name} (${asset.symbol}) via Binance WebSocket...`);
    
    const ws = new WebSocket(asset.wsUrl);
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    ws.on('open', () => {
        console.log(`✅ Connected to ${asset.name} live price feed`);
        reconnectAttempts = 0;
        io.emit('data_source_update', { 
            assetId, 
            source: 'Binance', 
            status: 'live',
            message: `Live data from ${asset.name}`
        });
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const kline = message.k;
            
            if (!kline) return;
            
            const currentPrice = parseFloat(kline.c);
            gameState.currentOpenPrice = parseFloat(kline.o);

            // If the candle just closed, resolve the game
            if (kline.x && gameState.status === 'resolved') {
                gameState.targetClosePrice = currentPrice;
                determineWinner();
            }

            // Broadcast live price update
            io.emit('price_update', { 
                time: kline.t / 1000, 
                open: parseFloat(kline.o), 
                high: parseFloat(kline.h), 
                low: parseFloat(kline.l), 
                close: currentPrice,
                source: 'Binance',
                asset: assetId,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error parsing Binance message:', error);
        }
    });

    ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${asset.name}:`, error.message);
        io.emit('data_source_update', { 
            assetId, 
            source: 'Binance', 
            status: 'error',
            message: `Connection error: ${error.message}`
        });
    });

    ws.on('close', () => {
        console.log(`🔌 Disconnected from ${asset.name}`);
        delete assetConnections[assetId];
        
        // Attempt reconnection
        if (reconnectAttempts < maxReconnectAttempts && currentAsset === assetId) {
            reconnectAttempts++;
            console.log(`🔄 Reconnecting to ${asset.name} (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
            setTimeout(() => connectToCryptoAsset(assetId), 2000);
        }
    });

    assetConnections[assetId] = ws;
}

// Fetch commodity prices from API
async function fetchCommodityPrice(assetId) {
    const asset = TRADING_ASSETS[assetId];
    if (!asset || asset.source === 'binance') return;

    try {
        let response;
        
        if (assetId === 'gold' || assetId === 'silver') {
            // Use GoldAPI.io for precious metals
            response = await axios.get(asset.apiEndpoint, {
                headers: {
                    'x-access-token': process.env.GOLD_API_KEY || 'goldapi-demo',
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            if (response.data && response.data.price) {
                const price = parseFloat(response.data.price);
                asset.lastPrice = price;
                
                io.emit('price_update', {
                    time: Math.floor(Date.now() / 1000),
                    open: price,
                    high: price * 1.001,
                    low: price * 0.999,
                    close: price,
                    source: 'GoldAPI.io',
                    asset: assetId,
                    timestamp: Date.now(),
                    isCommodity: true
                });
                
                console.log(`✅ ${asset.name}: $${price.toFixed(asset.precision)} (GoldAPI.io)`);
            }
        } else if (assetId === 'oil') {
            // Use commodity price API for oil
            response = await axios.get(asset.apiEndpoint, { timeout: 5000 });
            
            if (response.data && response.data.data && response.data.data.WTI) {
                const price = parseFloat(response.data.data.WTI);
                asset.lastPrice = price;
                
                io.emit('price_update', {
                    time: Math.floor(Date.now() / 1000),
                    open: price,
                    high: price * 1.001,
                    low: price * 0.999,
                    close: price,
                    source: 'CommodityPriceAPI',
                    asset: assetId,
                    timestamp: Date.now(),
                    isCommodity: true
                });
                
                console.log(`✅ ${asset.name}: $${price.toFixed(asset.precision)} (CommodityPriceAPI)`);
            }
        }
        
        io.emit('data_source_update', { 
            assetId, 
            source: asset.source === 'metals-api' ? 'GoldAPI.io' : 'CommodityPriceAPI',
            status: 'live',
            message: `Live data from ${asset.name}`
        });
        
    } catch (error) {
        console.error(`❌ Error fetching ${asset.name} price:`, error.message);
        
        // Use last known price as fallback
        if (asset.lastPrice) {
            io.emit('price_update', {
                time: Math.floor(Date.now() / 1000),
                open: asset.lastPrice,
                high: asset.lastPrice * 1.001,
                low: asset.lastPrice * 0.999,
                close: asset.lastPrice,
                source: `${asset.source} (cached)`,
                asset: assetId,
                timestamp: Date.now(),
                isCommodity: true,
                isCached: true
            });
        }
        
        io.emit('data_source_update', { 
            assetId, 
            source: asset.source,
            status: 'error',
            message: `Using cached price: ${error.message}`
        });
    }
}

// Start commodity price polling (every 10 seconds)
function startCommodityPolling() {
    setInterval(async () => {
        if (currentAsset === 'gold' || currentAsset === 'silver' || currentAsset === 'oil') {
            await fetchCommodityPrice(currentAsset);
        }
    }, 10000); // Poll every 10 seconds
}

// Switch to a different asset
function switchAsset(assetId) {
    console.log(`🔄 Switching to ${TRADING_ASSETS[assetId].name}...`);
    
    // Close existing crypto connection
    if (assetConnections[currentAsset]) {
        assetConnections[currentAsset].close();
    }
    
    currentAsset = assetId;
    gameState.asset = assetId;
    
    const asset = TRADING_ASSETS[assetId];
    
    if (asset.source === 'binance') {
        connectToCryptoAsset(assetId);
    } else {
        // Fetch commodity price immediately
        fetchCommodityPrice(assetId);
    }
    
    io.emit('asset_switched', { 
        assetId, 
        asset: {
            id: assetId,
            symbol: asset.symbol,
            name: asset.name,
            source: asset.source
        }
    });
}

function calculateServiceCharge(betAmount) {
    return (betAmount * SERVICE_CHARGE_PERCENT) / 100;
}

function determineWinner() {
    const host = gameState.players.host;
    const challenger = gameState.players.challenger;

    if (!host.betDirection || !challenger.betDirection) return;

    const priceWentUp = gameState.targetClosePrice > gameState.currentOpenPrice;
    const priceChange = gameState.targetClosePrice - gameState.currentOpenPrice;
    
    const hostCorrect = (host.betDirection === 'buy' && priceWentUp) || 
                        (host.betDirection === 'sell' && !priceWentUp);
    const challengerCorrect = (challenger.betDirection === 'buy' && priceWentUp) || 
                              (challenger.betDirection === 'sell' && !priceWentUp);

    let winner = 'Draw';
    let winnerPayout = 0;
    
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
    } else {
        const splitAmount = gameState.pot / 2;
        gameState.players.host.balance += splitAmount;
        gameState.players.challenger.balance += splitAmount;
        if (hostCorrect && challengerCorrect) {
            gameState.players.host.wins++;
            gameState.players.challenger.wins++;
        } else {
            gameState.players.host.losses++;
            gameState.players.challenger.losses++;
        }
    }

    io.emit('game_resolved', {
        targetClosePrice: gameState.targetClosePrice,
        openPrice: gameState.currentOpenPrice,
        priceChange: parseFloat(priceChange.toFixed(TRADING_ASSETS[currentAsset].precision)),
        hostBetDirection: host.betDirection,
        challengerBetDirection: challenger.betDirection,
        hostCorrect: hostCorrect,
        challengerCorrect: challengerCorrect,
        winner: winner,
        winnerPayout: winnerPayout.toFixed(2),
        pot: gameState.pot.toFixed(2),
        serviceChargeCollected: gameState.serviceCharge.toFixed(2),
        hostScore: gameState.scores.host + (winner === 'host' ? 1 : 0),
        challengerScore: gameState.scores.challenger + (winner === 'challenger' ? 1 : 0),
        dataSource: TRADING_ASSETS[currentAsset].source
    });

    if (winner === 'host') gameState.scores.host++;
    else if (winner === 'challenger') gameState.scores.challenger++;

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

    // Send current asset info
    socket.emit('current_asset', {
        assetId: currentAsset,
        asset: {
            id: currentAsset,
            symbol: TRADING_ASSETS[currentAsset].symbol,
            name: TRADING_ASSETS[currentAsset].name,
            source: TRADING_ASSETS[currentAsset].source
        }
    });

    // Handle asset selection
    socket.on('select_asset', (assetId) => {
        if (TRADING_ASSETS[assetId]) {
            switchAsset(assetId);
            socket.emit('asset_selected', { 
                assetId, 
                asset: {
                    id: assetId,
                    symbol: TRADING_ASSETS[assetId].symbol,
                    name: TRADING_ASSETS[assetId].name,
                    source: TRADING_ASSETS[assetId].source
                }
            });
        }
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

        gameState.players[player].balance -= (bet + serviceCharge);
        gameState.players[player].bet = bet;
        gameState.players[player].betDirection = direction;
        
        gameState.pot += bet;
        gameState.serviceCharge += serviceCharge;

        socket.emit('balance_update', { balance: gameState.players[player].balance });
        io.emit('player_bet', { player: player, direction: direction });

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
        } else if (socket.id === gameState.players.challenger.id) {
            gameState.players.challenger.balance += depositAmount;
            socket.emit('balance_update', { balance: gameState.players.challenger.balance });
        }

        socket.emit('deposit_success', { amount: depositAmount, method });
    });

    socket.on('disconnect', () => {
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

// Initialize
connectToCryptoAsset('btc');
startCommodityPolling();

server.listen(3000, () => {
    console.log('🚀 PipDuel Server running on http://localhost:3000');
    console.log('📊 Live data sources:');
    console.log('  - Cryptocurrencies: Binance WebSocket (real-time)');
    console.log('  - Gold & Silver: GoldAPI.io (10s polling)');
    console.log('  - Oil: CommodityPriceAPI (10s polling)');
    console.log(`💰 Max bet: $${MAX_BET} | Service charge: ${SERVICE_CHARGE_PERCENT}%`);
});
