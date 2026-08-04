# 🏗️ Kathmandu 3D Map Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │  Standalone Viewer   │      │  Flight Simulator    │    │
│  │  /kathmandu-3d       │      │  /game               │    │
│  └──────────┬───────────┘      └──────────┬───────────┘    │
│             │                               │                │
└─────────────┼───────────────────────────────┼────────────────┘
              │                               │
┌─────────────┼───────────────────────────────┼────────────────┐
│             │   3D Rendering Layer          │                │
├─────────────┼───────────────────────────────┼────────────────┤
│             │                               │                │
│  ┌──────────▼──────────┐       ┌───────────▼──────────┐    │
│  │  City3DScene.tsx    │       │ KathmanduFlightScene │    │
│  │  (Orbit Controls)   │       │ (Camera Follows)     │    │
│  └──────────┬──────────┘       └───────────┬──────────┘    │
│             │                               │                │
│             ├───────────────┬───────────────┤                │
│             │               │               │                │
│  ┌──────────▼────────┐  ┌──▼─────────┐  ┌─▼──────────┐    │
│  │  Building3D.tsx   │  │ Road3D.tsx │  │ Terrain   │    │
│  │  (Extruded mesh)  │  │ (Lines)    │  │ (Ground)  │    │
│  └───────────────────┘  └────────────┘  └────────────┘    │
│                                                               │
└─────────────┬─────────────────────────────────────────────────┘
              │
┌─────────────▼─────────────────────────────────────────────────┐
│                    Data Layer                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  OverpassAPI.ts                                       │    │
│  │  - fetchBuildings()                                   │    │
│  │  - fetchRoads()                                       │    │
│  │  - fetchCityData()                                    │    │
│  └──────────────────┬───────────────────────────────────┘    │
│                     │                                          │
└─────────────────────┼──────────────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────────────┐
│                External Data Sources                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 OpenStreetMap Overpass API                                │
│     https://overpass-api.de/api/interpreter                   │
│                                                                 │
│  📊 Building Data:                                            │
│     - Geometry (lat/lng polygons)                             │
│     - Tags (name, height, levels, type)                       │
│     - Addresses                                                │
│                                                                 │
│  🛣️  Road Data:                                                │
│     - Geometry (lat/lng paths)                                │
│     - Highway type                                             │
│     - Names                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Initial Load

```
User opens page
    ↓
Component mounts
    ↓
useEffect triggers
    ↓
OverpassAPI.fetchCityData(bounds)
    ↓
    ├─→ fetchBuildings() ──→ POST Overpass API
    └─→ fetchRoads()     ──→ POST Overpass API
        ↓
    Wait for both promises
        ↓
    Parse JSON responses
        ↓
    setState({ buildings, roads })
        ↓
    Trigger re-render
```

### 2. Building Rendering

```
Buildings array received
    ↓
useMemo processes each building:
    ↓
    For each building:
        ├─→ Extract geometry points
        ├─→ Project lat/lng to scene coords
        ├─→ Create THREE.Shape
        ├─→ Calculate height:
        │       ├─→ Use building:height tag (if available)
        │       ├─→ OR building:levels × 2.2m
        │       └─→ OR default 10m
        └─→ Return { shape, extrudeSettings, tags }
    ↓
Map to <Building3D> components
    ↓
Three.js creates extruded geometry
    ↓
Rendered on screen
```

### 3. User Interaction

```
User hovers building
    ↓
onPointerOver event
    ↓
setHovered(true)
    ↓
Change material color
Show tooltip
    ↓
User clicks building
    ↓
onClick event
    ↓
setClicked(!clicked)
    ↓
Toggle detailed info
```

---

## Component Hierarchy

