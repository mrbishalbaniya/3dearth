# ORBIT — Professional 3D Earth

Cinematic interactive Earth for Next.js (App Router) + React Three Fiber.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## GIS layers

Toggleable modular layers under `src/components/earth/gis/`:

| Layer | Data source |
|-------|-------------|
| Satellite | ESRI World Imagery + Carto streets |
| Terrain / Elevation | AWS Mapzen Terrarium DEM |
| Water | Natural Earth lakes/rivers + OSM Overpass |
| Land cover / Forest | OSM landuse / natural polygons |
| Roads | OSM highways, rail, runways |
| Buildings | OSM building footprints + heights |
| Borders | Natural Earth countries + admin-1 |
| Labels / POIs / Natural | Curated + OSM + Natural Earth points |

Use the **GIS Layers** panel in the left HUD. Zoom in (L4+) for vector detail; Overpass loads lazily around the camera focus.

Scroll or pinch from **Deep Space (L0)** down to **Street (L7)**.

| Level | Name | What loads |
|------:|------|------------|
| 0 | Deep Space | Globe · stars · atmosphere |
| 1 | Planet | Borders · continent labels |
| 2 | Continent | Satellite tiles · country labels |
| 3–4 | Country / Province | Higher tile Z · terrain · cities |
| 5–7 | City → Street | Street tiles · OSM buildings · street labels |

HUD shows **zoom level**, **altitude**, **lat/lng**, **heading**, **pitch**, and tile streaming status.

Double-click flies in. Use **Street** chip for a NYC street-level demo.

## Upgrade to 8K textures

Place maps in `public/textures/earth/`:

- `earth_day.jpg` (8K day / albedo)
- `earth_night.jpg` (city lights)
- `earth_normal.jpg` (normal)
- `earth_specular.jpg` (ocean specular)
- `earth_roughness.jpg` (roughness)
- `earth_clouds.jpg` (clouds alpha)

Recommended sources: [NASA Blue Marble](https://visibleearth.nasa.gov/), [Solar System Scope](https://www.solarsystemscope.com/textures/).

The loader prefers local files and falls back to CDN 2K maps.

## Architecture

```
src/components/earth/
  EarthCanvas.tsx      # Canvas + a11y + HUD shell
  EarthScene.tsx       # Scene graph composition
  Earth.tsx            # PBR/custom shader globe
  Atmosphere.tsx       # Fresnel atmosphere + halo
  Clouds.tsx           # Independent cloud shell
  Stars.tsx            # Starfield + nebula + milky way
  Lighting.tsx         # Sun + hemisphere
  CameraController.tsx # Damped orbit + fly-to
  CountryBorders.tsx   # GeoJSON line borders
  Markers.tsx          # Pulsing interactive markers
  shaders/             # GLSL
  hooks/ store/ utils/ types/ ui/
```
