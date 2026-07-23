"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, Vector3 } from "three";
import {
  AMBIENT_INTENSITY,
  MORNING_COLOR,
  SUN_INTENSITY,
  SUNSET_COLOR,
} from "../utils/constants";
import { getSunDirection } from "../utils/geo";
import { useEarthStore } from "../store/earthStore";

export interface SunState {
  direction: Vector3;
  color: Color;
  intensity: number;
  ambient: number;
}

/**
 * Real UTC sun position with optional manual time offset for day/night demo.
 */
export function useSunPosition(): SunState {
  const useRealSun = useEarthStore((s) => s.useRealSun);
  const sunTimeOffsetHours = useEarthStore((s) => s.sunTimeOffsetHours);
  const dayNight = useEarthStore((s) => s.layers.dayNight);

  const direction = useMemo(() => new Vector3(1, 0.35, 0.2).normalize(), []);
  const color = useMemo(() => new Color("#fff5e6"), []);
  const stateRef = useRef<SunState>({
    direction,
    color,
    intensity: SUN_INTENSITY,
    ambient: AMBIENT_INTENSITY,
  });

  useFrame(({ clock }) => {
    if (!dayNight) {
      direction.set(1, 0.6, 0.3).normalize();
      color.set("#ffffff");
      stateRef.current.intensity = SUN_INTENSITY * 0.9;
      stateRef.current.ambient = 0.35;
      return;
    }

    // Elevation + seasonal axial tilt approximation
    const dayOfYear =
      (Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) -
        Date.UTC(new Date().getFullYear(), 0, 0)) /
      86400000;
    const seasonTilt = Math.sin(((dayOfYear - 80) / 365) * Math.PI * 2) * 0.22;

    if (useRealSun) {
      const date = new Date(Date.now() + sunTimeOffsetHours * 3600_000);
      getSunDirection(date, direction);
    } else {
      const t = clock.elapsedTime * 0.04 + sunTimeOffsetHours * 0.26;
      direction
        .set(Math.cos(t), 0.22 + seasonTilt + Math.sin(t * 0.35) * 0.18, Math.sin(t))
        .normalize();
    }

    // Elevation-based color: low sun → warm, high sun → white
    const elevation = direction.y;
    if (elevation < 0.12) {
      color.set(SUNSET_COLOR).lerp(new Color(MORNING_COLOR), Math.max(0, elevation + 0.25));
      stateRef.current.intensity = SUN_INTENSITY * (0.5 + Math.max(0, elevation) * 2.4);
      stateRef.current.ambient = 0.04;
    } else if (elevation < 0.35) {
      color.set("#ffe8c8");
      stateRef.current.intensity = SUN_INTENSITY * 0.95;
      stateRef.current.ambient = AMBIENT_INTENSITY * 0.85;
    } else {
      color.set("#fff8ee");
      stateRef.current.intensity = SUN_INTENSITY;
      stateRef.current.ambient = AMBIENT_INTENSITY;
    }
  });

  return stateRef.current;
}