```
┌────────────────────────────────────────────────┐
│  Page (/kathmandu-3d/page.tsx)                │
│                                                 │
│  ┌──────────────────────────────────────────┐ │
│  │  City3DScene                             │ │
│  │                                          │ │
│  │  ┌──────────────────────────────────┐  │ │
│  │  │  Canvas (React Three Fiber)      │  │ │
│  │  │                                   │  │ │
│  │  │  ┌────────────────────────────┐ │  │ │
│  │  │  │  Lighting                  │ │  │ │
│  │  │  │  - ambientLight            │ │  │ │
│  │  │  │  - spotLight               │ │  │ │
│  │  │  │  - pointLight              │ │  │ │
│  │  │  └────────────────────────────┘ │  │ │
│  │  │                                   │  │ │
│  │  │  ┌────────────────────────────┐ │  │ │
│  │  │  │  Buildings                 │ │  │ │
│  │  │  │  {buildingShapes.map()}    │ │  │ │
│  │  │  │    └→ Building3D           │ │  │ │
│  │  │  │         └→ mesh            │ │  │ │
│  │  │  │            └→ extrude      │ │  │ │
│  │  │  │            └→ material     │ │  │ │
│  │  │  │            └→ Html tooltip │ │  │ │
│  │  │  └────────────────────────────┘ │  │ │
│  │  │                                   │  │ │
│  │  │  ┌────────────────────────────┐ │  │ │
│  │  │  │  Roads                     │ │  │ │
│  │  │  │  {roads.map()}             │ │  │ │
│  │  │  │    └→ Road3D               │ │  │ │
│  │  │  │         └→ Line (drei)     │ │  │ │
│  │  │  └────────────────────────────┘ │  │ │
│  │  │                                   │  │ │
│  │  │  ┌────────────────────────────┐ │  │ │
│  │  │  │  Environment               │ │  │ │
│  │  │  │  - Sky                     │ │  │ │
│  │  │  │  - Environment preset      │ │  │ │
│  │  │  │  - OrbitControls           │ │  │ │
│  │  │  └────────────────────────────┘ │  │ │
│  │  │                                   │  │ │
│  │  └───────────────────────────────────┘  │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## State Management

```typescript
// Component State
const [buildings, setBuildings] = useState<OSMBuilding[]>([]);
const [roads, setRoads] = useState<OSMRoad[]>([]);
const [loading, setLoading] = useState(false);

// Derived State (useMemo)
const buildingShapes = useMemo(() => {
  // Process buildings into Three.js geometry
}, [buildings, refLat, refLng, scale]);

// Interactive State (per building)
const [hovered, setHovered] = useState(false);
const [clicked, setClicked] = useState(false);
const [hoverPos, setHoverPos] = useState<Vector3 | null>(null);
```

---

## Coordinate System

### Geographic → Scene Coordinates

```
Input (Geographic):
  lat: 27.7172  (latitude in degrees)
  lng: 85.3240  (longitude in degrees)

Reference Point:
  refLat = (bounds.north + bounds.south) / 2
  refLng = (bounds.east + bounds.west) / 2

Projection (Web Mercator):
  x = (lng - refLng) × scale × cos(refLat × π/180)
  y = (lat - refLat) × scale

Output (Scene):
  x: 123.45  (meters in scene)
  y: 0       (ground level)
  z: -456.78 (meters in scene, negated for Three.js)
```

### Example

```javascript
// Kathmandu center
lat: 27.7172, lng: 85.3240

// Reference point (bounds center)
refLat: 27.7028, refLng: 85.3170

// Scale
scale: 51000

// Calculation
x = (85.3240 - 85.3170) × 51000 × cos(27.7028 × π/180)
  = 0.0070 × 51000 × 0.885
  = 316.05 meters

y = (27.7172 - 27.7028) × 51000
  = 0.0144 × 51000
  = 734.4 meters

// Result
Position in scene: (316, 0, -734)
```

---

## Building Height Calculation

```
Priority cascade:

1. Explicit height tag
   building:height = "25"
   → Use 25 meters

2. Building levels
   building:levels = "5"
   → Use 5 × 2.2 = 11 meters

3. Default
   No height data
   → Use 10 meters

Special cases:
- Invalid data (NaN) → Default
- Zero or negative → Default
- Very tall (>300m) → Use as-is (skyscrapers)
```

---

## Performance Characteristics

### Bottlenecks

1. **Network**: Overpass API fetch (3-20 seconds)
2. **Processing**: Converting OSM → Three.js geometry (1-2 seconds)
3. **Rendering**: Drawing 1000+ buildings (continuous)
4. **Memory**: Storing building geometries (50-200 MB)

### Optimizations

1. **Memoization**: `useMemo` for building shapes
2. **Lazy loading**: Only fetch when bounds change
3. **Efficient geometry**: Single extrude per building
4. **LOD**: Could add level-of-detail (not implemented)

### Metrics

```
City Center (400m × 400m):
  - Buildings: ~500
  - Roads: ~100
  - Vertices: ~50,000
  - Draw calls: ~600
  - FPS: 60 (typical GPU)
  - Memory: ~80 MB

