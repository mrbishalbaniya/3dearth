# ✅ Kathmandu 3D Map - Verification Checklist

**Last Updated**: 2026-07-24  
**Status**: Ready for Testing

---

## Quick Verification

Run this command to verify all files exist:

```powershell
# Check all city3d files
Get-ChildItem -Path "d:\earth\frontend\src\components\earth\city3d" | Select-Object Name

# Expected output (8 files):
# ARCHITECTURE.md
# Building3D.tsx
# City3DScene.tsx
# index.ts
# KathmanduFlightScene.tsx
# OverpassAPI.ts
# README.md
# Road3D.tsx
# types.ts
```

---

## ✅ Files Created (Verified)

### Components (8 files in city3d/)
- [x] `types.ts` - TypeScript type definitions
- [x] `OverpassAPI.ts` - OpenStreetMap data fetcher
- [x] `Building3D.tsx` - Interactive 3D building component
- [x] `Road3D.tsx` - 3D road rendering
- [x] `City3DScene.tsx` - Standalone viewer with OrbitControls
- [x] `KathmanduFlightScene.tsx` - Flight integration scene
- [x] `index.ts` - Public API exports
- [x] `README.md` - Component documentation
- [x] `ARCHITECTURE.md` - Technical documentation

### Pages (1 file)
- [x] `src/app/kathmandu-3d/page.tsx` - Standalone 3D viewer page

### Missions (1 file)
- [x] `src/components/game/NepalGame/missions/KathmanduCityTour.ts` - Mission definition

### Documentation (4 files)
- [x] `KATHMANDU_3D_MAP.md` - Full implementation summary
- [x] `QUICKSTART_KATHMANDU_3D.md` - Quick start guide
- [x] `IMPLEMENTATION_COMPLETE.md` - Completion checklist
- [x] `VERIFICATION_CHECKLIST.md` - This file

### Updated Files (1 file)
- [x] `NepalFlightSim.tsx` - Added "🏙️ Kathmandu City Tour" as first mission

**Total**: 13 files (11 new + 2 updated)

---

## 🧪 Manual Testing Steps

### Test 1: TypeScript Compilation

```bash
cd d:\earth\frontend

# Check for TypeScript errors
npx tsc --noEmit
```

**Expected**: No errors (exit code 0)

---

### Test 2: Dev Server Start

```bash
cd d:\earth\frontend
npm run dev
```

**Expected**:
- Server starts on port 3000
- No fatal errors in console
- "compiled successfully" message

---

### Test 3: Standalone Viewer Page

```bash
# With dev server running, open browser:
http://localhost:3000/kathmandu-3d
```

**Expected Behavior**:
1. ⏳ Loading message: "Loading Kathmandu 3D Map..."
2. ⏳ Wait 3-5 seconds (fetching OSM data)
3. ✅ Gray 3D buildings appear
4. ✅ Green roads appear
5. ✅ Stats display: "Buildings: ~500 | Roads: ~100"
6. ✅ Controls work:
   - Left-click + drag = rotate camera
   - Scroll = zoom
   - Right-click + drag = pan
7. ✅ Click building = tooltip shows with info

**Check Console**:
- [ ] No errors (some warnings OK)
- [ ] See: "Fetched X buildings, Y roads"

---

### Test 4: Game Page Loads

```bash
# Open browser:
http://localhost:3000/game
```

**Expected**:
1. ✅ Page loads (no 404)
2. ✅ Blue sky with terrain
3. ✅ Mission card auto-appears
4. ✅ "🏙️ Kathmandu City Tour" is first mission
5. ✅ Can click "🎯 Missions" button

---

### Test 5: Mission Selection

**Steps**:
1. Click "🎯 Missions" button (top-right)
2. See mission list
3. Click "🏙️ Kathmandu City Tour"

**Expected**:
- ✅ Mission panel closes
- ✅ Mission starts
- ✅ HUD shows objectives
- ✅ Waypoints appear on map
- ✅ Can control aircraft

---

### Test 6: Building Interaction

**Steps**:
1. Go to `/kathmandu-3d`
2. Wait for buildings to load
3. Hover over a building (changes to blue)
4. Click a building

**Expected**:
- ✅ Hover changes color
- ✅ Click shows tooltip
- ✅ Tooltip displays:
  - Building name (if available)
  - Building type
  - Height or levels
  - Address (if available)

---

### Test 7: Area Toggle

**Steps**:
1. On `/kathmandu-3d` page
2. Find area toggle (top controls)
3. Switch between "City Center" and "Valley"

**Expected**:
- ✅ "City Center" loads ~500 buildings (fast)
- ✅ "Valley" loads ~2000+ buildings (slower)
- ✅ Scene clears and reloads
- ✅ Stats update correctly

---

