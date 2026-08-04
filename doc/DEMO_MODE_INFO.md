# 🎮 Demo Mode - Kathmandu 3D Map

## What is Demo Mode?

When the Overpass API is unavailable (timeout, rate limit, or down), the system automatically falls back to **Demo Mode** with sample buildings.

---

## How It Works

### Automatic Fallback

```typescript
// OverpassAPI.ts
try {
  const data = await this.executeQuery(query);
  return data.elements; // Real OSM data
} catch (error) {
  if (USE_DEMO_MODE) {
    console.warn("Using demo data instead");
    return SAMPLE_KATHMANDU_BUILDINGS; // Fallback
  }
  throw error;
}
```

When **all 3 API endpoints fail** after retries:
1. System catches the error
2. Loads sample data from `sampleData.ts`
3. Shows blue banner: "ℹ️ Demo Mode: Overpass API unavailable"
4. Renders 8 sample buildings + 3 roads

---

## Sample Data

### Buildings (8 total)

1. **Tribhuvan International Airport Terminal** - 3 levels
2. **Pashupatinath Temple** - 15m high, 2 levels
3. **Durbar Square Building** - 4 levels
4. **Thamel Hotel** - 5 levels (commercial)
5. **Swayambhunath Stupa** - 20m high, 2 levels
6. **Residential building** - 3 levels
7. **Commercial building** - 4 levels
8. **Generic building** - 2 levels

### Roads (3 total)

1. **Ring Road** (primary highway)
2. **Thamel Street** (secondary)
3. **Durbar Road** (tertiary)

---

## Visual Indicators

### When Demo Mode is Active

**Blue banner (top-right)**:
```
ℹ️ Demo Mode: Overpass API unavailable. Showing sample buildings.
The Overpass API is currently unavailable. Using 8 sample buildings for demonstration.
```

**Stats display (bottom-left)**:
```
Buildings: 8 (of 8) | Roads: 3
```

**Console logs**:
```
⚠️ Overpass API unavailable. Using demo data instead.
⚠️ Overpass API unavailable. Using demo roads instead.
```

---

## Testing Demo Mode

### Method 1: Wait for API Timeout (Current)

Just visit the page - if Overpass API is down, demo mode activates automatically after ~75 seconds (25s × 3 endpoints).

### Method 2: Force Demo Mode

Edit `OverpassAPI.ts`:
```typescript
const USE_DEMO_MODE = true; // Already enabled

// Force immediate demo mode (skip API calls):
static async fetchBuildings(bounds: GeoBounds): Promise<OSMBuilding[]> {
  console.warn("Force demo mode");
  return SAMPLE_KATHMANDU_BUILDINGS; // Skip API call
}
```

---

## Benefits

### 1. **Always Works**
- No dependency on external API
- Works offline
- Instant loading

### 2. **Good for Development**
- Test rendering without waiting for API
- Predictable data
- Fast iteration

### 3. **User Experience**
- No blank screen on API failure
- Clear communication (blue banner)
- Still demonstrates the 3D features

---

## Limitations

### What Demo Mode Cannot Do

❌ Show real, current building data  
❌ Cover entire Kathmandu valley  
❌ Include all building details  
❌ Demonstrate large-scale performance  

### What Demo Mode CAN Do

✅ Show 3D building rendering  
✅ Interactive tooltips (click buildings)  
✅ Orbit controls (rotate/zoom)  
✅ Building height visualization  
✅ Road network rendering  
✅ Camera movement  
✅ Proof of concept  

---

## Adding More Sample Buildings

Edit `sampleData.ts`:

```typescript
export const SAMPLE_KATHMANDU_BUILDINGS: OSMBuilding[] = [
  // Existing buildings...
  
  // Add new building:
  {
    id: 1009, // Unique ID
    type: "way",
    tags: {
      building: "residential",
      name: "My Building",
      "building:levels": "3",
    },
    geometry: [
      { lat: 27.7000, lon: 85.3200 }, // SW corner
      { lat: 27.7003, lon: 85.3200 }, // SE corner
      { lat: 27.7003, lon: 85.3205 }, // NE corner
      { lat: 27.7000, lon: 85.3205 }, // NW corner
      { lat: 27.7000, lon: 85.3200 }, // Close shape
    ],
  },
];
```

**Coordinates for Kathmandu area**:
- Latitude: 27.65 - 27.75
- Longitude: 85.25 - 85.40

---

## Disabling Demo Mode

If you want to **only show errors** when API fails (no fallback):

Edit `OverpassAPI.ts`:
```typescript
const USE_DEMO_MODE = false; // Disable demo mode
```

Then API failures will show:
```
❌ Error: Request timeout after 25s
```

---

## Production Considerations

### For Public Deployment

**Option 1: Keep Demo Mode**
- Users always see something
- Graceful degradation
- Good UX

**Option 2: Disable Demo Mode**
- Only show real data
- Clear error messages
- Honest about limitations

**Option 3: Pre-cached Data**
- Fetch OSM data once
- Save to `public/data/kathmandu-cached.json`
- Load cached data (not sample)
- Update cache weekly

---

## Current Status

✅ **Demo mode: ENABLED**  
✅ **Automatic fallback: ACTIVE**  
✅ **Sample buildings: 8**  
✅ **Sample roads: 3**  
✅ **User notification: Blue banner**

---

## What You Should See Now

1. Visit: http://localhost:3000/kathmandu-3d
2. Wait ~75 seconds (API timeout on all 3 servers)
3. See blue banner: "Demo Mode: Overpass API unavailable"
4. See 8 buildings rendered
5. Can interact (click, rotate, zoom)
6. Stats show: "Buildings: 8 | Roads: 3"

---

## Next Steps

### If API Comes Back Online

The system will automatically use real data again. Demo mode only activates on failure.

### If You Want More Sample Data

Add more buildings to `sampleData.ts` - you can add hundreds if needed.

### If You Want Cached Real Data

1. Successfully fetch from API once
2. Save response to JSON file
3. Load from file instead of API
4. See `TROUBLESHOOTING_RATE_LIMITS.md` Option 1

---

**Demo mode is now active and working!** 🎉

Try refreshing the page and wait for the blue "Demo Mode" banner to appear.
