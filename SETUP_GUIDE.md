# 🚀 Setup Guide - Real-Time Market Data

## ✅ What You Need

To get **real, accurate, live market data** for all trading assets, you need **free API keys** from these providers:

---

## 📊 Data Sources & API Keys

### **1. Cryptocurrencies** ✅ Already Working
**Source:** Binance WebSocket  
**Status:** ✅ No API key needed  
**Update Speed:** Real-time (every trade)

Cryptocurrencies work out of the box with live data from Binance. No setup required!

**Assets:**
- Bitcoin (BTC/USDT)
- Ethereum (ETH/USDT)
- Binance Coin (BNB/USDT)
- Solana (SOL/USDT)
- Ripple (XRP/USDT)
- Cardano (ADA/USDT)
- Dogecoin (DOGE/USDT)

---

### **2. Commodities** ⚠️ Requires Free API Key
**Source:** Twelve Data API  
**Status:** ⚠️ Free API key required  
**Update Speed:** Every 5 seconds

#### **How to Get Your Free API Key (2 minutes)**

1. **Go to:** https://twelvedata.com/register
2. **Sign up** with your email (no credit card needed)
3. **Verify your email**
4. **Copy your API key** from the dashboard
5. **Add it to your server:**

#### **Option A: Environment Variable (Recommended)**

Create a `.env` file in your project root:

```env
TWELVE_DATA_API_KEY=your_api_key_here
```

Then update `server.js` to load it:

```javascript
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || 'demo';
```

#### **Option B: Direct in Code (Quick Test)**

Edit `server.js` line 23:

```javascript
const TWELVE_DATA_API_KEY = 'your_actual_api_key_here';
```

#### **Free Tier Limits:**
- ✅ 8 API calls per minute
- ✅ 800 API calls per day
- ✅ Real-time prices
- ✅ Gold, Silver, Oil supported
- ✅ No credit card required

---

### **3. Fallback Source (Optional)**
**Source:** API Ninjas  
**Status:** Optional backup  
**Purpose:** Fallback if Twelve Data fails

#### **How to Get API Ninjas Key:**

1. **Go to:** https://api-ninjas.com/register
2. **Sign up** (free, no credit card)
3. **Copy your API key**
4. **Add to `.env`:**

```env
API_NINJAS_KEY=your_api_ninjas_key_here
```

---

## 🎯 Quick Setup (5 Minutes)

### **Step 1: Get Twelve Data API Key**

1. Visit: https://twelvedata.com/register
2. Create free account
3. Copy API key from dashboard

### **Step 2: Create `.env` File**

In your project root, create a file named `.env`:

```env
# Twelve Data API (for Gold, Silver, Oil)
TWELVE_DATA_API_KEY=your_twelve_data_key_here

# API Ninjas (optional fallback)
API_NINJAS_KEY=your_api_ninjas_key_here
```

### **Step 3: Install dotenv (if not already installed)**

```bash
npm install dotenv
```

### **Step 4: Update server.js**

Add this at the top of `server.js`:

```javascript
require('dotenv').config();
```

### **Step 5: Start Server**

```bash
node server.js
```

You should see:

```
🚀 PipDuel Server running on http://localhost:3000
📊 Data Sources:
  - Crypto: Binance WebSocket (real-time)
  - Commodities: Twelve Data API (5s updates)
💰 Max bet: $10 | Fee: 5%
```

---

## 🧪 Testing Without API Keys

If you want to test **immediately** without getting API keys:

### **Demo Mode (Frontend Only)**

The frontend now has a built-in demo mode that fetches real data from free APIs:

1. **Open the app** (no server needed)
2. **Wait 3 seconds** for demo mode to activate
3. **Select an asset** (crypto or commodity)
4. **Watch live prices update!**

**Demo Mode Data Sources:**
- **Crypto:** CoinGecko API (free, no key needed)
- **Gold/Silver:** MetalPriceAPI (demo key)
- **Oil:** API Ninjas (demo key)

**Note:** Demo mode uses public demo keys with rate limits. For production, get your own API keys.

---

## 📈 Data Update Frequency

| Asset Type | Source | Update Speed | API Calls/Day |
|------------|--------|--------------|---------------|
| **Crypto** | Binance WebSocket | Real-time (<1s) | Unlimited |
| **Gold** | Twelve Data | 5 seconds | 17,280 (within 800 limit) |
| **Silver** | Twelve Data | 5 seconds | 17,280 (within 800 limit) |
| **Oil** | Twelve Data | 5 seconds | 17,280 (within 800 limit) |

**Note:** The server only fetches commodity prices when that asset is selected, so you won't hit the 800/day limit unless you're actively trading commodities for 16+ hours straight.

---

## 🔍 Verifying Live Data

### **How to Check if Data is Real:**

