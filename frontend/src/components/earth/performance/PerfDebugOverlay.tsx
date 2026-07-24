"use client";

/**
 * Developer performance overlay — toggle with Ctrl+Shift+P or debug mode.
 */
import { useEffect, useState } from "react";
import { EarthEngine } from "../engine/core/EarthEngine";
import { StreamPerf } from "../performance/StreamPerf";
import {
  demScheduler,
  imageryScheduler,
  vectorScheduler,
} from "../streaming/TileScheduler";
import { getTileCacheStats, hasCachedTexture } from "../gis/TileLoader";
import { demCacheStats } from "../cache/DemGridCache";
import { useEarthStore } from "../store/earthStore";

export function PerfDebugOverlay() {
  const debug = useEarthStore((s) => s.debugMode);
  const [forced, setForced] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyP") {
        e.preventDefault();
        setForced((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!debug && !forced) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [debug, forced]);

  if (!debug && !forced) return null;

  const sample = EarthEngine.shared.performance.sample;
  const img = imageryScheduler.stats;
  const dem = demScheduler.stats;
  const vec = vectorScheduler.stats;
  const gpu = getTileCacheStats();
  const elev = demCacheStats();
  const stream = StreamPerf.get();

  const visible = stream.imageryVisible || stream.imageryKeys.length;
  let imageryLoaded = 0;
  for (const key of stream.imageryKeys) {
    if (hasCachedTexture(key)) imageryLoaded += 1;
  }
  const pending = img.queued + img.running;

  StreamPerf.patch({
    fps: sample.fps,
    frameMs: sample.frameMs,
    drawCalls: sample.drawCalls,
    geometries: sample.geometries,
    textures: sample.textures,
    tilesLoading: sample.tilesLoading,
    imageryQueue: img.queued,
    imageryRunning: img.running,
    demQueue: dem.queued,
    demRunning: dem.running,
    vectorQueue: vec.queued,
    altitudeM: sample.cameraAltitudeM,
    lod: sample.lod,
    tilesCachedGpu: gpu.entries,
    imageryVisible: visible,
    imageryLoaded,
    imageryPending: pending,
  });

  void tick;

  const row = (label: string, value: string | number) => (
    <div className="perf-debug__row" key={label}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );

  return (
    <aside className="perf-debug" aria-label="Performance debug">
      <header>
        <strong>PERF</strong>
        <em>Ctrl+Shift+P</em>
      </header>
      {row("FPS", sample.fps)}
      {row("Frame", `${sample.frameMs.toFixed(1)} ms`)}
      {row("Draw calls", sample.drawCalls)}
      {row("Geometries", sample.geometries)}
      {row("GPU textures", sample.textures)}
      {row("Img visible", visible)}
      {row("Img loaded", imageryLoaded)}
      {row("Img pending", pending)}
      {row("Img cached", gpu.entries)}
      {row(
        "Corridor",
        stream.corridorActive
          ? `${stream.corridorBufferKm} km · ${stream.corridorJobs} jobs`
          : "off",
      )}
      {row("Corr. samples", stream.corridorSamples)}
      {row("Corr. prefetch", stream.corridorPrefetched)}
      {row("Corr. remain", `${stream.corridorRemainingNm} nm`)}
      {row("Img Q/Run", `${img.queued} / ${img.running}`)}
      {row("DEM Q/Run", `${dem.queued} / ${dem.running}`)}
      {row("Vec Q", vec.queued)}
      {row("Tex LRU", `${gpu.entries} (refs ${gpu.refs})`)}
      {row("DEM grids", elev.entries)}
      {row("IDB tiles", stream.tilesCachedIdb)}
      {row("Load p50/p95", `${stream.tileLoadMsP50}/${stream.tileLoadMsP95} ms`)}
      {row("Cache hit/miss", `${stream.cacheHits}/${stream.cacheMisses}`)}
      {row("IDB hits", stream.idbHits)}
      {row("Network", stream.networkFetches)}
      {row("Aborted", stream.abortedLoads)}
      {row("LOD / Alt", `${sample.lod} / ${Math.round(sample.cameraAltitudeM)} m`)}
    </aside>
  );
}
