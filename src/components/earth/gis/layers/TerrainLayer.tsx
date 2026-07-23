"use client";

/**
 * Progressive DEM terrain — parent LOD stays while detail morphs in.
 * Heights from Mapzen Terrarium (SRTM). Soft fade + normals.
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
} from "../TileLoader";
import { demScheduler, selectLodTiles } from "../../streaming";

interface TerrainTileMeshProps {
  z: number;
  x: number;
  y: number;
  exaggeration: number;
  opacity: number;
  showElevationTint: boolean;
  priority: number;
  generation: number;
  gridSize: number;
}

function TerrainTileMesh({
  z,
  x,
  y,
  exaggeration,
  opacity,
  showElevationTint,
  priority,
  generation,
  gridSize,
}: TerrainTileMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.02,
        transparent: true,
        opacity: 0,
        side: DoubleSide,
        flatShading: false,
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const url = buildTileUrl(TERRARIUM_DEM_URL, z, x, y);
    const key = `dem:${z}/${x}/${y}`;

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
            const r =
              1 + (Math.max(-100, clamped) * exaggeration) / EARTH_RADIUS_M;
            const p = latLngToVector3(lat, lng, r);
            positions.push(p.x, p.y, p.z);

            if (showElevationTint) {
              if (clamped < 5) color.set("#1a4a6a");
              else if (clamped < 400) color.set("#2f6b3c");
              else if (clamped < 1200) color.set("#6b8f4e");
              else if (clamped < 2500) color.set("#8a7a5c");
              else if (clamped < 4000) color.set("#a09080");
              else color.set("#f2f6fa");
            } else {
              // Subtle relief shading base
              const t = Math.min(1, Math.max(0, clamped / 4000));
              color.setRGB(0.35 + t * 0.25, 0.4 + t * 0.15, 0.32 + t * 0.1);
            }
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
  }, [z, x, y, exaggeration, showElevationTint, priority, generation, gridSize]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    material.opacity += (opacity - material.opacity) * Math.min(1, delta * 3.2);
    if (meshRef.current) meshRef.current.visible = material.opacity > 0.02;
  });

  if (!geometry) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={2 + Math.min(6, z - 4)}
      frustumCulled
      receiveShadow
      castShadow
    />
  );
}

export function TerrainLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const gis = useEarthStore((s) => s.gisLayers);
  const exaggeration = useEarthStore((s) => s.terrainExaggeration);
  const quality = useEarthStore((s) => s.qualityId);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);

  const show =
    (gis.terrain || gis.elevation) && altitudeM < 120_000 && altitudeM > 80;

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
      quality === "ultra" ? 49 : quality === "high" ? 41 : quality === "medium" ? 33 : 25;
    return {
      tiles: sel.dem,
      generation: gen,
      gridSize: grid,
    };
  }, [show, focusLat, focusLng, altitudeM, quality, zoomLevel]);

  if (!show) return null;

  return (
    <group>
      {tiles.map((t) => (
        <TerrainTileMesh
          key={`dem-${t.key}`}
          z={t.z}
          x={t.x}
          y={t.y}
          exaggeration={gis.terrain ? exaggeration : 0.15}
          opacity={
            (gis.terrain ? 0.9 : gis.elevation ? 0.55 : 0) *
            Math.max(0.35, t.opacity)
          }
          showElevationTint={gis.elevation}
          priority={t.priority}
          generation={generation}
          gridSize={t.role === "detail" ? gridSize : Math.max(17, gridSize - 8)}
        />
      ))}
    </group>
  );
}
