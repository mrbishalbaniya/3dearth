"use client";

/**
 * Full-range DEM bathymetry / topography tiles (Terrarium includes ocean depths).
 * Revealed when Dry Earth is active — no elev clamp that kills trenches.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { useEarthStore } from "../../store/earthStore";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";
import {
  buildTileUrl,
  sampleTerrariumGrid,
  TERRARIUM_DEM_URL,
  tileToLngLatBounds,
} from "../../gis/TileLoader";
import { demScheduler, selectLodTiles } from "../../streaming";
import { elevToHypsometricRgb } from "../hypsometric";

interface BathymetryTileProps {
  z: number;
  x: number;
  y: number;
  exaggeration: number;
  opacity: number;
  priority: number;
  generation: number;
  gridSize: number;
  seaLevelM: number;
  wireframe: boolean;
}

function BathymetryTileMesh({
  z,
  x,
  y,
  exaggeration,
  opacity,
  priority,
  generation,
  gridSize,
  seaLevelM,
  wireframe,
}: BathymetryTileProps) {
  const meshRef = useRef<Mesh>(null);
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        metalness: 0.02,
        transparent: true,
        opacity: 0,
        side: DoubleSide,
        wireframe: false,
        flatShading: false,
      }),
    [],
  );

  useEffect(() => {
    material.wireframe = wireframe;
  }, [material, wireframe]);

  useEffect(() => {
    let cancelled = false;
    const url = buildTileUrl(TERRARIUM_DEM_URL, z, x, y);
    const key = `bathy:${z}/${x}/${y}`;

    demScheduler
      .enqueue(
        key,
        priority,
        (signal) => {
          if (signal.aborted) {
            return Promise.reject(new DOMException("aborted", "AbortError"));
          }
          return sampleTerrariumGrid(url, gridSize);
        },
        generation,
      )
      .then((heights) => {
        if (cancelled) return;
        const bounds = tileToLngLatBounds(z, x, y);
        const positions: number[] = [];
        const colors: number[] = [];
        const indices: number[] = [];
        const color = new Color();
        const grid = gridSize;

        for (let iy = 0; iy < grid; iy++) {
          const v = iy / (grid - 1);
          const lat = bounds.latMax + (bounds.latMin - bounds.latMax) * v;
          for (let ix = 0; ix < grid; ix++) {
            const u = ix / (grid - 1);
            const lng = bounds.lngMin + (bounds.lngMax - bounds.lngMin) * u;
            const elev = heights[iy * grid + ix];
            const clamped = Number.isFinite(elev) ? elev : 0;
            // Full bathymetry range — no -100 clamp
            const r = 1 + (clamped * exaggeration) / EARTH_RADIUS_M;
            const p = latLngToVector3(lat, lng, r);
            positions.push(p.x, p.y, p.z);

            const [cr, cg, cb] = elevToHypsometricRgb(clamped);
            // Dim slightly if still underwater relative to current sea level
            const under = clamped < seaLevelM;
            const shade = under ? 0.55 : 1;
            color.setRGB(cr * shade, cg * shade, cb * shade);
            colors.push(color.r, color.g, color.b);
          }
        }

        for (let iy = 0; iy < grid - 1; iy++) {
          for (let ix = 0; ix < grid - 1; ix++) {
            const a = iy * grid + ix;
            const b = a + 1;
            const c = a + grid;
            const d = c + 1;
            indices.push(a, c, b, b, c, d);
          }
        }

        const geo = new BufferGeometry();
        geo.setAttribute(
          "position",
          new BufferAttribute(new Float32Array(positions), 3),
        );
        geo.setAttribute(
          "color",
          new BufferAttribute(new Float32Array(colors), 3),
        );
        geo.setIndex(indices);
        geo.computeVertexNormals();
        setGeometry((prev) => {
          prev?.dispose();
          return geo;
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [
    z,
    x,
    y,
    exaggeration,
    priority,
    generation,
    gridSize,
    seaLevelM,
  ]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    material.opacity += (opacity - material.opacity) * Math.min(1, delta * 3);
    if (meshRef.current) meshRef.current.visible = material.opacity > 0.02;
  });

  if (!geometry) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={4}
      frustumCulled
      receiveShadow
    />
  );
}

export function BathymetryLayer() {
  const enabled = useEarthStore((s) => s.dryEarth.enabled);
  const displaySea = useEarthStore((s) => s.dryEarth.displaySeaLevelM);
  const colorMode = useEarthStore((s) => s.dryEarth.colorMode);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const exaggeration = useEarthStore((s) => s.terrainExaggeration);
  const quality = useEarthStore((s) => s.qualityId);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);

  const show =
    enabled &&
    altitudeM < 2_500_000 &&
    altitudeM > 200 &&
    (displaySea < 500 || zoomLevel >= 3);

  const { tiles, generation, gridSize } = useMemo(() => {
    if (!show) return { tiles: [], generation: 0, gridSize: 33 };
    const gen = demScheduler.beginGeneration();
    const sel = selectLodTiles({
      lat: focusLat,
      lng: focusLng,
      altitudeM,
      qualityId: quality,
      zoomLevel,
    });
    const grid =
      quality === "ultra"
        ? 49
        : quality === "high"
          ? 41
          : quality === "medium"
            ? 33
            : 25;
    return {
      tiles: sel.dem,
      generation: gen,
      gridSize: grid,
    };
  }, [show, focusLat, focusLng, altitudeM, quality, zoomLevel]);

  if (!show) return null;

  return (
    <group name="bathymetry">
      {tiles.map((t) => (
        <BathymetryTileMesh
          key={`bathy-${t.key}`}
          z={t.z}
          x={t.x}
          y={t.y}
          exaggeration={exaggeration * 1.15}
          opacity={0.88 * Math.max(0.4, t.opacity)}
          priority={t.priority}
          generation={generation}
          gridSize={t.role === "detail" ? gridSize : Math.max(17, gridSize - 8)}
          seaLevelM={displaySea}
          wireframe={colorMode === "wireframe"}
        />
      ))}
    </group>
  );
}
