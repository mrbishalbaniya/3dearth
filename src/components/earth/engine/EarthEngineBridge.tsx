"use client";

/**
 * Bridges R3F frame loop ↔ EarthEngine managers.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { EarthEngine } from "./core/EarthEngine";
import { useEarthStore } from "../store/earthStore";

export function EarthEngineBridge() {
  const engine = EarthEngine.shared;
  const { gl } = useThree();

  useEffect(() => {
    engine.init();
    return () => {
      // Keep singleton alive across remounts; full dispose on app unmount only
    };
  }, [engine]);

  useFrame((_, delta) => {
    if (!engine.isReady) return;
    const s = useEarthStore.getState();
    const info = gl.info;
    engine.render.capture(info);
    engine.performance.tick({
      tilesLoading: s.tilesLoading,
      tilesCached: engine.cache.stats.entries,
      drawCalls: info.render.calls,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      workersBusy: engine.workers.busyCount,
      lod: s.zoomLevel,
      cameraAltitudeM: s.altitudeM,
      cameraHash: `${s.focusLat.toFixed(3)},${s.focusLng.toFixed(3)},${s.altitudeM.toFixed(0)},${s.compassHeading.toFixed(0)}`,
    });
    engine.terrain.warmFocus();
    engine.update(delta);

    if (engine.performance.shouldReduceQuality) {
      // Adaptive quality already handled in FpsTracker; log once in debug
      if (s.debugMode) {
        engine.logger.debug("performance", "low FPS — consider quality drop");
      }
    }
  });

  return null;
}
