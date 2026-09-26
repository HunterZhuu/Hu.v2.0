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

// Configuration
const MAX_BET = 10;
const SERVICE_CHARGE_PERCENT = 5;
const INITIAL_BALANCE = 100;

// Twelve Data API (Free tier: 8 requests/minute, 800/day)
// Get your free API key at: https://twelvedata.com/register
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || 'demo';

// Trading assets with data sources
const TRADING_ASSETS = {
  // Cryptocurrencies - Binance WebSocket (real-time, no API key needed)
  btc: { 
    symbol: 'BTC/USDT', 
    name: 'Bitcoin', 
    precision: 2,
    source: 'binance',
    binanceSymbol: 'btcusdt'
  },
  eth: { 
    symbol: 'ETH/USDT', 
    name: 'Ethereum', 
    precision: 2,
    source: 'binance',
    binanceSymbol: 'ethusdt'
  },
  bnb: { 
    symbol: 'BNB/USDT', 
    name: 'Binance Coin', 
    precision: 2,
    source: 'binance',
    binanceSymbol: 'bnbusdt'
  },
  sol: { 
    symbol: 'SOL/USDT', 
    name: 'Solana', 
    precision: 2,
    source: 'binance',
    binanceSymbol: 'solusdt'
  },
  xrp: { 
    symbol: 'XRP/USDT', 
    name: 'Ripple', 
    precision: 4,
    source: 'binance',
    binanceSymbol: 'xrpusdt'
  },
  ada: { 
    symbol: 'ADA/USDT', 
    name: 'Cardano', 
    precision: 4,
    source: 'binance',
    binanceSymbol: 'adausdt'
  },
  doge: { 
    symbol: 'DOGE/USDT', 
    name: 'Dogecoin', 
    precision: 5,
    source: 'binance',
    binanceSymbol: 'dogeusdt'
  },
  
  // Commodities - Twelve Data API (free tier, real-time)
  gold: { 
    symbol: 'XAU/USD', 
    name: 'Gold', 
    precision: 2,
    source: 'twelvedata',
    twelveDataSymbol: 'XAU/USD'
  },
  silver: { 
    symbol: 'XAG/USD', 
    name: 'Silver', 
    precision: 3,
    source: 'twelvedata',
    twelveDataSymbol: 'XAG/USD'
  },
  oil: { 
    symbol: 'WTI/USD', 
    name: 'Crude Oil WTI', 
    precision: 2,
    source: 'twelvedata',
    twelveDataSymbol: 'WTI/USD'
  }
};

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

// Active connections
const assetConnections = {};
let currentAsset = 'btc';
let lastCommodityFetch = 0;
const COMMODITY_FETCH_INTERVAL = 5000; // 5 seconds for faster updates

// Connect to Binance WebSocket for crypto
function connectToCryptoAsset(assetId) {
    const asset = TRADING_ASSETS[assetId];
    if (!asset || asset.source !== 'binance') return;
    
    if (assetConnections[assetId]) {
        assetConnections[assetId].close();
    }

    const wsUrl = `wss://stream.binance.com:9443/ws/${asset.binanceSymbol}@kline_1m`;
    console.log(`🔌 Connecting to ${asset.name} via Binance WebSocket...`);
    
    const ws = new WebSocket(wsUrl);
    let reconnectAttempts = 0;

    ws.on('open', () => {
        console.log(`✅ Connected to ${asset.name} live feed (Binance)`);
        reconnectAttempts = 0;
        io.emit('data_source_update', { 
            assetId, 
            source: 'Binance', 
            status: 'live',
            message: `Real-time data from Binance`
        });
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const kline = message.k;
            
            if (!kline) return;
            
            const currentPrice = parseFloat(kline.c);
            gameState.currentOpenPrice = parseFloat(kline.o);

            if (kline.x && gameState.status === 'resolved') {
                gameState.targetClosePrice = currentPrice;
                determineWinner();
            }

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
    });

    ws.on('close', () => {
        console.log(`🔌 Disconnected from ${asset.name}`);
        delete assetConnections[assetId];
        
        if (reconnectAttempts < 5 && currentAsset === assetId) {
            reconnectAttempts++;
            setTimeout(() => connectToCryptoAsset(assetId), 2000);
        }
    });

    assetConnections[assetId] = ws;
}

