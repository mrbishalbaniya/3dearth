"use client";

/**
 * Land cover: ESA WorldCover 2021 (Terrascope WMS, free) at continent–country
 * scales + OSM landuse polygons for close-up detail.
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
import { EARTH_RADIUS } from "../../utils/constants";
import { latLngToVector3 } from "../../utils/geo";
import {
  altitudeToTileZoom,
  EARTH_RADIUS_M,
} from "../../utils/zoomLevels";
import {
  bboxAround,
  fetchLandCover,
  quantizeFocus,
} from "../overpass";
import {
  applyVertexColor,
  polygonToSphereGeometry,
} from "../geoProject";
import {
  loadTileImage,
  tilesAround,
  tileToLngLatBounds,
  worldCoverTileUrl,
  type TileKey,
} from "../TileLoader";
import {
  LAND_COVER_COLORS,
  type LandCoverClass,
  type OsmPolygonFeature,
} from "../types";

function shellRadius(altitudeM: number) {
  return 1 + Math.min(Math.max(altitudeM * 0.2, 2), 100) / EARTH_RADIUS_M;
}

function createTileGeometry(tile: TileKey, radius: number): BufferGeometry {
  const bounds = tileToLngLatBounds(tile.z, tile.x, tile.y);
  const segs = 6;
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
  return geo;
}

function WorldCoverTile({
  tile,
  opacity,
  radius,
}: {
  tile: TileKey;
  opacity: number;
  radius: number;
}) {
  const [map, setMap] = useState<Texture | null>(null);
  const matRef = useRef<MeshBasicMaterial>(null);
  const geometry = useMemo(
    () => createTileGeometry(tile, radius),
    [tile, radius],
  );

  useEffect(() => {
    let cancelled = false;
    const url = worldCoverTileUrl(tile.z, tile.x, tile.y);
    loadTileImage(url, `wc:${tile.key}`)
      .then((tex) => {
        if (!cancelled) setMap(tex);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      geometry.dispose();
    };
  }, [tile.key, tile.x, tile.y, tile.z, geometry]);

  useEffect(() => {
    if (matRef.current) matRef.current.opacity = opacity;
  }, [opacity]);

  return (
    <mesh geometry={geometry} renderOrder={4} frustumCulled={false}>
      <meshBasicMaterial
        ref={matRef}
        map={map ?? undefined}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

export function LandCoverLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.gisLayers.landCover);
  const dryEarthOn = useEarthStore((s) => s.dryEarth.enabled);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const satellite = useEarthStore((s) => s.gisLayers.satellite);

  const [features, setFeatures] = useState<OsmPolygonFeature[]>([]);
  const q = quantizeFocus(focusLat, focusLng, 0.03);
  // Gate OSM fetch without growing the effect deps array (Fast Refresh-safe)
  const landCoverActive = enabled && !dryEarthOn;

  // ESA WorldCover raster: skip when satellite owns the view (duplicate VRAM)
  // Also hide in Dry Earth — it painted a fake brown "crust" over land plains
  const showRaster =
    landCoverActive &&
    !satellite &&
    altitudeM < 4_000_000 &&
    altitudeM > 8_000 &&
    zoomLevel >= 2;
  const z = Math.min(10, Math.max(3, Math.round(altitudeToTileZoom(altitudeM) - 1)));
  const radius = shellRadius(altitudeM);
  const rasterOpacity = satellite ? 0.55 : 0.85;

  const tiles = useMemo(() => {
    if (!showRaster) return [] as TileKey[];
    return tilesAround(focusLat, focusLng, z, 2);
  }, [showRaster, focusLat, focusLng, z]);

  // OSM detail polygons when closer
  useEffect(() => {
    if (!landCoverActive || altitudeM > 120_000 || zoomLevel < 5) {
      setFeatures([]);
      return;
    }
    const ctrl = new AbortController();
    fetchLandCover(bboxAround(q.lat, q.lng, altitudeM > 40_000 ? 0.2 : 0.08), ctrl.signal)
      .then((res) => setFeatures(res.slice(0, 350)))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [landCoverActive, q.lat, q.lng, altitudeM, zoomLevel]);

  const meshes = useMemo(
    () =>
      features.map((f) => {
        const geo = polygonToSphereGeometry(f.rings[0], EARTH_RADIUS * 1.0019);
        const color =
          LAND_COVER_COLORS[f.kind as LandCoverClass] ||
          LAND_COVER_COLORS.grassland;
        applyVertexColor(geo, color);
        return { id: f.id, geo, color };
      }),
    [features],
  );

  useEffect(() => {
    return () => {
      for (const m of meshes) m.geo.dispose();
    };
  }, [meshes]);

  if (!landCoverActive) return null;

  return (
    <group>
      {tiles.map((tile) => (
        <WorldCoverTile
          key={`wc-${tile.key}`}
          tile={tile}
          opacity={rasterOpacity}
          radius={radius}
        />
      ))}
      {meshes.map(({ id, geo, color }) => (
        <mesh key={id} geometry={geo} renderOrder={4} frustumCulled>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5}
            depthWrite={false}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
