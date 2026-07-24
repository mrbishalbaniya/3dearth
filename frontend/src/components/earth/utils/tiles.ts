/** Web Mercator XYZ tile utilities + streaming cache. */

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export interface TileKey {
  key: string;
  z: number;
  x: number;
  y: number;
}

/** ESRI World Imagery — high-res satellite, CORS-friendly. */
export const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/** Carto Voyager — roads / labels friendly vector-style raster. */
export const STREET_TILE_URL =
  "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png";

export function tileKey(z: number, x: number, y: number): string {
  return `${z}/${x}/${y}`;
}

export function lngLatToTile(lng: number, lat: number, z: number): TileCoord {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return {
    z,
    x: ((x % n) + n) % n,
    y: Math.min(n - 1, Math.max(0, y)),
  };
}

export function tileToLngLatBounds(z: number, x: number, y: number) {
  const n = 2 ** z;
  const lngMin = (x / n) * 360 - 180;
  const lngMax = ((x + 1) / n) * 360 - 180;
  const latMax =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const latMin =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
  return { lngMin, lngMax, latMin, latMax };
}

export function tileCenter(z: number, x: number, y: number) {
  const b = tileToLngLatBounds(z, x, y);
  return {
    lat: (b.latMin + b.latMax) / 2,
    lng: (b.lngMin + b.lngMax) / 2,
  };
}

/** Collect tile keys covering a viewport around lat/lng. */
export function tilesAround(
  lat: number,
  lng: number,
  z: number,
  radius: number,
): TileKey[] {
  const center = lngLatToTile(lng, lat, z);
  const n = 2 ** z;
  const out: TileKey[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = ((center.x + dx) % n + n) % n;
      const y = center.y + dy;
      if (y < 0 || y >= n) continue;
      out.push({ key: tileKey(z, x, y), z, x, y });
    }
  }
  return out;
}

export function buildTileUrl(template: string, z: number, x: number, y: number) {
  return template
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

/** Approx ground resolution (m/px) at equator for given Z. */
export function metersPerPixel(z: number, lat = 0): number {
  return (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * 6371000) / (256 * 2 ** z);
}
