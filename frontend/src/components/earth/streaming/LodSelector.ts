/**
 * Hierarchical LOD tile selection — parent fill + detail tiles.
 * Mimics Google Earth / Cesium screen-space coverage without a full quadtree mesh.
 *
 * Keep total imagery keys modest (~60–100). The scheduler queue is capped;
 * selecting hundreds of tiles caused overflow drops → often only the center tile painted.
 */
import { altitudeToTileZoom } from "../utils/zoomLevels";
import type { ZoomLevelId } from "../types";
import {
  lngLatToTile,
  tileKey,
  type TileKey,
} from "../utils/tiles";

export interface LodTile extends TileKey {
  /** 0–1 visual weight (parents fade under children). */
  opacity: number;
  /** Higher = load first. */
  priority: number;
  /** Role in the pyramid. */
  role: "detail" | "parent" | "grandparent" | "prefetch";
}

export interface LodSelection {
  imagery: LodTile[];
  dem: LodTile[];
  targetZ: number;
}

function collectRing(
  lat: number,
  lng: number,
  z: number,
  radius: number,
  role: LodTile["role"],
  basePriority: number,
  opacity: number,
): LodTile[] {
  const center = lngLatToTile(lng, lat, z);
  const n = 2 ** z;
  const out: LodTile[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = (((center.x + dx) % n) + n) % n;
      const y = center.y + dy;
      if (y < 0 || y >= n) continue;
      const dist = Math.hypot(dx, dy);
      out.push({
        key: tileKey(z, x, y),
        z,
        x,
        y,
        role,
        opacity: Math.max(0.2, opacity * (1 - dist * 0.08)),
        priority: basePriority - dist * 8,
      });
    }
  }
  return out;
}

function dedupePreferDetail(tiles: LodTile[]): LodTile[] {
  const map = new Map<string, LodTile>();
  for (const t of tiles) {
    const prev = map.get(t.key);
    if (!prev || t.priority > prev.priority) map.set(t.key, t);
  }
  return [...map.values()].sort((a, b) => b.priority - a.priority);
}

/** Hard cap — prevents scheduler overflow / React mesh stampede / OOM. */
const MAX_IMAGERY = 28;

/** Z18 neighborhood tiles × dozens of meshes = Chrome GPU STATUS_BREAKPOINT. */
function maxTileZ(qualityId: "ultra" | "high" | "medium" | "low"): number {
  if (qualityId === "low") return 12;
  if (qualityId === "medium") return 13;
  if (qualityId === "high") return 14;
  return 14;
}

/**
 * Select imagery + DEM tiles for current altitude / quality.
 * Parent LODs fill gaps while detail streams in.
 */
export function selectLodTiles(options: {
  lat: number;
  lng: number;
  altitudeM: number;
  qualityId: "ultra" | "high" | "medium" | "low";
  zoomLevel: ZoomLevelId;
}): LodSelection {
  const { lat, lng, altitudeM, qualityId } = options;
  const targetZ = Math.min(
    maxTileZ(qualityId),
    Math.max(
      altitudeM < 2_500_000 ? 4 : 2,
      Math.round(altitudeToTileZoom(altitudeM)),
    ),
  );

  // Screen-space rings: wide enough for FOV, small enough to finish loading while moving
  let detailR: number;
  let parentR: number;
  let grandR: number;

  if (altitudeM >= 850_000) {
    detailR = 1;
    parentR = 2;
    grandR = 1;
  } else if (altitudeM >= 80_000) {
    detailR = 1;
    parentR = 2;
    grandR = 1;
  } else if (altitudeM >= 5_000) {
    detailR = 1;
    parentR = 1;
    grandR = 1;
  } else {
    detailR = 1;
    parentR = 1;
    grandR = 1;
  }

  const grandZ = Math.max(2, targetZ - 2);
  const parentZ = Math.max(2, targetZ - 1);

  const underlay: LodTile[] = [];
  // Coarse underlay first (low-res placeholders while detail loads)
  if (targetZ >= 3) {
    underlay.push(
      ...collectRing(lat, lng, grandZ, grandR, "grandparent", 50, 0.65),
    );
  }
  if (targetZ >= 2) {
    underlay.push(
      ...collectRing(lat, lng, parentZ, parentR, "parent", 100, 0.8),
    );
  }
  const detail: LodTile[] = [
    ...collectRing(lat, lng, targetZ, detailR, "detail", 160, 1),
    ...collectRing(lat, lng, targetZ, detailR + 1, "prefetch", 130, 0.85),
  ];

  // Cap must NOT drop parents — otherwise zoom/pan shows black until detail arrives
  let underlayOut = dedupePreferDetail(underlay);
  // Prefer parents over grandparents if underlay alone is too large
  const underlayBudget = Math.max(32, Math.floor(MAX_IMAGERY * 0.55));
  if (underlayOut.length > underlayBudget) {
    underlayOut = underlayOut
      .sort((a, b) => {
        const roleW = (r: LodTile["role"]) =>
          r === "parent" ? 2 : r === "grandparent" ? 1 : 0;
        return roleW(b.role) - roleW(a.role) || b.priority - a.priority;
      })
      .slice(0, underlayBudget);
  }
  const detailOut = dedupePreferDetail(detail);
  const room = Math.max(24, MAX_IMAGERY - underlayOut.length);
  const imageryOut = [...underlayOut, ...detailOut.slice(0, room)].sort(
    (a, b) => b.priority - a.priority,
  );

  const demZ = Math.min(14, Math.max(5, targetZ - (targetZ >= 15 ? 2 : 1)));
  const dem: LodTile[] = [
    ...collectRing(lat, lng, Math.max(5, demZ - 1), 1, "parent", 70, 0.55),
    ...collectRing(
      lat,
      lng,
      demZ,
      qualityId === "low" ? 1 : 2,
      "detail",
      110,
      1,
    ),
  ];

  return {
    imagery: imageryOut,
    dem: dedupePreferDetail(dem),
    targetZ,
  };
}

