/**
 * CorridorStreamer — background prefetch of imagery + DEM along the flight plan.
 * Non-blocking: low-priority scheduler jobs; never stalls the render loop.
 *
 * Priority order (via LodTile.priority):
 * 1. Aircraft  2. Route ahead  3. Destination  4. Alternate  5. Departure
 */
import { useGameStore } from "../../game/store/gameStore";
import { getAirport } from "../../game/Services/AirportService";
import { haversineNm } from "../../game/Navigation/greatCircle";
import { useEarthStore } from "../store/earthStore";
import {
  buildTileUrl,
  hasCachedTexture,
  loadTileImage,
  SATELLITE_TILE_URL,
  STREET_TILE_URL,
} from "../gis/TileLoader";
import { imageryScheduler, demScheduler } from "./TileScheduler";
import { warmElevation } from "./ElevationService";
import { StreamPerf } from "../performance/StreamPerf";
import {
  adaptiveBufferKm,
  buildCorridorSamples,
  corridorCenterline,
  corridorSamplesToTiles,
  DEFAULT_CORRIDOR_CONFIG,
  type CorridorConfig,
  type CorridorSnapshot,
  type LatLng,
} from "./FlightCorridor";

export const CORRIDOR_JOB_PREFIX = "cr:";

class CorridorStreamerImpl {
  private config: CorridorConfig = { ...DEFAULT_CORRIDOR_CONFIG };
  private keepIds = new Set<string>();
  private lastTick = 0;
  private snapshot: CorridorSnapshot = {
    active: false,
    bufferKm: DEFAULT_CORRIDOR_CONFIG.bufferKm,
    samples: [],
    centerline: [],
    remainingNm: 0,
    aheadNm: 0,
  };
  private prefetched = 0;
  private failed = 0;

  getKeepIds(): Set<string> {
    return this.keepIds;
  }

  getSnapshot(): CorridorSnapshot {
    return this.snapshot;
  }

  getStats() {
    return {
      active: this.snapshot.active,
      bufferKm: this.snapshot.bufferKm,
      samples: this.snapshot.samples.length,
      keepJobs: this.keepIds.size,
      prefetched: this.prefetched,
      failed: this.failed,
      remainingNm: this.snapshot.remainingNm,
    };
  }

  setBufferKm(km: number) {
    this.config.bufferKm = Math.max(10, Math.min(200, km));
  }

  getBufferKm() {
    return this.config.bufferKm;
  }

  /** Call from EarthEngineBridge ~2–5 Hz. */
  tick(now = performance.now()) {
    if (now - this.lastTick < 400) return;
    this.lastTick = now;

    const game = useGameStore.getState();
    if (game.mode !== "flight" || !game.flightState) {
      if (this.keepIds.size) {
        imageryScheduler.cancelPrefixExcept(CORRIDOR_JOB_PREFIX, new Set(), true);
        this.keepIds.clear();
      }
      this.snapshot = {
        active: false,
        bufferKm: this.config.bufferKm,
        samples: [],
        centerline: [],
        remainingNm: 0,
        aheadNm: 0,
      };
      StreamPerf.patch({
        corridorActive: false,
        corridorBufferKm: this.config.bufferKm,
        corridorSamples: 0,
        corridorPrefetched: this.prefetched,
        corridorJobs: 0,
      });
      return;
    }

    const fs = game.flightState;
    const route = game.route;
    const earth = useEarthStore.getState();
    const street = earth.baseMapMode === "standard";
    const template = street ? STREET_TILE_URL : SATELLITE_TILE_URL;
    const prefix = street ? "st" : "sat";

    const dest = route.destIcao != null ? getAirport(route.destIcao) : null;
    const depIcao = route.departureIcao ?? game.spawnAirportIcao;
    const departure = depIcao ? getAirport(depIcao) : null;
    const alternate =
      route.alternateIcao != null ? getAirport(route.alternateIcao) : null;

    const bufferKm = adaptiveBufferKm({
      baseKm: route.corridorBufferKm ?? this.config.bufferKm,
      groundSpeedMs: fs.groundSpeedMs,
      altitudeM: fs.altM,
      cameraAltitudeM: earth.altitudeM,
    });
    if (route.corridorBufferKm != null) {
      this.config.bufferKm = route.corridorBufferKm;
    }

    const aircraft: LatLng = { lat: fs.lat, lng: fs.lng };
    const samples = buildCorridorSamples({
      aircraft,
      waypoints: route.waypoints,
      bufferKm,
      destination: dest,
      alternate,
      departure,
      maxAlong: 20,
    });

    const centerline = corridorCenterline(aircraft, route.waypoints, dest);
    const remainingNm =
      dest != null
        ? haversineNm(fs.lat, fs.lng, dest.lat, dest.lng)
        : route.distanceNm;

    this.snapshot = {
      active: true,
      bufferKm,
      samples,
      centerline,
      remainingNm,
      aheadNm: remainingNm,
    };

    const tiles = corridorSamplesToTiles(samples, fs.altM, 36);
    const nextKeep = new Set<string>();

    let enqueued = 0;
    for (const t of tiles) {
      const cacheKey = `${prefix}:${t.key}`;
      const jobId = `${CORRIDOR_JOB_PREFIX}${cacheKey}`;
      nextKeep.add(jobId);
      if (hasCachedTexture(cacheKey)) continue;
      if (enqueued >= 6) continue;
      enqueued += 1;
      void imageryScheduler
        .enqueue(jobId, Math.max(5, Math.min(85, t.priority)), (signal) =>
          loadTileImage(buildTileUrl(template, t.z, t.x, t.y), cacheKey, {
            signal,
          }).catch(async (err) => {
            if (signal.aborted) throw err;
            await new Promise((r) => setTimeout(r, 250));
            if (signal.aborted) throw err;
            return loadTileImage(
              buildTileUrl(template, t.z, t.x, t.y),
              cacheKey,
              { signal },
            );
          }),
        )
        .then(() => {
          this.prefetched += 1;
        })
        .catch(() => {
          this.failed += 1;
        });
    }

    imageryScheduler.cancelPrefixExcept(CORRIDOR_JOB_PREFIX, nextKeep, false);
    this.keepIds = nextKeep;

    const warmPts: LatLng[] = [
      aircraft,
      ...samples
        .filter((s) => s.kind === "route")
        .slice(0, 4)
        .map((s) => ({ lat: s.lat, lng: s.lng })),
    ];
    if (dest) warmPts.push(dest);
    if (alternate) warmPts.push(alternate);
    if (departure) warmPts.push(departure);
    for (const p of warmPts) {
      warmElevation(p.lat, p.lng, 10);
    }

    if (dest) {
      const demJob = `${CORRIDOR_JOB_PREFIX}dem:${dest.icao}`;
      nextKeep.add(demJob);
      void demScheduler
        .enqueue(demJob, 30, async () => {
          warmElevation(dest.lat, dest.lng, 11);
          return true;
        })
        .catch(() => undefined);
    }

    StreamPerf.patch({
      corridorActive: true,
      corridorBufferKm: Math.round(bufferKm),
      corridorSamples: samples.length,
      corridorPrefetched: this.prefetched,
      corridorFailed: this.failed,
      corridorRemainingNm: Math.round(remainingNm * 10) / 10,
      corridorJobs: this.keepIds.size,
    });
  }
}

export const CorridorStreamer = new CorridorStreamerImpl();
