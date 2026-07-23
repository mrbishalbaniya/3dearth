"use client";

/**
 * Progressive multi-LOD satellite / street imagery streaming.
 * Parent tiles stay visible under detail tiles to avoid blank flashes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  MeshBasicMaterial,
  Texture,
} from "three";
import { useEarthStore } from "../../store/earthStore";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";
import {
  buildTileUrl,
  loadTileImage,
  SATELLITE_TILE_URL,
  STREET_TILE_URL,
  tileToLngLatBounds,
  type TileKey,
} from "../TileLoader";
import {
  imageryScheduler,
  selectLodTiles,
  selectPrefetchTiles,
} from "../../streaming";
import { lngLatToTile } from "../../utils/tiles";

/** Stable imagery shell — keep clear of the globe to avoid z-fighting bands. */
function shellRadiusForAltitude(altitudeM: number): number {
  const offsetM = Math.min(Math.max(altitudeM * 0.008, 25), 180);
  const q = Math.round(offsetM * 2) / 2;
  return 1 + q / EARTH_RADIUS_M;
}

function quantizeAltitude(altitudeM: number): number {
  if (altitudeM > 1_000_000) return Math.round(altitudeM / 50_000) * 50_000;
  if (altitudeM > 100_000) return Math.round(altitudeM / 10_000) * 10_000;
  if (altitudeM > 10_000) return Math.round(altitudeM / 1_000) * 1_000;
  if (altitudeM > 1_000) return Math.round(altitudeM / 100) * 100;
  return Math.round(altitudeM / 25) * 25;
}

function createTileGeometry(tile: TileKey, radius: number): BufferGeometry {
  const bounds = tileToLngLatBounds(tile.z, tile.x, tile.y);
  const segs = tile.z >= 14 ? 3 : tile.z >= 10 ? 5 : 8;
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
  geo.computeVertexNormals();
  return geo;
}

function ImageryTile({
  tile,
  opacity,
  street,
  radius,
  priority,
  generation,
}: {
  tile: TileKey;
  opacity: number;
  street: boolean;
  radius: number;
  priority: number;
  generation: number;
}) {
  const matRef = useRef<MeshBasicMaterial>(null);
  const [map, setMap] = useState<Texture | null>(null);
  const geometry = useMemo(
    () => createTileGeometry(tile, radius),
    [tile.z, tile.x, tile.y, radius],
  );

  useEffect(() => {
    let cancelled = false;
    let accounted = true;
    const template = street ? STREET_TILE_URL : SATELLITE_TILE_URL;
    const url = buildTileUrl(template, tile.z, tile.x, tile.y);
    const key = `${street ? "st" : "sat"}:${tile.key}`;
    const store = useEarthStore.getState();
    store.setTilesProgress(store.tilesLoading + 1, store.tilesLoaded);

    const release = () => {
      if (!accounted) return;
      accounted = false;
      const s = useEarthStore.getState();
      s.setTilesProgress(Math.max(0, s.tilesLoading - 1), s.tilesLoaded);
    };

    imageryScheduler
      .enqueue(
        key,
        priority,
        (signal) => {
          if (signal.aborted) {
            return Promise.reject(new DOMException("aborted", "AbortError"));
          }
          return loadTileImage(url, key);
        },
        generation,
      )
      .then((tex) => {
        if (!cancelled) {
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
      release();
    };
  }, [tile.key, tile.x, tile.y, tile.z, street, priority, generation]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    if (matRef.current) matRef.current.opacity = opacity;
  }, [opacity]);

  const lift = tile.z < 10 ? 0.00002 : tile.z < 14 ? 0.00001 : 0;

  if (!map) return null;

  return (
    <mesh
      geometry={geometry}
      renderOrder={4 + Math.min(8, tile.z)}
      frustumCulled={false}
      scale={1 + lift}
    >
      <meshBasicMaterial
        ref={matRef}
        map={map}
        color="#ffffff"
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest
        side={DoubleSide}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

export function SatelliteLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.gisLayers.satellite);
  const baseMapMode = useEarthStore((s) => s.baseMapMode);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const qualityId = useEarthStore((s) => s.qualityId);
  const setTilesProgress = useEarthStore((s) => s.setTilesProgress);

  const altQ = quantizeAltitude(altitudeM);
  const shellRadius = shellRadiusForAltitude(altQ);

  const modeFade =
    baseMapMode === "terrain" ? 0 : baseMapMode === "standard" ? 0.95 : 1;
  const show =
    enabled && modeFade > 0.02 && altitudeM < 450_000 && zoomLevel >= 3;

  // Prefer satellite at close range — street basemap only in Standard mode
  const street = baseMapMode === "standard";

  const focusCell = useMemo(() => {
    const z = Math.min(12, Math.max(3, Math.round(Math.log2(EARTH_RADIUS_M / Math.max(altQ, 200)))));
    const t = lngLatToTile(focusLng, focusLat, z);
    return `${z}/${t.x}/${t.y}`;
  }, [focusLat, focusLng, altQ]);

  const generationRef = useRef(0);
  const lastCellRef = useRef("");

  const { tiles, generation } = useMemo(() => {
    if (!show) return { tiles: [] as Array<TileKey & { opacity: number; priority: number }>, generation: generationRef.current };

    // Only bump scheduler generation when the focus cell / altitude band changes
    if (lastCellRef.current !== focusCell) {
      lastCellRef.current = focusCell;
      generationRef.current = imageryScheduler.beginGeneration();
    }

    const sel = selectLodTiles({
      lat: focusLat,
      lng: focusLng,
      altitudeM: altQ,
      qualityId,
      zoomLevel,
    });
    return {
      tiles: sel.imagery.map((t) => ({
        ...t,
        opacity: Math.max(0.2, t.opacity * modeFade),
      })),
      generation: generationRef.current,
    };
  }, [show, focusCell, focusLat, focusLng, altQ, qualityId, zoomLevel, modeFade]);

  useEffect(() => {
    if (!show) setTilesProgress(0, useEarthStore.getState().tilesLoaded);
  }, [show, setTilesProgress]);

  useEffect(() => {
    if (!show) return;
    const template = street ? STREET_TILE_URL : SATELLITE_TILE_URL;
    for (const t of selectPrefetchTiles(focusLat, focusLng, altQ)) {
      const key = `${street ? "st" : "sat"}:${t.key}`;
      void imageryScheduler
        .enqueue(
          `pf:${key}`,
          5,
          () => loadTileImage(buildTileUrl(template, t.z, t.x, t.y), key),
          generation,
        )
        .catch(() => undefined);
    }
  }, [show, focusLat, focusLng, altQ, street, generation]);

  if (!show) return null;

  return (
    <group>
      {tiles.map((tile) => (
        <ImageryTile
          key={`${street ? "st" : "sat"}-${tile.key}`}
          tile={tile}
          opacity={tile.opacity}
          street={street}
          radius={shellRadius}
          priority={tile.priority}
          generation={generation}
        />
      ))}
    </group>
  );
}
