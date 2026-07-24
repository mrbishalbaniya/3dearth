# Nepal Game Testing Checklist

## Prerequisites
✅ All component files created
✅ All data files present (nepal.geojson, nepal_cities.json, nepal_mountains.json)
✅ Dependencies installed
✅ Development server running

## Access
Navigate to: **http://localhost:3000/game**

---

## Test 1: Initial Load & Auto-Focus
**Expected:**
- [ ] Page loads without errors
- [ ] Camera automatically flies to Nepal center (28.39°N, 84.12°E)
- [ ] Camera settles at ~250km altitude
- [ ] Nepal is prominently visible in center
- [ ] Transition takes ~3 seconds with smooth animation

**What to check:**
- Open browser console (F12) for any errors
- Verify smooth camera movement
- Check that Nepal country boundary is visible

---

## Test 2: UI Components Render

### Left Panel (Nepal Game Menu)
- [ ] Menu appears on left side
- [ ] Three tabs visible: "Explore", "Cities", "Mountains"
- [ ] Challenge list displays 5 challenges
- [ ] Each challenge shows:
  - Name
  - Difficulty (Easy/Medium/Hard)
  - Points
  - Timer duration
  - Start button or ✓ completion mark

### Right Panel (Nepal Game HUD)
- [ ] HUD appears on right side
- [ ] Score displays as "0"
- [ ] Progress stats show:
  - "Cities Found: 0/12"
  - "Mountains: 0/8"
  - "Distance: 0 km"
- [ ] "No active challenge" message appears
- [ ] Current coordinates display (should be near 28.39°N, 84.12°E)
- [ ] Current altitude displays (~250 km initially)

---

## Test 3: Nepali Font Rendering
**Expected:**
- [ ] Devanagari script renders correctly (not boxes/question marks)
- [ ] Cities show both English and Nepali names
- [ ] Font is clear and readable

**Cities to check:**
- काठमाडौं (Kathmandu)
- पोखरा (Pokhara)
- ललितपुर (Lalitpur)

---

## Test 4: Discovery Mechanics

### Test 4a: City Discovery
1. Click "Cities" tab
2. Click "Kathmandu" in the list
3. Wait for camera to fly to Kathmandu
4. Zoom in closer (scroll or controls)

**Expected:**
- [ ] Camera flies to Kathmandu coordinates
- [ ] City marker becomes visible
- [ ] When close enough (altitude < ~50km), marker color changes from gray to green/gold
- [ ] HUD updates: "Cities Found: 1/12"
- [ ] Score increases (10 pts for capital, 5 pts for others)
- [ ] Discovery notification appears (if implemented)

### Test 4b: Mountain Discovery
1. Click "Mountains" tab
2. Click "Mount Everest" (should be at top)
3. Wait for camera to fly to Everest
4. Zoom in close

**Expected:**
- [ ] Camera flies to Everest coordinates (27.9881°N, 86.9250°E)
- [ ] Mountain marker becomes visible
- [ ] When close enough, marker changes from gray to red (Everest is special)
- [ ] HUD updates: "Mountains: 1/8"
- [ ] Score increases by 50 pts
- [ ] Marker shows elevation: 8848.86m

---

## Test 5: Challenge System

### Challenge 5a: "Find Kathmandu" (Easy)
1. Click "Explore" tab
2. Click "Start" on "Find Kathmandu" challenge
3. Use menu to navigate to Kathmandu
4. Get close enough to discover it

**Expected:**
- [ ] Timer starts countdown from 60 seconds
- [ ] Challenge card appears in HUD showing:
  - "Find Kathmandu"
  - Description
  - Remaining time
- [ ] When Kathmandu discovered:
  - Timer stops
  - Score increases by 100 pts
  - Challenge marked complete (✓)
  - Success message appears

### Challenge 5b: "Find Mount Everest" (Medium)
1. Click "Start" on "Find Mount Everest"
2. Navigate to Everest
3. Discover it within 90 seconds

**Expected:**
- [ ] Timer starts at 90 seconds
- [ ] Score increases by 200 pts on completion
- [ ] Challenge marked complete

### Challenge 5c: Timer Expiry
1. Start "Find Pokhara" challenge
2. Wait for timer to reach 0 without finding Pokhara

**Expected:**
- [ ] Timer reaches 0
- [ ] Challenge fails (no points awarded)
- [ ] Challenge remains incomplete (can retry)
- [ ] Failure message appears

---

## Test 6: Navigation & Camera Controls

### Mouse Controls
- [ ] Left-click + drag: Rotate globe
- [ ] Right-click + drag: Pan camera
- [ ] Scroll wheel: Zoom in/out
- [ ] Globe rotation feels smooth
- [ ] No crashes when zooming rapidly

### FlyTo Functionality
1. Click different cities/mountains in menu
2. Camera should smoothly transition to each location

**Expected:**
- [ ] Smooth transitions (not instant jumps)
- [ ] Correct locations reached
- [ ] No camera going underground or into space
- [ ] Altitude adjusts appropriately for each location

---

## Test 7: Marker System

