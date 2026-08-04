# 3D City Map System

Real-world 3D city maps rendered from OpenStreetMap data, based on [map3d](https://github.com/cartesiancs/map3d) by cartesiancs (MIT License).

## Features

- **🏗️ 3D Buildings**: Extruded buildings with accurate heights from OSM data
- **🛣️ Road Network**: Rendered road systems with proper highway classifications
- **🏷️ Interactive Info**: Click buildings to see names, addresses, and metadata
- **🗺️ OpenStreetMap**: Free, community-driven geographic data
- **✈️ Flight Integration**: Fly over detailed city landscapes

## Components

### Core Components

- **`City3DScene.tsx`**: Standalone 3D city viewer with orbit controls
- **`KathmanduFlightScene.tsx`**: Integrated with flight simulator
- **`Building3D.tsx`**: Individual 3D building with interactive tooltips
- **`Road3D.tsx`**: 3D road rendering with width based on highway type

### Data & API

- **`OverpassAPI.ts`**: Fetches building and road data from OpenStreetMap
- **`types.ts`**: TypeScript definitions for OSM data structures

## Usage

### Standalone 3D Map Viewer

```typescript
import { City3DScene, KATHMANDU_BOUNDS } from "@/components/earth/city3d";

const config = {
  bounds: KATHMANDU_BOUNDS,
  defaultHeight: 10,
  levelHeight: 2.2,
  scale: 51000,
};

<City3DScene
  config={config}
  onLoadComplete={(stats) => console.log(`Loaded ${stats.buildings} buildings`)}
/>
```

### Flight Simulator Integration

```typescript
import { KathmanduFlightScene } from "@/components/earth/city3d";

<Canvas>
  <KathmanduFlightScene
    config={config}
    aircraftPosition={{ lat: 27.7172, lng: 85.3240, alt: 1500 }}
  />
</Canvas>
```

### Custom City Bounds

```typescript
const CUSTOM_CITY_BOUNDS = {
  north: 40.758,  // Northern latitude
  south: 40.748,  // Southern latitude
  east: -73.968,  // Eastern longitude
  west: -73.988,  // Western longitude
};

<City3DScene config={{ bounds: CUSTOM_CITY_BOUNDS }} />
```

## Predefined Locations

### Kathmandu, Nepal

```typescript
import { KATHMANDU_BOUNDS, KATHMANDU_VALLEY_BOUNDS } from "./OverpassAPI";

// City center (smaller, faster)
KATHMANDU_BOUNDS

// Full valley (larger area, more buildings)
KATHMANDU_VALLEY_BOUNDS
```

## Building Heights

Buildings use the following priority for height:

1. `building:height` tag (if available in meters)
2. `building:levels` tag × 2.2 meters per level
3. Default height (10 meters)

## Controls

### Standalone Viewer
- **🖱️ Left-click + drag**: Rotate camera
- **🔍 Scroll wheel**: Zoom in/out
- **👆 Right-click + drag**: Pan camera
- **🏢 Click buildings**: Show info tooltip

### Flight Mode
- Camera automatically follows aircraft
- Buildings provide visual landmarks for navigation
- Hover over buildings shows detailed information

## OpenStreetMap Data

### Available Building Tags

```typescript
interface OSMTags {
  name?: string;                // Building name
  building?: string;            // Building type (yes, residential, commercial, etc.)
  height?: string;              // Height in meters
  "building:levels"?: string;   // Number of floors
  amenity?: string;             // Facility type (restaurant, hospital, etc.)
  "addr:street"?: string;       // Street address
  "addr:city"?: string;         // City
  // ... and many more
}
```

### Common Building Types
- `residential`: Houses, apartments
- `commercial`: Shops, offices
- `industrial`: Factories, warehouses
- `religious`: Temples, churches, mosques
- `public`: Government buildings, schools

## Performance

### Optimization Tips

1. **Start with smaller bounds** - Test with city center before loading entire valleys
2. **Cache loaded data** - Buildings don't change frequently
3. **Use appropriate scale** - Default scale of 51000 works well for most cities
4. **Limit visible range** - Set camera far clipping plane appropriately

### Overpass API Limits

- Timeout: 25 seconds per request
- Rate limiting: ~2 requests per second
- Large areas may fail or timeout
- Consider using local Overpass instance for production

## Missions

### Kathmandu City Tour

New mission added: **🏙️ Kathmandu City Tour**

Fly over:
- Thamel tourist district
- Pashupatinath Temple
- Durbar Square (UNESCO World Heritage)
- Swayambhunath stupa (Monkey Temple)

Access from: **http://localhost:3000/game** → "🎯 Missions"

### Standalone Viewer

Visit: **http://localhost:3000/kathmandu-3d**

## Architecture

```
city3d/
├── types.ts              # TypeScript definitions
├── OverpassAPI.ts        # OpenStreetMap data fetcher
├── Building3D.tsx        # 3D building component
├── Road3D.tsx            # 3D road component
├── City3DScene.tsx       # Standalone viewer
├── KathmanduFlightScene.tsx  # Flight integration
└── index.ts              # Public exports
```

## Data Sources

- **Buildings & Roads**: [OpenStreetMap](https://www.openstreetmap.org/) via [Overpass API](https://overpass-api.de/)
- **Height Data**: OSM tags (`building:height`, `building:levels`)
- **Addresses**: OSM address tags (`addr:*`)

## Credits

Based on **[map3d](https://github.com/cartesiancs/map3d)** by [Hyeong Jun Huh](https://github.com/cartesiancs)
- License: MIT
- Original project: Generate 3D city maps with React-Three-Fiber
- Data: © OpenStreetMap contributors

## Future Enhancements

- [ ] Building textures from satellite imagery
- [ ] Height customization UI
- [ ] Material variations (glass, concrete, etc.)
- [ ] Terrain heightmap integration
- [ ] GLB export for buildings
- [ ] Time-of-day lighting
- [ ] Weather effects (rain, fog, snow)
- [ ] More cities (Pokhara, Lukla, etc.)

## Troubleshooting

### Buildings not loading
- Check browser console for API errors
- Verify internet connection
- Try smaller bounds (city center)
- Overpass API may be rate-limiting

### Performance issues
- Reduce bounds size
- Lower `scale` value
- Disable building tooltips
- Use production build (`npm run build`)

### Missing building heights
- Many OSM buildings lack height data
- Falls back to default height (10m)
- Consider contributing to OSM with surveyed heights

## Contributing

To add more cities:

1. Find city bounds on [OpenStreetMap](https://www.openstreetmap.org/)
2. Add bounds to `OverpassAPI.ts`:
```typescript
export const YOUR_CITY_BOUNDS: GeoBounds = {
  north: ...,
  south: ...,
  east: ...,
  west: ...,
};
```
3. Create mission in `NepalFlightSim.tsx` or similar

## License

MIT License - Free to use and modify

Based on map3d (MIT) - https://github.com/cartesiancs/map3d
Data © OpenStreetMap contributors - https://www.openstreetmap.org/copyright
