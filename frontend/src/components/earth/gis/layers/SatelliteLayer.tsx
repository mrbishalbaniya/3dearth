"use client";

/**
 * Progressive multi-LOD satellite / street imagery streaming.
 * Parent tiles stay under detail. depthTest off so tiles never lose to the globe.
 *
 * Critical fixes vs black-gap bug:
 * - Do not re-fetch when only priority changes (was aborting in-flight loads)
 * - Keep geometry visible while texture loads (parent LOD / placeholder)
 * - frustumCulled off for spherical patches (AABB false-culls neighbors)
 * - Wide FOV rings + parent pyramid so coverage never collapses to 1 tile
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  MeshBasicMaterial,
  Texture,
} from "three";
import { useEarthStore } from "../../store/earthStore";
import { latLngToVector3 } from "../../utils/geo";
import { altitudeToTileZoom, EARTH_RADIUS_M } from "../../utils/zoomLevels";
import { peekElevation } from "../../streaming";
import {
  buildTileUrl,
  getCachedTexture,
  hasCachedTexture,
  loadTileImage,
  acquireTexture,
  releaseTexture,
  getTileCacheStats,
  trimTileCache,
  SATELLITE_TILE_URL,
  STREET_TILE_URL,
  tileToLngLatBounds,
  type TileKey,
} from "../TileLoader";
import {
  imageryScheduler,
  selectLodTiles,
  selectPrefetchTiles,
  CorridorStreamer,
  CORRIDOR_JOB_PREFIX,
} from "../../streaming";
import { lngLatToTile } from "../../utils/tiles";
import { StreamPerf } from "../../performance/StreamPerf";

/** Imagery shell sits just above local terrain MSL (not bare ellipsoid). */
function shellRadiusForAltitude(
  altitudeM: number,
  surfaceElevM: number,
): number {
  const liftM =
    altitudeM > 200_000
      ? 200
      : altitudeM > 40_000
        ? 120
        : altitudeM > 5_000
          ? 90
          : 60;
  const surface = Number.isFinite(surfaceElevM) ? Math.max(0, surfaceElevM) : 0;
  return 1 + (surface + liftM) / EARTH_RADIUS_M;
}

function quantizeAltitude(altitudeM: number): number {
  if (altitudeM > 1_000_000) return Math.round(altitudeM / 100_000) * 100_000;
  if (altitudeM > 200_000) return Math.round(altitudeM / 40_000) * 40_000;
  if (altitudeM > 50_000) return Math.round(altitudeM / 10_000) * 10_000;
  if (altitudeM > 10_000) return Math.round(altitudeM / 2_500) * 2_500;
  if (altitudeM > 2_000) return Math.round(altitudeM / 500) * 500;
  if (altitudeM > 500) return Math.round(altitudeM / 100) * 100;
  return Math.round(altitudeM / 25) * 25;
}

