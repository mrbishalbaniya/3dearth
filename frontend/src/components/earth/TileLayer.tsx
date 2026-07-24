"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  LinearFilter,
  MeshBasicMaterial,
  SRGBColorSpace,
  Texture,
} from "three";
import { useEarthStore } from "./store/earthStore";
import { latLngToVector3 } from "./utils/geo";
import {
  altitudeToTileZoom,
  altitudeToZoomLevel,
} from "./utils/zoomLevels";
import {
  buildTileUrl,
  SATELLITE_TILE_URL,
  STREET_TILE_URL,
  tileToLngLatBounds,
  tilesAround,
  type TileKey,
} from "./utils/tiles";
import type { EarthQualityProfile } from "./types";

const textureCache = new Map<string, Texture>();
const inflight = new Map<string, Promise<Texture>>();

function loadTileTexture(url: string, key: string): Promise<Texture> {
  const cached = textureCache.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = new Promise<Texture>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tex = new Texture(img);
      tex.colorSpace = SRGBColorSpace;
      tex.minFilter = LinearFilter;
      tex.magFilter = LinearFilter;
      tex.generateMipmaps = false;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      textureCache.set(key, tex);
      inflight.delete(key);
      if (textureCache.size > 280) {
        const first = textureCache.keys().next().value;
        if (first) {
          textureCache.get(first)?.dispose();
          textureCache.delete(first);
        }
      }
      resolve(tex);
    };
    img.onerror = () => {
      inflight.delete(key);
      reject(new Error(`Tile failed ${key}`));
    };
    img.src = url;
  });

  inflight.set(key, promise);
  return promise;
}

function createTileGeometry(tile: TileKey, radius = 1.0014): BufferGeometry {
  const bounds = tileToLngLatBounds(tile.z, tile.x, tile.y);
  const segs = tile.z >= 12 ? 4 : 8;
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
  geo.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function TileMesh({
  tile,
  opacity,
  useStreet,
}: {
  tile: TileKey;
  opacity: number;
  useStreet: boolean;
}) {
  const matRef = useRef<MeshBasicMaterial>(null);
  const [map, setMap] = useState<Texture | null>(null);
  const geometry = useMemo(() => createTileGeometry(tile), [tile]);

  useEffect(() => {
    let cancelled = false;
    const template = useStreet ? STREET_TILE_URL : SATELLITE_TILE_URL;
    const url = buildTileUrl(template, tile.z, tile.x, tile.y);
    const key = `${useStreet ? "s" : "i"}:${tile.key}`;

    const store = useEarthStore.getState();
    store.setTilesProgress(store.tilesLoading + 1, store.tilesLoaded);

    loadTileTexture(url, key)
      .then((tex) => {
        if (cancelled) return;
        setMap(tex);
        const s = useEarthStore.getState();
        s.setTilesProgress(Math.max(0, s.tilesLoading - 1), s.tilesLoaded + 1);
      })
      .catch(() => {
        const s = useEarthStore.getState();
        s.setTilesProgress(Math.max(0, s.tilesLoading - 1), s.tilesLoaded);
      });

    return () => {
      cancelled = true;
      geometry.dispose();
    };
  }, [tile.key, tile.x, tile.y, tile.z, useStreet, geometry]);

  useEffect(() => {
    if (matRef.current) matRef.current.opacity = opacity;
  }, [opacity]);

  if (!map) return null;

  return (
    <mesh geometry={geometry} renderOrder={5} frustumCulled>
      <meshBasicMaterial
        ref={matRef}
        map={map}
        color="#ffffff"
        transparent
        opacity={opacity}
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

interface TileLayerProps {
  quality: EarthQualityProfile;
}

export function TileLayer({ quality }: TileLayerProps) {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const tilesEnabled = useEarthStore((s) => s.layers.tiles);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);

  const level = altitudeToZoomLevel(altitudeM);
  const opacity = tilesEnabled ? level.tileOpacity : 0;
  const show = opacity > 0.02 && level.showTiles && altitudeM < 700_000;
  const z = Math.min(18, Math.max(0, Math.round(altitudeToTileZoom(altitudeM))));
  const useStreet = zoomLevel >= 5;

  const tiles = useMemo(() => {
    if (!show) return [] as TileKey[];
    return tilesAround(focusLat, focusLng, z, quality.maxTileRadius);
  }, [show, focusLat, focusLng, z, quality.maxTileRadius]);

  useEffect(() => {
    if (!show || z <= 1) return;
    for (const t of tilesAround(focusLat, focusLng, z - 1, 1)) {
      const template = useStreet ? STREET_TILE_URL : SATELLITE_TILE_URL;
      const url = buildTileUrl(template, t.z, t.x, t.y);
      void loadTileTexture(url, `${useStreet ? "s" : "i"}:${t.key}`).catch(
        () => undefined,
      );
    }
  }, [show, focusLat, focusLng, z, useStreet]);

  if (!show) return null;

  return (
    <group>
      {tiles.map((tile) => (
        <TileMesh
          key={`${useStreet ? "s" : "i"}-${tile.key}`}
          tile={tile}
          opacity={opacity}
          useStreet={useStreet}
        />
      ))}
    </group>
  );
}