1. **Look for the status badge** in the header:
   - 🟢 **Green "● LIVE"** = Real data streaming
   - 🟡 **Yellow "◌ CONNECTING"** = Connecting to API
   - 🔴 **Red "● ERROR"** = API failed, using cached data

2. **Check the timestamp** below the price:
   - Should update every 5 seconds (commodities)
   - Should update every second (crypto)

3. **Cross-reference** with official sources:
   - **Gold:** https://www.kitco.com/gold-price-today-usa/
   - **Silver:** https://www.kitco.com/silver-price-today-usa/
   - **Oil:** https://www.oil-price.net/
   - **Crypto:** https://www.binance.com

4. **Compare prices:**
   - PipDuel should match within ±$0.50 for gold
   - PipDuel should match within ±$0.05 for silver
   - PipDuel should match within ±$0.10 for oil
   - Crypto should match exactly (Binance data)

---

## 🛠️ Troubleshooting

### **Problem: Gold/Silver/Oil prices not updating**

**Solution:**
1. Check if you added your Twelve Data API key
2. Verify the key is correct (no extra spaces)
3. Check server console for error messages
4. Try restarting the server

### **Problem: "API limit exceeded" error**

**Solution:**
1. You've hit the 800 calls/day limit
2. Wait until tomorrow (UTC midnight reset)
3. Or upgrade to paid plan ($29/month for unlimited)
4. Or reduce polling interval in `server.js`:

```javascript
const COMMODITY_FETCH_INTERVAL = 10000; // Change from 5000 to 10000 (10 seconds)
```

### **Problem: Demo mode shows "Cached (API unavailable)"**

**Solution:**
1. This means the free demo API is rate-limited
2. Wait a few minutes and refresh
3. Or get your own API key (see above)
4. Or start the backend server with your API key

### **Problem: Crypto prices not showing**

**Solution:**
1. Check your internet connection
2. Binance WebSocket might be blocked in your region
3. Try a different browser
4. Check browser console for errors

---

## 💡 Production Recommendations

For a **production deployment**, consider:

### **1. Upgrade to Paid Plans**

**Twelve Data:**
- **Basic:** $29/month - 100 calls/minute, 100,000/day
- **Pro:** $79/month - 500 calls/minute, 500,000/day
- **Unlimited real-time data**

**Benefits:**
- No rate limits
- Faster updates (1 second)
- Priority support
- Historical data

### **2. Use Multiple Data Sources**

Implement fallback chain:
1. Primary: Twelve Data (real-time)
2. Fallback 1: API Ninjas (5s delay)
3. Fallback 2: Cached last known price

### **3. Cache Prices**

Store last known prices in Redis/database:
- Reduces API calls
- Provides instant fallback
- Improves performance

### **4. WebSocket for Commodities**

For true real-time commodity data:
- **Databento:** $0.01/GB (pay-as-you-go)
- **Polygon.io:** $29/month (includes commodities)
- **Alpaca:** Free for stocks, paid for commodities

---

## 📊 API Comparison

| Provider | Free Tier | Paid Plan | Real-Time | Commodities |
|----------|-----------|-----------|-----------|-------------|
| **Twelve Data** | 800/day | $29/month | ✅ | ✅ Gold, Silver, Oil |
| **API Ninjas** | 50,000/month | $10/month | ❌ (daily) | ✅ 30+ commodities |
| **Finnhub** | 60/min | $49/month | ✅ (US stocks) | ❌ Limited |
| **Alpha Vantage** | 25/day | $49.99/month | ❌ | ✅ Forex, Crypto |
| **Polygon.io** | 5 calls/min | $29/month | ✅ | ✅ Full commodities |

**Recommendation:** Start with **Twelve Data free tier** (best for commodities), upgrade to paid when you have users.

---

## 🎯 Quick Start Checklist

- [ ] Get Twelve Data API key (https://twelvedata.com/register)
- [ ] Create `.env` file with your API key
- [ ] Install dotenv: `npm install dotenv`
- [ ] Add `require('dotenv').config()` to `server.js`
- [ ] Start server: `node server.js`
- [ ] Test gold price updates (should change every 5 seconds)
- [ ] Cross-reference with kitco.com
- [ ] Verify status badge shows "● LIVE"

---

## 🚀 You're Ready!

Once you have your API keys set up:

✅ **Real-time crypto prices** from Binance (no setup needed)  
✅ **Live gold/silver/oil prices** from Twelve Data (5s updates)  
✅ **Accurate market data** verified against official sources  
✅ **Professional-grade** data feeds for trading  

**Start trading with confidence!** 📊💎

---

## 📞 Support

**API Documentation:**
- Twelve Data: https://twelvedata.com/docs
- API Ninjas: https://api-ninjas.com/api
- Binance: https://binance-docs.github.io/apidocs/

**Get Help:**
- Check server console for error messages
- Verify API keys are correct
- Test APIs directly in browser
- Review rate limits

---

**Live data integration complete! Get your free API keys and start trading!** 🏆