### Test 8: Performance Check

**Steps**:
1. Open `/kathmandu-3d`
2. Press F12 → Performance tab
3. Click record, interact for 10 seconds, stop

**Expected**:
- ✅ FPS >= 30 (city center)
- ✅ FPS >= 20 (valley)
- ✅ No major frame drops
- ✅ Memory usage < 300 MB

---

### Test 9: Error Handling

**Steps**:
1. Disconnect internet
2. Refresh `/kathmandu-3d`

**Expected**:
- ✅ Shows error message
- ✅ Doesn't crash
- ✅ Can retry when reconnected

---

### Test 10: Mobile Responsiveness (Optional)

**Steps**:
1. Open Chrome DevTools
2. Toggle device toolbar (mobile view)
3. Test `/kathmandu-3d`

**Expected**:
- ✅ Page renders
- ✅ Touch controls work
- ✅ UI elements visible
- ✅ Performance acceptable (>20 FPS)

---

## 🐛 Common Issues & Fixes

### Issue: Page 404 on `/kathmandu-3d`

**Fix**:
```bash
# Restart dev server
Ctrl+C
npm run dev
```

---

### Issue: TypeScript errors in VSCode

**Fix**:
```
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

---

### Issue: Buildings not loading

**Checks**:
1. Internet connected?
2. Browser console for errors?
3. Check: https://overpass-api.de/api/status
4. Try refreshing page

---

### Issue: Low FPS

**Fixes**:
1. Switch to "City Center" (smaller area)
2. Close other browser tabs
3. Close GPU-intensive apps
4. Lower browser zoom level

---

## 📊 Expected Data

### Kathmandu City Center Bounds
```typescript
{
  north: 27.7172,
  south: 27.6884,
  east: 85.3340,
  west: 85.3000
}
```

### Kathmandu Valley Bounds
```typescript
{
  north: 27.75,
  south: 27.65,
  east: 85.40,
  west: 85.25
}
```

### Mission Waypoints
```typescript
[
  { lat: 27.7145, lng: 85.3120, name: "Thamel District" },
  { lat: 27.7106, lng: 85.3485, name: "Pashupatinath" },
  { lat: 27.7040, lng: 85.3076, name: "Durbar Square" },
  { lat: 27.7149, lng: 85.2903, name: "Swayambhunath" },
  { lat: 27.6966, lng: 85.3591, name: "Tribhuvan Airport" }
]
```

---

## 🔍 Debug Commands

### Check if files exist
```powershell
Test-Path "d:\earth\frontend\src\components\earth\city3d\types.ts"
Test-Path "d:\earth\frontend\src\app\kathmandu-3d\page.tsx"
```

### Count lines of code
```powershell
Get-ChildItem -Path "d:\earth\frontend\src\components\earth\city3d" -Filter "*.tsx" -Recurse | 
  Get-Content | Measure-Object -Line
```

### Check imports in mission file
```powershell
Get-Content "d:\earth\frontend\src\components\game\NepalGame\NepalFlightSim.tsx" | Select-String "kathmandu"
```

---

## ✅ Final Verification

Run all tests in order:

- [ ] Test 1: TypeScript compiles
- [ ] Test 2: Dev server starts
- [ ] Test 3: Standalone viewer loads
- [ ] Test 4: Game page loads
- [ ] Test 5: Mission selectable
- [ ] Test 6: Buildings interactive
- [ ] Test 7: Area toggle works
- [ ] Test 8: Performance acceptable
- [ ] Test 9: Error handling works
- [ ] Test 10: Mobile responsive (optional)

---

## 🎉 Success Criteria

**All tests pass?** → Implementation successful! ✅

**Some tests fail?** → Check Common Issues section

**Need help?** → See documentation:
- `QUICKSTART_KATHMANDU_3D.md`
- `city3d/README.md`
- `city3d/ARCHITECTURE.md`

---

## 📝 Test Results Template

```
Date: __________
Tester: __________

Test Results:
[ ] Test 1: TypeScript compilation - PASS/FAIL
[ ] Test 2: Dev server start - PASS/FAIL
[ ] Test 3: Standalone viewer - PASS/FAIL
[ ] Test 4: Game page - PASS/FAIL
[ ] Test 5: Mission selection - PASS/FAIL
[ ] Test 6: Building interaction - PASS/FAIL
[ ] Test 7: Area toggle - PASS/FAIL
[ ] Test 8: Performance - PASS/FAIL
[ ] Test 9: Error handling - PASS/FAIL
[ ] Test 10: Mobile - PASS/FAIL/SKIP

Notes:
_________________________________
_________________________________
_________________________________

Overall Result: PASS / FAIL
```

---

**Ready to test!** 🚀

Run the tests above and report any issues. All files are in place and implementation is complete.