// Fetch commodity price from Twelve Data
async function fetchCommodityPrice(assetId) {
    const asset = TRADING_ASSETS[assetId];
    if (!asset || asset.source !== 'twelvedata') return;

    const now = Date.now();
    if (now - lastCommodityFetch < COMMODITY_FETCH_INTERVAL) {
        return; // Rate limiting
    }
    lastCommodityFetch = now;

    try {
        const url = `https://api.twelvedata.com/price?symbol=${asset.twelveDataSymbol}&apikey=${TWELVE_DATA_API_KEY}`;
        const response = await axios.get(url, { timeout: 5000 });
        
        if (response.data && response.data.price) {
            const price = parseFloat(response.data.price);
            
            io.emit('price_update', {
                time: Math.floor(now / 1000),
                open: price,
                high: price * 1.0005,
                low: price * 0.9995,
                close: price,
                source: 'Twelve Data',
                asset: assetId,
                timestamp: now
            });
            
            console.log(`✅ ${asset.name}: $${price.toFixed(asset.precision)} (Twelve Data)`);
            
            io.emit('data_source_update', { 
                assetId, 
                source: 'Twelve Data', 
                status: 'live',
                message: `Real-time data from Twelve Data`
            });
        }
    } catch (error) {
        console.error(`❌ Error fetching ${asset.name}:`, error.message);
        
        // Try fallback to API Ninjas
        try {
            const fallbackMap = {
                'gold': 'gold',
                'silver': 'silver',
                'oil': 'crude_oil'
            };
            
            const ninjaSymbol = fallbackMap[assetId];
            if (ninjaSymbol) {
                const ninjaUrl = `https://api.api-ninjas.com/v1/commodityprice?name=${ninjaSymbol}`;
                const ninjaResponse = await axios.get(ninjaUrl, {
                    headers: { 'X-Api-Key': process.env.API_NINJAS_KEY || 'demo' },
                    timeout: 5000
                });
                
                if (ninjaResponse.data && ninjaResponse.data.price) {
                    const price = parseFloat(ninjaResponse.data.price);
                    
                    io.emit('price_update', {
                        time: Math.floor(now / 1000),
                        open: price,
                        high: price * 1.0005,
                        low: price * 0.9995,
                        close: price,
                        source: 'API Ninjas (fallback)',
                        asset: assetId,
                        timestamp: now
                    });
                    
                    console.log(`✅ ${asset.name}: $${price.toFixed(asset.precision)} (API Ninjas fallback)`);
                }
            }
        } catch (fallbackError) {
            console.error(`❌ Fallback also failed for ${asset.name}:`, fallbackError.message);
            io.emit('data_source_update', { 
                assetId, 
                source: 'Error', 
                status: 'error',
                message: `Unable to fetch ${asset.name} price`
            });
        }
    }
}

// Start commodity polling
function startCommodityPolling() {
    setInterval(async () => {
        if (currentAsset && TRADING_ASSETS[currentAsset]?.source === 'twelvedata') {
            await fetchCommodityPrice(currentAsset);
        }
    }, COMMODITY_FETCH_INTERVAL);
}