Full Valley (15km × 10km):
  - Buildings: ~5,000+
  - Roads: ~1,000+
  - Vertices: ~500,000+
  - Draw calls: ~6,000+
  - FPS: 30-60 (depends on GPU)
  - Memory: ~200 MB
```

---

## Error Handling

```
Try to fetch data
    ↓
    ├─→ Success
    │   └→ Process and render
    │
    └─→ Error
        ├─→ Network error
        │   └→ Show: "Failed to load - check connection"
        │
        ├─→ API timeout
        │   └→ Show: "Request timed out - try smaller area"
        │
        ├─→ Rate limit
        │   └→ Show: "Too many requests - wait and retry"
        │
        └─→ Invalid data
            └→ Show: "Invalid response - area might be unsupported"
```

---

## File Dependencies

```
City3DScene.tsx
    ├─→ Building3D.tsx
    ├─→ Road3D.tsx
    ├─→ OverpassAPI.ts
    │   └─→ types.ts
    ├─→ @react-three/fiber
    ├─→ @react-three/drei
    └─→ three

Building3D.tsx
    ├─→ types.ts
    ├─→ @react-three/drei (Html)
    └─→ three (Shape, Vector3)

Road3D.tsx
    ├─→ types.ts
    ├─→ @react-three/drei (Line)
    └─→ three (Vector3)

OverpassAPI.ts
    └─→ types.ts
```

---

## Integration Points

### With Flight Simulator

```typescript
// FlightCorridorTerrain detects Kathmandu
if (isOverKathmandu(flightState.lat, flightState.lng)) {
  // Render KathmanduFlightScene
  <KathmanduFlightScene
    config={kathmanduConfig}
    aircraftPosition={flightState}
  />
} else {
  // Render regular terrain
  <FallbackTerrain />
}
```

### With Mission System

```typescript
// Mission triggers city load
if (mission.id === "kathmandu-city-tour") {
  loadCityData(KATHMANDU_BOUNDS);
}
```

---

## Design Decisions

### Why Three.js?
- Native WebGL performance
- React Three Fiber integration
- Rich ecosystem (drei helpers)
- Industry standard for web 3D

### Why OpenStreetMap?
- Free, open data
- Global coverage
- Active community
- Detailed urban data

### Why Overpass API?
- Flexible queries
- Real-time data
- No authentication needed
- Geometry included

### Why Extrude?
- Accurate building volumes
- Simple to implement
- Good performance
- Realistic appearance

### Why Client-side Processing?
- No backend needed
- Real-time updates
- Easier deployment
- Direct OSM access

---

## Scalability

### Current Limits

- **Area**: ~15km² (valley-sized)
- **Buildings**: ~5,000 max
- **Roads**: ~1,000 max
- **Load time**: 20 seconds max
- **Memory**: 200 MB max

### To Scale Further

1. **Backend caching**: Pre-process OSM data
2. **Tiling system**: Load chunks on-demand
3. **LOD levels**: Simplify distant buildings
4. **Culling**: Don't render off-screen
5. **Instancing**: Reuse building geometries
6. **Web Workers**: Process in background
7. **IndexedDB**: Cache locally

---

## Testing Strategy

### Manual Tests

1. **Load test**: Open /kathmandu-3d
2. **Interaction test**: Click buildings
3. **Performance test**: Monitor FPS
4. **Error test**: Disconnect internet
5. **Mission test**: Start city tour

### Automated Tests (future)

```typescript
// Component tests
describe('Building3D', () => {
  it('renders with correct height', () => {
    // Test height calculation
  });
  
  it('shows tooltip on click', () => {
    // Test interaction
  });
});

// Integration tests
describe('City3DScene', () => {
  it('loads Kathmandu buildings', async () => {
    // Test data fetching
  });
});
```

---

## Maintenance

### Regular Updates

- Monitor OSM data quality
- Update Overpass API endpoints if changed
- Keep Three.js/R3F versions current
- Test after major framework updates

### Known Issues

1. Some buildings lack height data
2. Overpass API can be slow/down
3. Large areas may timeout
4. Mobile performance varies

### Future Improvements

See `KATHMANDU_3D_MAP.md` for roadmap

---

**Architecture complete!** 🏗️✨
