"use client";

/**
 * Dry Earth DEM — land (SRTM) + real ocean depth below MSL (GEBCO/Seascape).
 * Elevations are meters relative to mean sea level: 0 = coastline, negative = depth.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  FrontSide,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { useEarthStore } from "../../store/earthStore";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";
import {
  sampleMergedDemGrid,
  tileToLngLatBounds,
} from "../../gis/TileLoader";
import { demScheduler, selectDryEarthDemTiles } from "../../streaming";
import type { LodTile } from "../../streaming";
import { elevToHypsometricRgb } from "../hypsometric";
import { lngLatToTile } from "../../utils/tiles";

interface BathymetryTileProps {
  z: number;
  x: number;
  y: number;
  landExag: number;
  depthExag: number;
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
  landExag,
  depthExag,
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
        roughness: 0.82,
        metalness: 0.04,
        transparent: true,
        opacity: 0,
        side: FrontSide,
        wireframe: false,
        depthWrite: true,
        depthTest: true,
        flatShading: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );

  useEffect(() => {
    material.wireframe = wireframe;
  }, [material, wireframe]);

  useEffect(() => {
    let cancelled = false;
    const key = `bathy-msl:${z}/${x}/${y}`;

    demScheduler
      .enqueue(
        key,
        priority,
        (signal) => {
          if (signal.aborted) {
            return Promise.reject(new DOMException("aborted", "AbortError"));
          }
          return sampleMergedDemGrid(z, x, y, gridSize);
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
        const latSpan = bounds.latMax - bounds.latMin;
        const lngSpan = bounds.lngMax - bounds.lngMin;
        // Approx meters per grid step (for slope / hillshade)
        const midLat = (bounds.latMin + bounds.latMax) * 0.5;
        const cellM =
          ((latSpan / Math.max(1, grid - 1)) * Math.PI) / 180 *
          EARTH_RADIUS_M;
        const cellLngM =
          ((lngSpan / Math.max(1, grid - 1)) * Math.PI) / 180 *
          EARTH_RADIUS_M *
          Math.cos((midLat * Math.PI) / 180);

        const elevAt = (ix: number, iy: number) => {
          const cx = Math.min(grid - 1, Math.max(0, ix));
          const cy = Math.min(grid - 1, Math.max(0, iy));
          const e = heights[cy * grid + cx];
          return Number.isFinite(e) ? e : 0;
        };

        for (let iy = 0; iy < grid; iy++) {
          const v = iy / (grid - 1);
          const lat = bounds.latMax + (bounds.latMin - bounds.latMax) * v;
          for (let ix = 0; ix < grid; ix++) {
            const u = ix / (grid - 1);
            const lng = bounds.lngMin + (bounds.lngMax - bounds.lngMin) * u;
            // Meters relative to mean sea level (0 = MSL / coastline)
            const elevMsl = elevAt(ix, iy);
            const exag = elevMsl < 0 ? depthExag : landExag;
            // Lift above opaque underlay so flat plains aren't buried (looked like a brown slab)
            const r =
              1 + (elevMsl * exag) / EARTH_RADIUS_M + 0.00045;
            const p = latLngToVector3(lat, lng, r);
            positions.push(p.x, p.y, p.z);

            // Hypsometric base + cartographic hillshade so ridges read before GPU lights
            const [cr, cg, cb] = elevToHypsometricRgb(elevMsl);
            const dzdx =
              ((elevAt(ix + 1, iy) - elevAt(ix - 1, iy)) * exag) /
              (2 * Math.max(30, cellLngM));
            const dzdy =
              ((elevAt(ix, iy + 1) - elevAt(ix, iy - 1)) * exag) /
              (2 * Math.max(30, cellM));
            const slope = Math.atan(Math.hypot(dzdx, dzdy));
            const aspect = Math.atan2(dzdy, -dzdx);
            // Light from NW at ~55° — classic terrain relief
            const zenith = Math.PI / 2 - (55 * Math.PI) / 180;
            const azimuth = (315 * Math.PI) / 180;
            const hs = Math.max(
              0.22,
              Math.min(
                1.2,
                Math.cos(zenith) * Math.cos(slope) +
                  Math.sin(zenith) *
                    Math.sin(slope) *
                    Math.cos(azimuth - aspect),
              ),
            );
            const flooded = elevMsl < seaLevelM;
            const shade = (flooded ? 0.4 : 1) * (0.4 + 0.6 * hs);
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
    landExag,
    depthExag,
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
    // Fade in without leaving a see-through globe (opaque once mostly visible)
    const target = Math.max(0.98, opacity);
    material.opacity += (target - material.opacity) * Math.min(1, delta * 3);
    const op = material.opacity;
    material.transparent = op < 0.98;
    material.depthWrite = true;
    if (meshRef.current) meshRef.current.visible = op > 0.02;
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
      castShadow
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

  // Real SRTM/GEBCO through planet zoom — without DEM, Asia is a flat tabletop
  const show = enabled && altitudeM < 14_000_000 && altitudeM > 80;

  // Strong at orbit so peaks read; near-real at city/street so camera isn't buried
  const landExag =
    altitudeM > 5_000_000
      ? Math.max(exaggeration, 36)
      : altitudeM > 2_000_000
        ? Math.max(exaggeration, 28)
        : altitudeM > 800_000
          ? Math.max(exaggeration, 20)
          : altitudeM > 200_000
            ? Math.max(exaggeration, 12)
            : altitudeM > 80_000
              ? Math.max(exaggeration, 6)
              : altitudeM > 20_000
                ? Math.max(exaggeration, 3)
                : Math.max(exaggeration, 1.6);
  const depthExag =
    landExag *
    (altitudeM > 5_000_000 ? 1.35 : altitudeM > 80_000 ? 1.6 : 1.25);

  // Quantize altitude so pan/zoom micro-moves don't abort DEM stampede
  const altQ =
    altitudeM > 5_000_000
      ? Math.round(altitudeM / 500_000) * 500_000
      : altitudeM > 2_000_000
        ? Math.round(altitudeM / 200_000) * 200_000
        : altitudeM > 800_000
          ? Math.round(altitudeM / 80_000) * 80_000
          : altitudeM > 80_000
            ? Math.round(altitudeM / 25_000) * 25_000
            : Math.round(altitudeM / 5_000) * 5_000;

  const focusCell = useMemo(() => {
    const z =
      altitudeM > 5_000_000
        ? 3
        : altitudeM > 2_000_000
          ? 4
          : altitudeM > 800_000
            ? 6
            : altitudeM > 80_000
              ? 7
              : 8;
    const t = lngLatToTile(focusLng, focusLat, z);
    return `${z}/${t.x}/${t.y}/${altQ}/${quality}`;
  }, [focusLat, focusLng, altQ, quality, altitudeM]);

  const generationRef = useRef(0);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (!show) return;
    generationRef.current = demScheduler.beginGeneration();
    setGeneration(generationRef.current);
  }, [show, focusCell]);

  const { tiles, gridSize } = useMemo(() => {
    if (!show) return { tiles: [] as LodTile[], gridSize: 33 };
    const demTiles = selectDryEarthDemTiles({
      lat: focusLat,
      lng: focusLng,
      altitudeM: altQ,
      qualityId: quality,
    });
    const grid =
      altQ > 5_000_000
        ? quality === "low"
          ? 25
          : 33
        : altQ > 2_000_000
          ? quality === "low"
            ? 33
            : 41
          : altQ < 20_000
            ? 25
            : quality === "ultra"
              ? 41
              : quality === "high"
                ? 33
                : 25;
    return {
      tiles: demTiles,
      gridSize: grid,
    };
  }, [show, focusCell, focusLat, focusLng, altQ, quality]);

  if (!show) return null;

  return (
    <group name="bathymetry">
      {tiles.map((t) => (
        <BathymetryTileMesh
          key={`bathy-${t.key}`}
          z={t.z}
          x={t.x}
          y={t.y}
          landExag={landExag}
          depthExag={depthExag}
          opacity={1}
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
