"use client";

import { useEffect, useState } from "react";
import { StreamingDebugPanel } from "./StreamingDebugPanel";
import type { FlightCorridor, StreamingState } from "./FlightCorridorEngine";

/**
 * Wrapper component that fetches streaming state and passes to debug panel
 * Press F3 to toggle visibility
 */
export function StreamingDebugWrapper() {
  const [corridor, setCorridor] = useState<FlightCorridor | null>(null);
  const [state, setState] = useState<StreamingState>({
    loadedTiles: new Set(),
    queuedTiles: new Set(),
    cachedTiles: new Map(),
    memoryUsageMB: 0,
    maxMemoryMB: 512,
    loadQueue: [],
    unloadQueue: [],
  });
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.6);

  // Update streaming state every frame
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let lastFrameTime = performance.now();

    const update = () => {
      const now = performance.now();
      const delta = now - lastFrameTime;
      lastFrameTime = now;
      
      setFrameTime(delta);
      frameCount++;
      
      // Update FPS every second
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }

      // Try to get streaming state from global refs
      // (Set by FlightCorridorTerrain component)
      try {
        const { engine } = getGlobalStreamingState();
        
        if (engine) {
          const newCorridor = engine.getCorridor();
          const newState = engine.getState();
          
          setCorridor(newCorridor);
          setState(newState);
        }
      } catch (err) {
        // Global refs not yet available
      }

      requestAnimationFrame(update);
    };

    const rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <StreamingDebugPanel
      corridor={corridor}
      state={state}
      fps={fps}
      frameTimeMs={frameTime}
    />
  );
}

/**
 * Access global streaming state (set by FlightCorridorTerrain)
 */
function getGlobalStreamingState(): {
  engine: any | null;
  manager: any | null;
} {
  if (typeof window !== "undefined" && (window as any).__flightCorridor) {
    return (window as any).__flightCorridor;
  }
  return { engine: null, manager: null };
}
