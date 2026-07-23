"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { useEarthStore } from "./store/earthStore";
import { latLngToVector3 } from "./utils/geo";
import { altitudeToZoomLevel, EARTH_RADIUS_M } from "./utils/zoomLevels";

export function TerrainMesh() {
  const meshRef = useRef<Mesh>(null);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.layers.terrain);
  const exaggeration = useEarthStore((s) => s.terrainExaggeration);
  const level = altitudeToZoomLevel(altitudeM);

  const show = enabled && level.showTerrain && altitudeM < 500_000;
  const patchKey = `${Math.round(focusLat * 20)},${Math.round(focusLng * 20)},${Math.round(altitudeM / 5000)},${exaggeration}`;

  const { geometry, material } = useMemo(() => {
    const segs = 40;
    const spanDeg =
      altitudeM > 80_000 ? 4 : altitudeM > 15_000 ? 1.2 : 0.35;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const color = new Color();

    let seed =
      Math.abs(Math.floor(focusLat * 50) * 73856093) ^
      Math.abs(Math.floor(focusLng * 50) * 19349663);
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const heights: number[][] = [];
    for (let iy = 0; iy <= segs; iy++) {
      heights[iy] = [];
      for (let ix = 0; ix <= segs; ix++) {
        const n =
          Math.sin(ix * 0.35 + focusLng) * Math.cos(iy * 0.4 + focusLat) * 0.5 +
          Math.sin(ix * 0.9) * 0.25 +
          (rand() - 0.5) * 0.15;
        heights[iy][ix] = Math.max(0, n);
      }
    }

    for (let iy = 0; iy <= segs; iy++) {
      for (let ix = 0; ix <= segs; ix++) {
        const u = ix / segs;
        const v = iy / segs;
        const lat = focusLat + (v - 0.5) * spanDeg;
        const lng = focusLng + (u - 0.5) * spanDeg;
        const elevM = heights[iy][ix] * 1800 * exaggeration;
        const r = 1 + elevM / EARTH_RADIUS_M;
        const p = latLngToVector3(lat, lng, r);
        positions.push(p.x, p.y, p.z);

        const t = heights[iy][ix];
        if (t < 0.15) color.set("#2d5a3d");
        else if (t < 0.4) color.set("#4a7a45");
        else if (t < 0.7) color.set("#8a7a5a");
        else color.set("#e8eef5");
        colors.push(color.r, color.g, color.b);
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
    geo.setAttribute(
      "color",
      new BufferAttribute(new Float32Array(colors), 3),
    );
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      transparent: true,
      opacity: 0,
      side: DoubleSide,
    });

    return { geometry: geo, material: mat };
    // patchKey captures focus/altitude/exaggeration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patchKey]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const target = show ? 0.75 : 0;
    material.opacity += (target - material.opacity) * Math.min(1, delta * 3);
    meshRef.current.visible = material.opacity > 0.02;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      renderOrder={4}
      frustumCulled
    />
  );
}
