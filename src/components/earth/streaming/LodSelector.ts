/**
 * Hierarchical LOD tile selection — parent fill + detail tiles.
 * Mimics Google Earth / Cesium screen-space coverage without a full quadtree mesh.
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
        opacity: opacity * (1 - dist * 0.08),
        priority: basePriority - dist * 10,
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

/**
 * Select imagery + DEM tiles for current altitude / quality.
 * Includes parent LODs so zoom never shows empty earth while detail streams in.
 */
export function selectLodTiles(options: {
  lat: number;
  lng: number;
  altitudeM: number;
  qualityId: "ultra" | "high" | "medium" | "low";
  zoomLevel: ZoomLevelId;
}): LodSelection {
  const { lat, lng, altitudeM, qualityId, zoomLevel } = options;
  const targetZ = Math.min(
    17,
    Math.max(1, Math.round(altitudeToTileZoom(altitudeM))),
  );

  const detailRadius =
    qualityId === "ultra"
      ? targetZ >= 15
        ? 2
        : 3
      : qualityId === "high"
        ? targetZ >= 15
          ? 1
          : 2
        : qualityId === "medium"
          ? targetZ >= 14
            ? 1
            : 2
          : 1;
  const parentRadius = Math.max(1, detailRadius - 1);

  const imagery: LodTile[] = [];

  // Detail rings — load sharper tiles first
  imagery.push(
    ...collectRing(lat, lng, targetZ, detailRadius, "detail", 120, 1),
  );
  // Parent underlay
  if (targetZ >= 2) {
    imagery.push(
      ...collectRing(lat, lng, targetZ - 1, parentRadius, "parent", 70, 0.7),
    );
  }
  // Grandparent fill
  if (targetZ >= 4) {
    imagery.push(
      ...collectRing(
        lat,
        lng,
        targetZ - 2,
        Math.max(1, parentRadius - 1),
        "grandparent",
        35,
        0.45,
      ),
    );
  }
  // Prefetch next zoom toward surface
  if (targetZ < 17 && altitudeM < 2_000_000) {
    imagery.push(
      ...collectRing(lat, lng, targetZ + 1, 1, "prefetch", 30, 0),
    );
  }

  // DEM uses coarser Z (Terrarium sweet spot 5–13)
  const demZ = Math.min(13, Math.max(5, targetZ - 1));
  const dem: LodTile[] = [
    ...collectRing(lat, lng, Math.max(5, demZ - 1), 1, "parent", 60, 0.5),
    ...collectRing(
      lat,
      lng,
      demZ,
      qualityId === "low" ? 1 : 2,
      "detail",
      100,
      1,
    ),
  ];

  return {
    imagery: dedupePreferDetail(imagery.filter((t) => t.role !== "prefetch" || t.opacity > 0)),
    dem: dedupePreferDetail(dem),
    targetZ,
  };
}

/** Prefetch-only keys (opacity 0) for background warming. */
export function selectPrefetchTiles(
  lat: number,
  lng: number,
  altitudeM: number,
): TileKey[] {
  const z = Math.min(17, Math.max(1, Math.round(altitudeToTileZoom(altitudeM)) + 1));
  return collectRing(lat, lng, z, 1, "prefetch", 10, 0).map(
    ({ key, z: zz, x, y }) => ({ key, z: zz, x, y }),
  );
}
