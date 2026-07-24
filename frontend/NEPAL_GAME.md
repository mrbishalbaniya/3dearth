# Nepal Explorer Game

An interactive geographic exploration game focused on Nepal, featuring cities, mountains, and challenges.

## Features

### 🗺️ Nepal-Focused Map
- Camera automatically focuses on Nepal when accessing `/game`
- Restricted view to Nepal's geographic bounds (26°N to 31°N, 80°E to 89°E)
- Interactive 3D markers for cities and mountains

### 🏙️ Cities System
- **12 major cities** including:
  - Kathmandu (Capital) ⭐
  - Pokhara (Gateway to Annapurna)
  - Lalitpur, Bharatpur, Biratnagar, and more
- **Discovery mechanic**: Cities are discovered when you zoom close enough
- **Bilingual names**: English and Nepali (Devanagari script)
- **City details**: Population, elevation, and description

### 🏔️ Mountains System
- **8 peaks over 8000m** including:
  - Mount Everest (8848.86m) 👑
  - Kanchenjunga, Lhotse, Makalu, Cho Oyu
  - Dhaulagiri, Manaslu, Annapurna I
- **Visual markers**: Different colors for discovered vs undiscovered
- **Rank and elevation** information
- **Mountain ranges**: Mahalangur Himal, Annapurna Himal, etc.

### 🎯 Game Challenges
1. **Find Kathmandu** (Easy - 100 pts, 60 seconds)
2. **Find Mount Everest** (Medium - 200 pts, 90 seconds)
3. **Find Pokhara** (Medium - 150 pts, 75 seconds)
4. **Identify the 8000ers** (Hard - 500 pts, 300 seconds)
5. **Kathmandu to Pokhara Flight** (Medium - 300 pts)

### 📊 Game Mechanics
- **Discovery System**: Automatically discover cities and mountains by proximity
- **Scoring**: Earn points for discoveries and completing challenges
- **Timed Challenges**: Race against the clock for bonus points
- **Progress Tracking**: Track cities found, mountains discovered, and total distance traveled

### 🎨 UI Components

#### Nepal Game Menu (Left Panel)
- Three tabs: Explore, Cities, Mountains
- Challenge list with completion status
- City and mountain browsers with flyTo functionality
- Bilingual display (English/Nepali)

#### Nepal Game HUD (Right Panel)
- **Score display** with prominent visual
- **Progress stats**: Cities found, mountains discovered, distance traveled
- **Current challenge card** with timer and description
- **Location info**: Current coordinates and altitude

### 🎮 Game Modes
- **Explore Mode**: Free exploration with challenges
- **City Finder**: Browse and locate all cities
- **Mountain Challenge**: Find all 8000m+ peaks

## Technical Implementation

### Data Files
```
/public/data/
├── nepal.geojson          # Nepal country boundary
├── nepal_cities.json      # 12 major cities with details
└── nepal_mountains.json   # 8 peaks over 8000m
```

### Components
```
/src/components/game/NepalGame/
├── nepalConfig.ts         # Game configuration and constants
├── nepalGameStore.ts      # Zustand state management
├── NepalGameHUD.tsx       # Right-side HUD with score/stats
├── NepalGameMenu.tsx      # Left-side menu with challenges
├── NepalMarkers.tsx       # 3D markers for cities/mountains
└── index.ts               # Exports
```

### State Management
Uses Zustand for game state:
- Current mode
- Active challenge
- Score and progress
- Discovery tracking
- Flight statistics

### 3D Markers
- **Billboard effect**: Markers always face the camera
- **Color coding**:
  - Undiscovered: Gray (50% opacity)
  - Cities: Green (Discovered) / Gold (Capital)
  - Mountains: Blue (Discovered) / Red (Everest)
- **Proximity detection**: Automatic discovery within view radius

## User Flow

1. **Landing**: User navigates to `/game`
2. **Auto-focus**: Camera flies to Nepal center (28.39°N, 84.12°E) at 250km altitude
3. **Explore**: User can:
   - Pan and zoom around Nepal
   - Click cities/mountains in menu to fly there
   - Start challenges
   - Discover locations by proximity
4. **Challenge Mode**: Timer starts, user must find target location
5. **Completion**: Points awarded, challenge marked complete

## Styling

### Color Scheme
- **Nepal Red**: `#dc2626` (from flag)
- **Nepal Blue**: `#1e40af`
- **Gold**: `#fbbf24` (for highlights)

### Typography
- **Display**: Syne (English headings)
- **Body**: IBM Plex Sans (English text)
- **Devanagari**: Noto Sans Devanagari (Nepali text)

### UI Design
- **Glass morphism**: Semi-transparent panels with blur
- **Gradients**: Red-themed for Nepal identity
- **Animations**: Pulse effects for active challenges

## Future Enhancements

### Potential Features
- [ ] UNESCO World Heritage Sites
- [ ] Trekking routes (Annapurna Circuit, Everest Base Camp)
- [ ] National parks (Chitwan, Sagarmatha)
- [ ] Rivers (Koshi, Gandaki, Karnali)
- [ ] Cultural landmarks (temples, stupas)
- [ ] Seasonal variations (monsoon, dry season)
- [ ] Multiplayer discovery races
- [ ] Photo mode for screenshots
- [ ] Educational content about geography/culture

### Gameplay Ideas
- **Photography Challenges**: Find and photograph specific landmarks
- **Altitude Challenge**: Climb from Terai (lowland) to Himalayas
- **Regional Exploration**: Discover all locations in a province
- **Speed Run**: Complete all challenges fastest time
- **Explorer Mode**: No timer, collect all discoveries at own pace

## Development Notes

### Camera Configuration
```typescript
NEPAL_CAMERA_CONFIG = {
  defaultAltitude: 250_000, // meters
  minAltitude: 100,
  maxAltitude: 1_000_000,
  defaultPosition: { lat: 28.3949, lng: 84.1240 }
}
```

### Discovery Radius
```typescript
const discoveryRadius = Math.max(10000, altitudeM * 0.2);
// 20% of current altitude or minimum 10km
```

### Coordinate System
- Uses latitude/longitude (WGS84)
- Converts to Three.js 3D coordinates
- Earth radius: 6.371 units in scene

## Resources

- **Geographic Data**: Natural Earth, OpenStreetMap
- **Elevation Data**: SRTM, ASTER GDEM
- **Cultural Information**: Nepal Tourism Board, UNESCO
- **Fonts**: Google Fonts (Noto Sans Devanagari)

## Credits

Built with:
- React 19
- Next.js 15
- Three.js / React Three Fiber
- Zustand (State Management)
- Tailwind CSS