### Visual Checks
- [ ] Markers always face camera (billboard effect)
- [ ] Markers positioned correctly on globe surface
- [ ] Markers scale appropriately with zoom
- [ ] Text is readable when close
- [ ] Color coding correct:
  - Gray: Undiscovered
  - Green: Discovered cities
  - Gold: Kathmandu (capital)
  - Blue: Discovered mountains
  - Red: Mount Everest

### All Markers Visible
**12 Cities to find:**
1. [ ] Kathmandu (Capital, center)
2. [ ] Pokhara (west of Kathmandu)
3. [ ] Lalitpur (near Kathmandu)
4. [ ] Bharatpur (south of Kathmandu)
5. [ ] Biratnagar (far east)
6. [ ] Birgunj (south border)
7. [ ] Dharan (east)
8. [ ] Hetauda (south)
9. [ ] Janakpur (southeast)
10. [ ] Butwal (west)
11. [ ] Dhangadhi (far west)
12. [ ] Nepalgunj (mid-west)

**8 Mountains (8000m+) to find:**
1. [ ] Mount Everest (8848.86m) - northeast
2. [ ] Kanchenjunga (8586m) - far east
3. [ ] Lhotse (8516m) - near Everest
4. [ ] Makalu (8485m) - east of Everest
5. [ ] Cho Oyu (8188m) - west of Everest
6. [ ] Dhaulagiri (8167m) - west central
7. [ ] Manaslu (8163m) - central
8. [ ] Annapurna I (8091m) - west

---

## Test 8: Edge Cases & Error Handling

### Boundary Testing
- [ ] Try to fly outside Nepal bounds (should work, but game focuses on Nepal)
- [ ] Zoom very close (altitude < 100m)
- [ ] Zoom very far (altitude > 1000km)
- [ ] Rapid camera movements don't cause crashes

### State Persistence
- [ ] Refresh page - game resets to initial state
- [ ] Score resets to 0
- [ ] Discoveries reset
- [ ] Camera resets to Nepal center

### Multiple Challenge Attempts
- [ ] Start a challenge
- [ ] Start different challenge before completing first
- [ ] First challenge should cancel
- [ ] New challenge activates

---

## Test 9: Performance

### Frame Rate
- [ ] Smooth animation (aim for 60 FPS)
- [ ] No stuttering when rotating globe
- [ ] Markers don't cause lag
- [ ] UI remains responsive during camera movements

### Browser Console
- [ ] No error messages in console
- [ ] No warning messages (or only minor ones)
- [ ] No memory leaks (check over time)

---

## Test 10: Responsive Design

### Desktop
- [ ] Panels don't overlap globe
- [ ] All text readable
- [ ] Buttons clickable
- [ ] Scrolling works in menus

### Check Different Zoom Levels
- [ ] UI scales appropriately
- [ ] No elements cut off
- [ ] Readable at various browser zoom levels (90%, 100%, 110%)

---

## Known Issues to Watch For

### From Previous Development:
1. **Zoom crash**: System mentioned potential crash when zooming rapidly
   - Test: Rapidly scroll in/out repeatedly
   - If crash occurs, note exact steps to reproduce

2. **Marker positioning**: Ensure markers don't appear underground or floating far from surface

3. **Timer accuracy**: Verify countdown timers are accurate (use stopwatch)

4. **Discovery radius**: Check if detection distance feels right
   - Too sensitive: Discoveries from too far away
   - Too strict: Need to zoom very close for discovery

---

## Success Criteria

### Minimum Viable:
- ✅ Page loads without errors
- ✅ Camera auto-focuses on Nepal
- ✅ All 12 cities visible and discoverable
- ✅ All 8 mountains visible and discoverable
- ✅ At least one challenge completable
- ✅ Score updates correctly
- ✅ Nepali text renders properly

### Full Feature Set:
- ✅ All 5 challenges work
- ✅ All navigation methods work (clicks, mouse, flyTo)
- ✅ All UI elements render correctly
- ✅ No console errors
- ✅ Smooth performance (>30 FPS)
- ✅ Discovery mechanics feel good

---

## Reporting Issues

When reporting issues, include:
1. **Browser**: (Chrome, Firefox, Edge, etc.)
2. **Screen**: (Screenshot or description)
3. **Console**: (Error messages if any)
4. **Steps**: (Exact steps to reproduce)
5. **Expected vs Actual**: (What should happen vs what happens)

---

## Quick Start Testing Sequence

**5-Minute Smoke Test:**
1. Open http://localhost:3000/game
2. Wait for camera to settle on Nepal
3. Click "Cities" → "Kathmandu" → verify fly-to works
4. Zoom in close → verify city discovered and score increases
5. Click "Mountains" → "Mount Everest" → verify fly-to works
6. Zoom in → verify mountain discovered
7. Click "Explore" → Start "Find Kathmandu" challenge
8. Navigate to Kathmandu → verify challenge completes
9. Check HUD for updated score and progress
10. Check console (F12) for errors

**Result:** If all 10 steps work, core functionality is solid! 🎉

---

## Next Steps After Testing

If everything works:
- Share screenshots/recording
- Provide feedback on game feel
- Suggest improvements or new features

If issues found:
- Document each issue with details above
- Prioritize blockers vs nice-to-haves
- We'll fix and retest

---

**Happy Testing! 🇳🇵 🏔️ 🎮**
