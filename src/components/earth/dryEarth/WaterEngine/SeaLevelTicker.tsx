"use client";

import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useEarthStore } from "../../store/earthStore";
import { SEA_LEVEL_LERP } from "../constants";

/**
 * Smoothly animates displaySeaLevelM → targetSeaLevelM.
 * Mount once inside the R3F canvas (DryEarthSystem).
 */
export function SeaLevelTicker() {
  const enabled = useEarthStore((s) => s.dryEarth.enabled);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);

  useFrame((_, delta) => {
    const state = useEarthStore.getState().dryEarth;
    if (!enabled && Math.abs(state.displaySeaLevelM - 0) < 0.5) {
      if (state.displaySeaLevelM !== 0) {
        useEarthStore.getState().setDryEarth({ displaySeaLevelM: 0 });
      }
      return;
    }
    const target = enabled ? state.targetSeaLevelM : 0;
    const cur = state.displaySeaLevelM;
    const k = reducedMotion ? 12 : SEA_LEVEL_LERP;
    const next = cur + (target - cur) * Math.min(1, delta * k);
    if (Math.abs(next - cur) > 0.05) {
      useEarthStore.getState().setDryEarth({ displaySeaLevelM: next });
    } else if (Math.abs(next - target) > 0.01) {
      useEarthStore.getState().setDryEarth({ displaySeaLevelM: target });
    }
  });

  useEffect(() => {
    // When enabling Dry Earth first time, nudge toward dry if still at 0 and user expects drain
  }, []);

  return null;
}