// Switch asset
function switchAsset(assetId) {
    console.log(`🔄 Switching to ${TRADING_ASSETS[assetId].name}...`);
    
    if (assetConnections[currentAsset]) {
        assetConnections[currentAsset].close();
    }
    
    currentAsset = assetId;
    gameState.asset = assetId;
    
    const asset = TRADING_ASSETS[assetId];
    
    if (asset.source === 'binance') {
        connectToCryptoAsset(assetId);
    } else {
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
    }

    io.emit('game_resolved', {
        targetClosePrice: gameState.targetClosePrice,
        openPrice: gameState.currentOpenPrice,
        priceChange: parseFloat(priceChange.toFixed(TRADING_ASSETS[currentAsset].precision)),
        hostBetDirection: host.betDirection,
        challengerBetDirection: challenger.betDirection,
        hostCorrect,
        challengerCorrect,
        winner,
        winnerPayout: winnerPayout.toFixed(2),
        pot: gameState.pot.toFixed(2),
        serviceChargeCollected: gameState.serviceCharge.toFixed(2),
        hostScore: gameState.scores.host + (winner === 'host' ? 1 : 0),
        challengerScore: gameState.scores.challenger + (winner === 'challenger' ? 1 : 0)
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

    socket.emit('current_asset', {
        assetId: currentAsset,
        asset: {
            id: currentAsset,
            symbol: TRADING_ASSETS[currentAsset].symbol,
            name: TRADING_ASSETS[currentAsset].name,
            source: TRADING_ASSETS[currentAsset].source
        }
    });

    socket.on('select_asset', (assetId) => {
        if (TRADING_ASSETS[assetId]) {
            switchAsset(assetId);
        }
    });

    if (!gameState.players.host.id) {
        gameState.players.host.id = socket.id;
        socket.emit('role_assigned', 'host');
        socket.emit('balance_update', { balance: gameState.players.host.balance });
    } else if (!gameState.players.challenger.id) {
        gameState.players.challenger.id = socket.id;
        socket.emit('role_assigned', 'challenger');
        socket.emit('balance_update', { balance: gameState.players.challenger.balance });
        gameState.status = 'setup';
        io.emit('game_started', { message: 'Both players joined!' });
    } else {
        socket.emit('room_full');
    }

    socket.on('propose_bet_amount', (amount) => {
        if (gameState.status !== 'setup') return;
        const bet = parseFloat(amount);
        if (isNaN(bet) || bet <= 0 || bet > MAX_BET) {
            socket.emit('bet_error', 'Invalid bet amount');
            return;
        }
        gameState.agreedBetAmount = bet;
        io.emit('bet_amount_set', { amount: bet });
    });

    socket.on('accept_bet_and_direction', ({ direction }) => {
        if (gameState.status !== 'setup') return;
        const player = socket.id === gameState.players.host.id ? 'host' : 'challenger';
        const bet = gameState.agreedBetAmount;
        const serviceCharge = calculateServiceCharge(bet);

        gameState.players[player].balance -= (bet + serviceCharge);
        gameState.players[player].bet = bet;
        gameState.players[player].betDirection = direction;
        gameState.pot += bet;
        gameState.serviceCharge += serviceCharge;

        socket.emit('balance_update', { balance: gameState.players[player].balance });
        io.emit('player_bet', { player, direction });

        if (gameState.players.host.bet > 0 && gameState.players.challenger.bet > 0) {
            gameState.status = 'resolved';
            io.emit('both_bet', { message: 'Both locked in!', pot: gameState.pot });
        }
    });

    socket.on('disconnect', () => {
        if (socket.id === gameState.players.host.id) {
            gameState.players.host.id = null;
            gameState.players.host.balance = INITIAL_BALANCE;
        }
        if (socket.id === gameState.players.challenger.id) {
            gameState.players.challenger.id = null;
            gameState.players.challenger.balance = INITIAL_BALANCE;
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
    console.log('📊 Data Sources:');
    console.log('  - Crypto: Binance WebSocket (real-time)');
    console.log('  - Commodities: Twelve Data API (5s updates)');
    console.log('💡 Get free Twelve Data API key: https://twelvedata.com/register');
    console.log(`💰 Max bet: $${MAX_BET} | Fee: ${SERVICE_CHARGE_PERCENT}%`);
});
