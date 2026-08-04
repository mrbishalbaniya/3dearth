# 🚨 Troubleshooting: Overpass API Rate Limits

## The Problem

You're seeing this error:
```
Overpass API error: 429
```

**HTTP 429** means "Too Many Requests" - the Overpass API is rate-limiting your requests.

---

## Why This Happens

The free public Overpass API has usage limits to prevent abuse:

1. **Request frequency**: Maximum ~2 requests per second
2. **Concurrent requests**: Maximum 2 simultaneous connections
3. **Area size**: Large areas take longer and consume more quota
4. **Shared infrastructure**: You share the API with thousands of users worldwide

When you exceed these limits, the API returns HTTP 429 and blocks further requests temporarily.

---

## ✅ Immediate Fixes

### Fix 1: Wait and Retry

**The simplest solution**:
1. Wait **60-120 seconds** (1-2 minutes)
2. Refresh the page
3. Try again with "City Center" (smaller area)

**Why it works**: Rate limits reset after a cooldown period.

---

### Fix 2: Use City Center (Not Valley)

The page has two area options:
- **City Center** ✅ (Recommended) - ~400m × 400m, loads in 5-10 seconds
- **Valley** ⚠️ (Larger) - ~15km × 10km, can trigger rate limits

**Steps**:
1. Click "City Center" button (top-right controls)
2. Wait for it to load
3. Only switch to "Valley" after City Center works

---

### Fix 3: Clear Browser Cache

Sometimes cached failed requests cause issues:

**Chrome/Edge**:
```
F12 → Network tab → Disable cache checkbox → Refresh (Ctrl+Shift+R)
```

**Firefox**:
```
F12 → Network tab → Settings gear → Disable cache → Refresh (Ctrl+Shift+R)
```

---

## 🔧 What We've Already Done

The code now includes **automatic fixes**:

### 1. Multiple API Endpoints (Failover)
```typescript
const OVERPASS_API_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",        // Germany
  "https://overpass.kumi.systems/api/interpreter",  // Switzerland
  "https://overpass.openstreetmap.ru/api/interpreter", // Russia
];
```

When one endpoint is rate-limited, it tries the next one.

---

### 2. Automatic Retry Logic

- **2 retries** with exponential backoff
- **Waits 2-4 seconds** between retries
- **Respects Retry-After header** from API

---

### 3. Staggered Requests

Instead of fetching buildings and roads in parallel (2 simultaneous requests), we now:
1. Fetch buildings first
2. Wait 1 second
3. Fetch roads

This reduces the chance of hitting rate limits.

---

### 4. Better Error Messages

Instead of just "Error 429", you now see:
```
⏳ Too many requests. The Overpass API is rate-limiting. 
   Please wait 1-2 minutes and refresh the page.
```

---

## 🕒 Understanding Cooldown Periods

When rate-limited, wait:

| Previous Requests | Cooldown Time |
|-------------------|---------------|
| 1-2 requests | 30 seconds |
| 3-5 requests | 60 seconds |
| 6-10 requests | 2 minutes |
| 10+ requests | 5+ minutes |

---

## 📊 Monitoring API Status

Check if Overpass API is having issues:

**Official status page**:
```
https://overpass-api.de/api/status
```

You should see:
```
Connected as: <your-ip>
Current time: ...
Rate limit: ...
Slots available now: X
```

If "Slots available now" is 0, the API is overloaded.

---

## 🔄 Alternative Solutions

If rate limiting persists, try these alternatives:

### Option 1: Use Cached/Static Data

For development, you can fetch OSM data once and save it locally:

**Steps**:
1. Successfully load "City Center" once
2. Open browser DevTools → Network tab
3. Find the Overpass API request
4. Copy the response JSON
5. Save as `public/data/kathmandu-buildings.json`
6. Update code to load from static file

**Trade-off**: Data becomes stale (not real-time).

---

### Option 2: Self-Hosted Overpass API

For production apps, consider hosting your own Overpass instance:

**Requirements**:
- Docker or VM
- 50GB+ disk space (for OSM planet data)
- 8GB+ RAM

**Setup**:
```bash
docker run -d -p 12345:80 \
  -v /path/to/data:/db \
  wiktorn/overpass-api
```

**Trade-off**: Infrastructure costs and maintenance.

---

### Option 3: Alternative APIs

Other OSM data sources:

1. **Nominatim** (geocoding + limited geometry)
   - https://nominatim.openstreetmap.org/
   - Rate limit: 1 request/second

2. **OSM API Direct** (for small queries)
   - https://api.openstreetmap.org/api/0.6/
   - Rate limit: More generous

3. **Commercial APIs** (no rate limits, but paid)
   - Mapbox
   - HERE Maps
   - Google Maps

---

## 🎯 Best Practices

To avoid rate limiting in the future:

### 1. Start Small
Always test with "City Center" before "Valley"

### 2. Cache Locally
Store fetched data in browser storage:
```typescript
localStorage.setItem('kathmandu-data', JSON.stringify(data));
```

### 3. Debounce Requests
Don't spam the API - wait between requests

### 4. Use Query Optimization
Fetch only what you need:
```overpass
// Bad - fetches all tags
out body geom;

// Good - fetches minimal data
out geom;
```

---

## 🧪 Testing the Fix

After implementing the improvements, test:

1. **Fresh browser** (incognito/private window)
2. **Visit**: http://localhost:3000/kathmandu-3d
3. **Select**: "City Center"
4. **Wait**: 10-15 seconds
5. **Verify**: Buildings load successfully

If you still see 429:
1. Close all tabs with the site
2. Wait 2 minutes
3. Try again in a fresh tab

---

## 📝 Debug Checklist

If problems persist:

- [ ] Waited at least 2 minutes since last 429 error?
- [ ] Using "City Center" (not "Valley")?
- [ ] Browser cache cleared?
- [ ] Internet connection stable?
- [ ] Other tabs closed?
- [ ] Tried incognito/private mode?
- [ ] Checked https://overpass-api.de/api/status?

---

## 🆘 Still Having Issues?

If none of the above works, check console logs:

**Browser Console** (F12):
```javascript
// Look for these messages:
"Overpass query attempt 1/3 using https://..."
"Rate limited (429). Waiting 2000ms before retry..."
"✓ Successfully fetched X elements from Overpass"
```

**What to look for**:
- Which endpoint failed?
- Did retry logic trigger?
- What was the final error?

---

## 🎉 Success Indicators

You'll know it's working when you see:

**Console logs**:
```
Overpass query attempt 1/3 using https://overpass-api.de/...
✓ Successfully fetched 523 elements from Overpass
Overpass query attempt 1/3 using https://overpass.kumi.systems/...
✓ Successfully fetched 142 elements from Overpass
```

**Page display**:
```
✓ Buildings: 523
✓ Roads: 142
```

**Visual**:
- Gray 3D buildings rendered
- Green road lines visible
- Can click buildings for tooltips

---

## 📚 Additional Resources

- **Overpass API Wiki**: https://wiki.openstreetmap.org/wiki/Overpass_API
- **Rate Limiting**: https://dev.overpass-api.de/overpass-doc/en/preface/commons.html
- **Query Language**: https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide
- **Status Page**: https://overpass-api.de/api/status

---

**Remember**: The rate limiting is by design to keep the free API sustainable for everyone. Patience and proper retry logic will get you through! 🚀
