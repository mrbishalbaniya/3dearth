"use client";

/**
 * Developer diagnostics overlay — toggle via debugMode in store.
 */
import { useEffect, useState } from "react";
import { useEarthStore } from "../../store/earthStore";
import { EarthEngine } from "../core/EarthEngine";
import type { PerformanceSample } from "../core/types";

export function DebugOverlay() {
  const debugMode = useEarthStore((s) => s.debugMode);
  const [sample, setSample] = useState<PerformanceSample | null>(null);
  const engine = EarthEngine.shared;

  useEffect(() => {
    if (!debugMode) return;
    return engine.events.on("perf:sample", (s) => setSample({ ...s }));
  }, [debugMode, engine]);

  if (!debugMode) return null;

  const cache = engine.cache.stats;
  const cam = engine.camera.telemetry;

  return (
    <div className="earth-debug" role="status" aria-label="Engine diagnostics">
      <div className="earth-debug__title">Earth Engine · Debug</div>
      <dl className="earth-debug__grid">
        <dt>FPS</dt>
        <dd>{sample?.fps ?? "—"}</dd>
        <dt>Frame</dt>
        <dd>{sample ? `${sample.frameMs.toFixed(1)} ms` : "—"}</dd>
        <dt>Draw calls</dt>
        <dd>{sample?.drawCalls ?? "—"}</dd>
        <dt>Geometries</dt>
        <dd>{sample?.geometries ?? "—"}</dd>
        <dt>Textures</dt>
        <dd>{sample?.textures ?? "—"}</dd>
        <dt>Tiles loading</dt>
        <dd>{sample?.tilesLoading ?? "—"}</dd>
        <dt>Cache entries</dt>
        <dd>
          {cache.entries} · {(cache.usedBytes / 1024).toFixed(0)} KB
        </dd>
        <dt>Workers busy</dt>
        <dd>{sample?.workersBusy ?? 0}</dd>
        <dt>LOD</dt>
        <dd>L{sample?.lod ?? cam.zoomLevel}</dd>
        <dt>Altitude</dt>
        <dd>{Math.round(cam.altitudeM).toLocaleString()} m</dd>
        <dt>Focus</dt>
        <dd>
          {cam.lat.toFixed(3)}, {cam.lng.toFixed(3)}
        </dd>
        <dt>Camera mode</dt>
        <dd>{cam.mode}</dd>
        <dt>Plugins</dt>
        <dd>{engine.plugins.list().length}</dd>
        <dt>Engine</dt>
        <dd>v{engine.version}</dd>
      </dl>
    </div>
  );
}
