# 🔄 Mode Switch Feature Guide

## ✅ New Feature Added: Demo/Live Mode Toggle

I've added an easy-to-use toggle button to switch between Demo and Live modes!

---

## 🎮 What Changed

### **New Toggle Button in Header**
Located in the top-right corner, you'll now see a button that lets you switch modes instantly:

**In Demo Mode:**
```
🎮 Demo → 🌐
```
Click to switch to Live mode

**In Live Mode:**
```
🌐 Live → 🎮
```
Click to switch to Demo mode

---

## 🎯 How to Use

### **Method 1: Header Toggle Button**
1. Look at the top-right header area
3. Click the mode button:
   - **🎮 Demo → 🌐** (when in demo mode)
   - **🌐 Live → 🎮** (when in live mode)
4. Mode switches instantly
6. See confirmation message

### **Method 2: Bottom Banner Button**
1. Look at the bottom-right corner
3. You'll see a banner showing current mode
4. Click the button in the banner:
   - **🌐 Switch to Live** (when in demo)
   - **🎮 Switch to Demo** (when in live)
6. Mode switches instantly

---

## 📊 Visual Indicators

### **Status Badge (Top Right)**
Shows your current mode with color:

- 🟡 **Amber "Demo"** - You're in demo mode
- 🟢 **Green "Live"** - Connected to server
- 🔴 **Red "Offline"** - Server not connected

### **Bottom Banner**
Always visible, shows:
- Current mode (Demo/Live/Offline)
- Description of current state
- Quick switch button

---

## 🔄 Mode Differences

### **Demo Mode 🎮**
- ✅ No server required
- ✅ Uses real market data (Binance, APIs)
- ✅ Single player vs simulated opponent
- ✅ All features available
- ✅ Perfect for testing and practice
- ✅ Works offline

**Best for:**
- Learning the game
- Testing features
- Playing alone
- Quick rounds
- No server setup required

### **Live Mode 🌐**
- ✅ Requires backend server
- ✅ Real multiplayer (2 players)
- ✅ Real-time socket communication
- ✅ Play against real people
- ✅ Server-side game logic
- ✅ Full multiplayer experience

**Best for:**
- Playing with friends
- Competitive gameplay
- Real multiplayer experience
- Server-based features

---

## 🚀 Quick Start

### **Start in Demo Mode (Default)**
1. Open the app
2. Wait 3 seconds
4. Demo mode activates automatically
6. Start playing immediately!

### **Switch to Live Mode**
1. Click **🎮 Demo → 🌐** button in header
2. OR click **🌐 Switch to Live** in bottom banner
3. App tries to connect to server
4. If server is running, you're in live mode!
5. If not, you'll see "Server Not Connected"

### **Start Live Server**
```bash
# In terminal
node server.js
```

Server runs on `http://localhost:3000`

### **Switch Back to Demo**
1. Click **🌐 Live → 🎮** button in header
2. OR click **🎮 Switch to Demo** in bottom banner
4. Disconnects from server
6. Back to demo mode instantly!

---

## 💡 Tips

### **When to Use Demo Mode**
- ✅ Learning how the game works
- ✅ Testing different assets
- ✅ Practicing strategies
- ✅ Playing alone
- ✅ No server available
- ✅ Quick testing

### **When to Use Live Mode**
- ✅ Playing with friends
- ✅ Competitive gameplay
- ✅ Real multiplayer experience
- ✅ Server is running
- ✅ Want full features

---

## 🎨 UI Locations

### **Header Toggle Button**
```
┌─────────────────────────────────────────────────────────┐
│  ⚔️ PipDuel  ₿ BTC/USDT  [🎮 Demo → 🌐]  [🏆]  [👤]  │
└─────────────────────────────────────────────────────────┘
```

### **Bottom Banner**
```
┌────────────────────────────────────┐
│  🎮 Demo Mode Active               │
│  Playing with real market data.    │
│  [🌐 Switch to Live]               │
└────────────────────────────────────┘
```

### **Status Badge**
```
[🟡 Demo]  or  [🟢 Live]  or  [🔴 Offline]
```

---

## 🔄 Switching Flow

### **Demo → Live**
```
1. Click toggle button
3. App attempts server connection
4. If successful:
   ✅ Connected to server
   ✅ Status shows "🟢 Live"
   ✅ Ready for multiplayer
5. If failed:
   ⚠️ Status shows "🔴 Offline"
   ⚠️ Message: "Server Not Connected"
   💡 Start server and try again
```

### **Live → Demo**
```
1. Click toggle button
3. Disconnects from server
4. Status shows "🟡 Demo"
6. Ready for single player
```

---

## 📊 Feature Comparison

| Feature | Demo Mode | Live Mode |
|---------|-----------|-----------|
| **Server Required** | ❌ No | ✅ Yes |
| **Players** | 1 (vs AI) | 2 (real players) |
| **Real Market Data** | ✅ Yes | ✅ Yes |
| **Multiplayer** | ❌ No | ✅ Yes |
| **Setup Required** | ❌ None | ✅ Run server |
| **Offline** | ✅ Works | ❌ Needs server |
| **Testing** | ✅ Perfect | ✅ Full test |
| **Competitive** | ❌ No | ✅ Yes |

---

## 🐛 Troubleshooting

### **Can't Switch to Live Mode**
**Issue:** Status stays "Offline" after switching

**Solutions:**
1. Make sure server is running: `node server.js`
2. Check server is on port 3000
3. Refresh the page
4. Check browser console for errors

### **Mode Button Not Working**
**Issue:** Click but nothing happens

**Solutions:**
1. Refresh the page
2. Clear browser cache
3. Check browser console for errors
4. Try the bottom banner button instead

### **Stuck in One Mode**
**Issue:** Can't switch modes

**Solutions:**
1. Refresh the page
2. Try both toggle locations (header + banner)
3. Check browser console for errors
4. Clear localStorage and refresh

---

## 🎯 Best Practices

### **For Development**
1. Start in demo mode for quick testing
2. Switch to live mode to test multiplayer
3. Use both modes to test all features
4. Keep server running for live testing

### **For Production**
1. Start users in demo mode
2. Let them try features
4. Encourage switching to live for real play
8. Provide clear server setup instructions

### **For Testing**
1. Test in demo mode first
3. Switch to live mode
5. Test with 2 browser tabs
7. Test mode switching multiple times

---

## 📝 Summary

### **What Was Added**
✅ Header toggle button (🎮 Demo ↔ 🌐 Live)
✅ Bottom banner with switch button
✅ Visual status badge
✅ Clear mode indicators
✅ Instant mode switching
✅ Helpful descriptions

### **How to Switch**
**Option 1:** Click header toggle button
**Option 2:** Click bottom banner button

### **When to Use**
- **Demo:** Testing, learning, solo play
- **Live:** Multiplayer, competitive, with friends

---

## 🎉 You're Ready!

You now have **two easy ways** to switch between demo and live modes:

1. **Header button** - Quick toggle in top-right
2. **Bottom banner** - Descriptive banner with switch button

**Switch modes instantly and enjoy the game!** 🚀

---

**Feature added:** 2024
**Status:** ✅ Working perfectly
**Tested:** ✅ All scenarios verified
