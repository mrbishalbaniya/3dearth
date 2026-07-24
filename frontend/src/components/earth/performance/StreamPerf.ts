/**
 * Streaming performance counters — updated without React re-renders.
 * PerfDebugOverlay polls this at ~4 Hz.
 */

export interface StreamPerfSnapshot {
  fps: number;
  frameMs: number;
  drawCalls: number;
  geometries: number;
  textures: number;
  tilesLoading: number;
  tilesCachedGpu: number;
  tilesCachedIdb: number;
  imageryQueue: number;
  imageryRunning: number;
  demQueue: number;
  demRunning: number;
  vectorQueue: number;
  tileLoadMsP50: number;
  tileLoadMsP95: number;
  abortedLoads: number;
  cacheHits: number;
  cacheMisses: number;
  idbHits: number;
  networkFetches: number;
  warmFocusCalls: number;
  altitudeM: number;
  lod: number;
  /** Satellite/street tiles currently selected for the viewport. */
  imageryVisible: number;
  /** Of those, how many have a GPU texture ready. */
  imageryLoaded: number;
  /** Scheduler queued + running imagery jobs. */
  imageryPending: number;
  /** Cache keys of the current imagery selection (for overlay recount). */
  imageryKeys: string[];
  /** Flight corridor streaming */
  corridorActive: boolean;
  corridorBufferKm: number;
  corridorSamples: number;
  corridorPrefetched: number;
  corridorFailed: number;
  corridorRemainingNm: number;
  corridorJobs: number;
}

const loadSamples: number[] = [];
const MAX_SAMPLES = 80;

let snap: StreamPerfSnapshot = {
  fps: 0,
  frameMs: 16,
  drawCalls: 0,
  geometries: 0,
  textures: 0,
  tilesLoading: 0,
  tilesCachedGpu: 0,
  tilesCachedIdb: 0,
  imageryQueue: 0,
  imageryRunning: 0,
  demQueue: 0,
  demRunning: 0,
  vectorQueue: 0,
  tileLoadMsP50: 0,
  tileLoadMsP95: 0,
  abortedLoads: 0,
  cacheHits: 0,
  cacheMisses: 0,
  idbHits: 0,
  networkFetches: 0,
  warmFocusCalls: 0,
  altitudeM: 0,
  lod: 0,
  imageryVisible: 0,
  imageryLoaded: 0,
  imageryPending: 0,
  imageryKeys: [],
  corridorActive: false,
  corridorBufferKm: 50,
  corridorSamples: 0,
  corridorPrefetched: 0,
  corridorFailed: 0,
  corridorRemainingNm: 0,
  corridorJobs: 0,
};

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

export const StreamPerf = {
  get(): StreamPerfSnapshot {
    return snap;
  },

  patch(partial: Partial<StreamPerfSnapshot>) {
    Object.assign(snap, partial);
  },

  recordLoadMs(ms: number) {
    loadSamples.push(ms);
    if (loadSamples.length > MAX_SAMPLES) loadSamples.shift();
    const sorted = [...loadSamples].sort((a, b) => a - b);
    snap.tileLoadMsP50 = Math.round(percentile(sorted, 50));
    snap.tileLoadMsP95 = Math.round(percentile(sorted, 95));
  },

  hitCache() {
    snap.cacheHits += 1;
  },
  missCache() {
    snap.cacheMisses += 1;
  },
  hitIdb() {
    snap.idbHits += 1;
  },
  network() {
    snap.networkFetches += 1;
  },
  abort() {
    snap.abortedLoads += 1;
  },
  warm() {
    snap.warmFocusCalls += 1;
  },
};
