"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import { Raycaster, Vector2, Vector3 } from "three";
import { useEarthStore } from "../../store/earthStore";
import { vector3ToLatLng } from "../../utils/geo";
import { sampleElevation } from "../../streaming/ElevationService";
import { classifyTerrain } from "../hypsometric";
import type { MeasureSample } from "../types";

function estimateSlope(
  elev: number,
  n: number,
  s: number,
  e: number,
  w: number,
  stepM: number,
): number {
  const dzdx = (e - w) / (2 * stepM);
  const dzdy = (n - s) / (2 * stepM);
  const grade = Math.hypot(dzdx, dzdy);
  return (Math.atan(grade) * 180) / Math.PI;
}

/**
 * Click-to-measure: lat/lng, elev, depth, slope, terrain type, water depth.
 */
export function MeasurementTool() {
  const measureMode = useEarthStore((s) => s.dryEarth.measureMode);
  const crossSectionMode = useEarthStore((s) => s.dryEarth.crossSectionMode);
  const enabled = useEarthStore((s) => s.dryEarth.enabled);
  const { camera, gl } = useThree();
  const raycaster = useRef(new Raycaster());
  const pointer = useRef(new Vector2());
  const hit = useRef(new Vector3());

  const sampleAt = useCallback(async (lat: number, lng: number) => {
    const sea = useEarthStore.getState().dryEarth.displaySeaLevelM;
    let elev = 0;
    try {
      elev = await sampleElevation(lat, lng, 10);
    } catch {
      elev = 0;
    }
    // Neighbor samples for slope
    const d = 0.02;
    let n = elev;
    let s = elev;
    let e = elev;
    let w = elev;
    try {
      [n, s, e, w] = await Promise.all([
        sampleElevation(lat + d, lng, 10),
        sampleElevation(lat - d, lng, 10),
        sampleElevation(lat, lng + d, 10),
        sampleElevation(lat, lng - d, 10),
      ]);
    } catch {
      /* keep elev */
    }
    const stepM = d * 111_320;
    const slopeDeg = estimateSlope(elev, n, s, e, w, stepM);
    const waterDepthM = Math.max(0, sea - elev);
    const depthM = elev < 0 ? -elev : 0;
    const distanceToSeaM = elev >= sea ? elev - sea : 0;

    const sample: MeasureSample = {
      lat,
      lng,
      elevationM: elev,
      depthM,
      waterDepthM,
      slopeDeg,
      terrainType: classifyTerrain(elev, sea),
      distanceToSeaM,
      seaLevelM: sea,
      country: useEarthStore.getState().selectedCountry,
      sampledAt: Date.now(),
    };
    useEarthStore.getState().setDryEarth({ measureSample: sample });
  }, []);

  useEffect(() => {
    if (!enabled || (!measureMode && !crossSectionMode)) return;

    const el = gl.domElement;
    const onClick = (ev: MouseEvent) => {
      if (ev.button !== 0) return;
      const rect = el.getBoundingClientRect();
      pointer.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(pointer.current, camera);
      const origin = raycaster.current.ray.origin;
      const dir = raycaster.current.ray.direction;
      // Sphere intersect r≈1
      const a = dir.dot(dir);
      const b = 2 * origin.dot(dir);
      const c = origin.dot(origin) - 1;
      const disc = b * b - 4 * a * c;
      if (disc < 0) return;
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t < 0) return;
      hit.current.copy(origin).addScaledVector(dir, t);
      const { lat, lng } = vector3ToLatLng(hit.current);

      if (crossSectionMode) {
        const draft = useEarthStore.getState().dryEarth.profileDraft;
        if (draft.length >= 2) {
          useEarthStore.getState().setDryEarth({
            profileDraft: [{ lat, lng }],
            profile: null,
          });
        } else {
          const next = [...draft, { lat, lng }];
          useEarthStore.getState().setDryEarth({ profileDraft: next });
          if (next.length === 2) {
            void buildProfile(next[0], next[1]);
          }
        }
        return;
      }

      if (measureMode) void sampleAt(lat, lng);
    };

    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [
    enabled,
    measureMode,
    crossSectionMode,
    camera,
    gl,
    sampleAt,
  ]);

  return null;
}

async function buildProfile(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const steps = 48;
  const points: Array<{
    lat: number;
    lng: number;
    elevationM: number;
    distanceM: number;
  }> = [];
  let dist = 0;
  let prev: { lat: number; lng: number } | null = null;
  let highest = -Infinity;
  let lowest = Infinity;
  let sum = 0;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = a.lat + (b.lat - a.lat) * t;
    const lng = a.lng + (b.lng - a.lng) * t;
    let elev = 0;
    try {
      elev = await sampleElevation(lat, lng, 9);
    } catch {
      elev = 0;
    }
    if (prev) {
      const dLat = (lat - prev.lat) * 111_320;
      const dLng =
        (lng - prev.lng) * 111_320 * Math.cos((lat * Math.PI) / 180);
      dist += Math.hypot(dLat, dLng);
    }
    prev = { lat, lng };
    points.push({ lat, lng, elevationM: elev, distanceM: dist });
    highest = Math.max(highest, elev);
    lowest = Math.min(lowest, elev);
    sum += elev;
  }

  const meanSlope =
    dist > 0
      ? (Math.atan(Math.abs(highest - lowest) / dist) * 180) / Math.PI
      : 0;

  useEarthStore.getState().setDryEarth({
    profile: {
      points,
      highestM: highest,
      lowestM: lowest,
      averageM: sum / points.length,
      distanceM: dist,
      meanSlopeDeg: meanSlope,
    },
  });
}