/**
 * Wide DEM pyramid for Dry Earth — must cover ocean basins so depth below MSL shows.
 * Planet orbit (~5–12 Mm) still needs real SRTM or mountains read as flat tabletops.
 * Close zoom must stay tiny — z12×wide rings caused WebGL context loss (blank city view).
 */
const MAX_DRY_DEM_TILES = 36;

export function selectDryEarthDemTiles(options: {
  lat: number;
  lng: number;
  altitudeM: number;
  qualityId: "ultra" | "high" | "medium" | "low";
}): LodTile[] {
  const { lat, lng, altitudeM, qualityId } = options;
  const planetOrbit = altitudeM > 4_500_000;
  const continentOrbit = altitudeM > 1_500_000;
  const regional = altitudeM > 200_000;
  const closeUp = altitudeM < 80_000;
  const cityZoom = altitudeM < 20_000;

  // Cap Z hard — high-Z DEM meshes at city altitude kill the GPU
  const maxZ =
    qualityId === "low" ? 7 : qualityId === "medium" ? 8 : qualityId === "high" ? 9 : 9;

  const targetZ = planetOrbit
    ? 4
    : Math.min(
        maxZ,
        Math.max(
          continentOrbit ? 5 : regional ? 5 : 4,
          Math.min(maxZ, Math.round(altitudeToTileZoom(altitudeM))),
        ),
      );

  const detailR = planetOrbit
    ? qualityId === "low"
      ? 5
      : 6
    : cityZoom
      ? 1
      : closeUp
        ? 2
        : continentOrbit
          ? qualityId === "low"
            ? 4
            : 5
          : qualityId === "low"
            ? 2
            : 3;

  const tiles: LodTile[] = [];

  if (!cityZoom && targetZ >= 3) {
    tiles.push(
      ...collectRing(
        lat,
        lng,
        Math.max(2, targetZ - (planetOrbit ? 2 : 3)),
        planetOrbit ? 5 : continentOrbit ? 4 : 2,
        "grandparent",
        40,
        0.7,
      ),
    );
  }
  if (!cityZoom || targetZ <= 7) {
    tiles.push(
      ...collectRing(
        lat,
        lng,
        Math.max(3, targetZ - 1),
        Math.max(detailR, cityZoom ? 1 : closeUp ? 2 : continentOrbit ? 4 : 2),
        "parent",
        90,
        0.85,
      ),
    );
  }
  tiles.push(
    ...collectRing(lat, lng, targetZ, detailR, "detail", 140, 1),
  );

  return dedupePreferDetail(tiles).slice(0, MAX_DRY_DEM_TILES);
}

/** Prefetch-only keys for background warming of the next zoom. */
export function selectPrefetchTiles(
  lat: number,
  lng: number,
  altitudeM: number,
): TileKey[] {
  const z = Math.min(
    18,
    Math.max(1, Math.round(altitudeToTileZoom(altitudeM)) + 1),
  );
  return collectRing(lat, lng, z, 1, "prefetch", 10, 0).map(
    ({ key, z: zz, x, y }) => ({ key, z: zz, x, y }),
  );
}
