# 🚨 Quick Fix: HTTP 429 Error

## Error You're Seeing
```
Overpass API error: 429
```

---

## ⚡ 3-Step Quick Fix

### Step 1: Wait 2 Minutes ⏱️
Close the browser tab and wait **2 full minutes**.

### Step 2: Refresh Page 🔄
Open a fresh browser tab and visit:
```
http://localhost:3000/kathmandu-3d
```

### Step 3: Use "City Center" 🏙️
Click the **"City Center"** button (top-right), not "Valley".

---

## ✅ Should Work Now!

Expected result:
- Loading message for 5-10 seconds
- Gray buildings appear
- Green roads appear
- Stats show: `Buildings: ~500 | Roads: ~100`

---

## Still Not Working?

Try these in order:

### Option 1: Clear Cache
```
F12 → Network tab → Check "Disable cache" → Refresh (Ctrl+Shift+R)
```

### Option 2: Incognito Mode
Open the page in a private/incognito window:
```
Ctrl+Shift+N (Chrome)
Ctrl+Shift+P (Firefox)
```

### Option 3: Check API Status
Visit: https://overpass-api.de/api/status

Look for: `Slots available now: X`

If X = 0, the API is overloaded. Wait 5 minutes.

---

## Why This Happens

The free Overpass API limits requests to prevent abuse:
- **Max 2 requests per second**
- **Max 2 concurrent connections**
- **Shared by thousands of users worldwide**

When exceeded → HTTP 429 (rate limit).

---

## What We Fixed

The code now automatically:
- ✅ Tries 3 different API servers
- ✅ Retries up to 2 times with delays
- ✅ Spaces out requests (1 second gap)
- ✅ Shows helpful error messages

So even if one server is busy, it tries others!

---

## 📚 Need More Help?

See full guide:
```
TROUBLESHOOTING_RATE_LIMITS.md
```

---

**TL;DR**: Wait 2 minutes → Refresh → Use "City Center" → Works! ✨