function createTileGeometry(tile: TileKey, radius: number): BufferGeometry {
  const bounds = tileToLngLatBounds(tile.z, tile.x, tile.y);
  const segs = tile.z >= 14 ? 1 : tile.z >= 10 ? 1 : tile.z >= 6 ? 2 : 3;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= segs; iy++) {
    const v = iy / segs;
    const lat = bounds.latMax + (bounds.latMin - bounds.latMax) * v;
    for (let ix = 0; ix <= segs; ix++) {
      const u = ix / segs;
      const lng = bounds.lngMin + (bounds.lngMax - bounds.lngMin) * u;
      const p = latLngToVector3(lat, lng, radius);
      positions.push(p.x, p.y, p.z);
      uvs.push(u, 1 - v);
    }
  }
  for (let iy = 0; iy < segs; iy++) {
    for (let ix = 0; ix < segs; ix++) {
      const a = iy * (segs + 1) + ix;
      const b = a + 1;
      const c = a + (segs + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geo.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  // Inflate — spherical patches otherwise false-cull at grazing angles
  if (geo.boundingSphere) geo.boundingSphere.radius *= 2.2;
  return geo;
}

function ImageryTile({
  tile,
  opacity,
  street,
  radius,
  priority,
}: {
  tile: TileKey;
  opacity: number;
  street: boolean;
  radius: number;
  priority: number;
}) {
  const matRef = useRef<MeshBasicMaterial>(null);
  const priorityRef = useRef(priority);
  priorityRef.current = priority;
  const targetOpacity = opacity;

  const cacheKey = `${street ? "st" : "sat"}:${tile.key}`;
  const [map, setMap] = useState<Texture | null>(
    () => getCachedTexture(cacheKey),
  );
  const fadeRef = useRef(hasCachedTexture(cacheKey) ? 1 : 0);
  const geometry = useMemo(
    () => createTileGeometry(tile, radius),
    [tile.z, tile.x, tile.y, radius],
  );

  useEffect(() => {
    const hit = getCachedTexture(cacheKey);
    if (hit) {
      acquireTexture(cacheKey);
      setMap(hit);
      fadeRef.current = 1;
      return () => {
        releaseTexture(cacheKey);
      };
    }

    let cancelled = false;
    let accounted = true;
    const template = street ? STREET_TILE_URL : SATELLITE_TILE_URL;
    const url = buildTileUrl(template, tile.z, tile.x, tile.y);
    const store = useEarthStore.getState();
    store.setTilesProgress(store.tilesLoading + 1, store.tilesLoaded);

    const release = () => {
      if (!accounted) return;
      accounted = false;
      const s = useEarthStore.getState();
      s.setTilesProgress(Math.max(0, s.tilesLoading - 1), s.tilesLoaded);
    };

    const localAbort = new AbortController();

    // Priority read from ref so pan/LOD re-sorts don't remount & abort loads
    imageryScheduler
      .enqueue(cacheKey, priorityRef.current, (signal) => {
        if (signal.aborted || localAbort.signal.aborted) {
          return Promise.reject(new DOMException("aborted", "AbortError"));
        }
        const onSchAbort = () => localAbort.abort();
        signal.addEventListener("abort", onSchAbort, { once: true });
        return loadTileImage(url, cacheKey, { signal: localAbort.signal });
      })
      .then((tex) => {
        if (!cancelled) {
          acquireTexture(cacheKey);
          fadeRef.current = 0;
          setMap(tex);
          const s = useEarthStore.getState();
          s.setTilesProgress(s.tilesLoading, s.tilesLoaded + 1);
        }
        release();
      })
      .catch(() => {
        release();
      });

    return () => {
      cancelled = true;
      localAbort.abort();
      releaseTexture(cacheKey);
      release();
    };
    // Intentionally omit `priority` — changing it must not abort in-flight imagery
  }, [cacheKey, tile.x, tile.y, tile.z, street]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, dt) => {
    const mat = matRef.current;
    if (!mat) return;
    if (map) {
      fadeRef.current = Math.min(1, fadeRef.current + dt * 3.2);
      mat.map = map;
      mat.color.set("#ffffff");
      mat.opacity = targetOpacity * fadeRef.current;
    } else {
      mat.map = null;
      mat.color.set("#1a3048");
      mat.opacity = Math.min(0.35, targetOpacity * 0.4);
    }
    mat.needsUpdate = true;
  });

  // Always draw the mesh — placeholder tint until texture arrives (no black holes)
  return (
    <mesh
      geometry={geometry}
      renderOrder={10 + Math.min(12, tile.z)}
      frustumCulled={false}
    >
      <meshBasicMaterial
        ref={matRef}
        map={map}
        color={map ? "#ffffff" : "#1a3048"}
        transparent
        opacity={map ? opacity : Math.min(0.35, opacity * 0.4)}
        depthWrite={false}
        depthTest={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

export function SatelliteLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.gisLayers.satellite);
  const dryEarthOn = useEarthStore((s) => s.dryEarth.enabled);
  const baseMapMode = useEarthStore((s) => s.baseMapMode);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const qualityId = useEarthStore((s) => s.qualityId);
  const setTilesProgress = useEarthStore((s) => s.setTilesProgress);

  const altQ = quantizeAltitude(altitudeM);
  const surfaceElevM = peekElevation(focusLat, focusLng) ?? 0;
  const shellRadius = shellRadiusForAltitude(altQ, surfaceElevM);
  const keysSigRef = useRef("");

  const modeFade =
    baseMapMode === "terrain" ? 0 : baseMapMode === "standard" ? 0.95 : 1;

  const tileReady = altitudeM < 2_500_000 && zoomLevel >= 2;
  const show = enabled && !dryEarthOn && modeFade > 0.02 && tileReady;

  // Quantize fade so opacity tweaks don't rebuild the tile set every frame
  const altitudeFadeQ = useMemo(() => {
    const raw =
      altQ >= 2_500_000
        ? 0
        : altQ <= 850_000
          ? 1
          : (2_500_000 - altQ) / 1_650_000;
    return Math.round(raw * 20) / 20;
  }, [altQ]);

  const street = baseMapMode === "standard";

  const targetZ = useMemo(
    () => Math.min(18, Math.max(3, Math.round(altitudeToTileZoom(altQ)))),
    [altQ],
  );

  // Snap focus to a tile cell — selection only changes when the camera crosses a cell
  const focusCell = useMemo(() => {
    const z = Math.max(2, Math.min(targetZ, 12));
    const t = lngLatToTile(focusLng, focusLat, z);
    return { z: targetZ, cellZ: z, x: t.x, y: t.y, lat: focusLat, lng: focusLng };
  }, [focusLat, focusLng, targetZ]);

  const tiles = useMemo(() => {
    if (!show)
      return [] as Array<TileKey & { opacity: number; priority: number }>;

    const sel = selectLodTiles({
      lat: focusCell.lat,
      lng: focusCell.lng,
      altitudeM: altQ,
      qualityId,
      zoomLevel,
    });
    return sel.imagery.map((t) => ({
      ...t,
      opacity: Math.min(
        1,
        Math.max(0.2, t.opacity * modeFade * altitudeFadeQ),
      ),
    }));
    // focusCell.x/y/z identity — not raw floating lat/lng every frame
  }, [
    show,
    focusCell.z,
    focusCell.cellZ,
    focusCell.x,
    focusCell.y,
    altQ,
    qualityId,
    zoomLevel,
    modeFade,
    altitudeFadeQ,
  ]);

  // Publish coverage stats + abort only when the visible key set actually changes
  useEffect(() => {
    if (!show) {
      keysSigRef.current = "";
      StreamPerf.patch({
        imageryVisible: 0,
        imageryPending: 0,
        imageryLoaded: 0,
        imageryKeys: [],
      });
      return;
    }
    const keys = tiles.map((t) => `${street ? "st" : "sat"}:${t.key}`);
    const sig = keys.slice().sort().join("|");
    if (sig !== keysSigRef.current) {
      keysSigRef.current = sig;
      const keep = new Set(keys);
      for (const id of keep) keep.add(`pf:${id}`);
      // Preserve corridor prefetch jobs (flight-plan streaming)
      for (const id of CorridorStreamer.getKeepIds()) keep.add(id);
      for (const id of keep) {
        if (id.startsWith(CORRIDOR_JOB_PREFIX)) keep.add(id);
      }
      imageryScheduler.cancelExcept(keep, true);
      // Trim free textures; leave headroom when corridor is warming the route
      const corridorOn = CorridorStreamer.getSnapshot().active;
      trimTileCache(corridorOn ? 56 : 40);
    }

    let loaded = 0;
    for (const key of keys) {
      if (hasCachedTexture(key)) loaded += 1;
    }
    const img = imageryScheduler.stats;
    StreamPerf.patch({
      imageryVisible: tiles.length,
      imageryLoaded: loaded,
      imageryPending: img.queued + img.running,
      imageryKeys: keys,
      tilesCachedGpu: getTileCacheStats().entries,
    });
  }, [show, tiles, street]);

  useEffect(() => {
    if (!show) setTilesProgress(0, useEarthStore.getState().tilesLoaded);
  }, [show, setTilesProgress]);

  useEffect(() => {
    if (!enabled || dryEarthOn || modeFade < 0.02 || altitudeM > 2_800_000)
      return;
    // Prefetch sparingly — aggressive warming was filling VRAM until tab crash
    if (altQ < 2_000 || altQ > 1_200_000) return;
    const template = street ? STREET_TILE_URL : SATELLITE_TILE_URL;
    const warmed = selectPrefetchTiles(focusCell.lat, focusCell.lng, altQ).slice(
      0,
      4,
    );
    for (const t of warmed) {
      const key = `${street ? "st" : "sat"}:${t.key}`;
      if (hasCachedTexture(key)) continue;
      void imageryScheduler
        .enqueue(`pf:${key}`, 2, (signal) =>
          loadTileImage(buildTileUrl(template, t.z, t.x, t.y), key, {
            signal,
          }),
        )
        .catch(() => undefined);
    }
  }, [
    enabled,
    modeFade,
    focusCell.x,
    focusCell.y,
    focusCell.cellZ,
    altQ,
    street,
    altitudeM,
    dryEarthOn,
    focusCell.lat,
    focusCell.lng,
  ]);

  if (!show) return null;

  return (
    <group name="satellite-imagery">
      {tiles.map((tile) => (
        <ImageryTile
          key={`${street ? "st" : "sat"}-${tile.key}`}
          tile={tile}
          opacity={tile.opacity}
          street={street}
          radius={shellRadius}
          priority={tile.priority}
        />
      ))}
    </group>
  );
}

