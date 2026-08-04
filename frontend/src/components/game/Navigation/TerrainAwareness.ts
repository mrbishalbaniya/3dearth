/**
 * TerrainAwareness — GPWS / EGPWS simulation.
 * Modes 1–6, look-ahead terrain, MSA, Grid MORA, ground proximity alerts.
 * Uses a grid-sampled Nepal digital elevation model for terrain height queries.
 */

import type { TerrainAwarenessState, TerrainAlert, TerrainAlertLevel } from "./NavigationTypes";
import { obstacleDb } from "./ObstacleDatabase";
import { haversineNm } from "./greatCircle";
import { DEG2RAD } from "../Physics/Math/constants";

// ─── Coarse Nepal terrain grid (0.25° cells, metres MSL, SRTM-derived) ────────
// Values represent approximate maximum ridge elevation per cell.
// Grid covers 26.3–30.5°N, 80.0–88.2°E at 0.25° resolution.

type GridKey = string; // "lat.25,lng.25"

const NEPAL_TERRAIN_CELLS: Record<GridKey, number> = {
  // Terai (south) — flat
  "26.25,80.00":  180,  "26.25,80.25":  200,  "26.25,80.50":  185,
  "26.25,80.75":  190,  "26.25,81.00":  175,  "26.25,81.25":  180,
  "26.25,81.50":  170,  "26.25,81.75":  165,  "26.25,82.00":  155,
  "26.25,82.25":  150,  "26.25,83.00":  160,  "26.25,83.50":  175,
  "26.25,84.00":  155,  "26.25,84.50":  145,  "26.25,85.00":  140,
  "26.25,85.50":  145,  "26.25,86.00":  120,  "26.25,86.50":  100,
  "26.25,87.00":   90,  "26.25,87.25":   75,  "26.25,87.50":   85,
  // Hills (Siwalik/Churia)
  "26.75,80.00":  500,  "26.75,80.50":  600,  "26.75,81.00":  700,
  "26.75,81.50":  800,  "26.75,82.00":  900,  "26.75,82.50": 1000,
  "26.75,83.00": 1200,  "26.75,83.50": 1000,  "26.75,84.00":  900,
  "26.75,84.50":  850,  "26.75,85.00":  800,  "26.75,85.50":  700,
  "26.75,86.00":  600,  "26.75,86.50":  500,  "26.75,87.00":  450,
  // Mid-hills
  "27.25,80.00": 1200,  "27.25,80.50": 1500,  "27.25,81.00": 1800,
  "27.25,82.00": 2200,  "27.25,82.50": 2000,  "27.25,83.00": 1800,
  "27.25,83.50": 1600,  "27.25,84.00": 1500,  "27.25,84.50": 1600,
  "27.25,85.00": 1400,  "27.25,85.50": 1600,  "27.25,86.00": 2000,
  "27.25,86.50": 2500,  "27.25,87.00": 2800,
  // Kathmandu Valley area
  "27.50,84.75": 1500,  "27.50,85.00": 1700,  "27.50,85.25": 1400,
  "27.50,85.50": 2100,  "27.50,85.75": 2400,  "27.50,86.00": 2800,
  "27.75,85.10": 2200,  "27.75,85.30": 1600,  "27.75,85.60": 2600,
  // High Himalaya south wall
  "27.75,80.00": 3000,  "27.75,80.50": 3500,  "27.75,81.00": 4000,
  "27.75,81.50": 4200,  "27.75,82.00": 4500,  "27.75,82.50": 5000,
  "27.75,83.00": 5500,  "27.75,83.50": 6000,  "27.75,84.00": 5800,
  "27.75,84.50": 5500,  "27.75,85.00": 5200,  "27.75,85.50": 5800,
  "27.75,86.00": 6200,  "27.75,86.50": 6800,  "27.75,87.00": 7000,
  "27.75,87.50": 6500,  "27.75,88.00": 6800,
  // Main Himalayan range
  "28.25,80.50": 5500,  "28.25,81.00": 6000,  "28.25,81.50": 6200,
  "28.25,82.00": 6500,  "28.25,83.00": 7200,  "28.25,83.50": 8167,
  "28.25,84.00": 7800,  "28.25,84.50": 7600,  "28.25,85.00": 7200,
  "28.25,85.50": 7000,  "28.25,86.00": 7200,  "28.25,86.50": 8188,
  "28.25,87.00": 8516,  "28.25,87.50": 8586,
  // Everest region
  "27.75,86.75": 8848, "28.00,86.75": 8516,  "28.00,87.00": 8485,
  // Trans-Himalaya (north)
  "28.75,80.00": 4200,  "28.75,81.00": 4800,  "28.75,82.00": 5000,
  "28.75,83.00": 5200,  "28.75,84.00": 5500,  "28.75,85.00": 5800,
  "28.75,86.00": 5500,  "28.75,87.00": 5200,
  "29.25,80.50": 3500,  "29.25,81.50": 3800,  "29.25,82.50": 4200,
  "29.25,83.50": 4500,  "29.25,84.50": 4800,  "29.25,85.50": 5000,
  "29.75,81.00": 3000,  "29.75,82.00": 3500,  "29.75,83.00": 4000,
  "29.75,84.00": 4500,  "29.75,85.00": 4800,
  "30.25,80.50": 2500,  "30.25,81.50": 3000,  "30.25,82.50": 3500,
  "30.25,83.50": 4000,  "30.25,84.50": 4500,  "30.25,85.50": 4800,
};

// ─── TerrainAwareness ─────────────────────────────────────────────────────────

export class TerrainAwareness {
  private static instance: TerrainAwareness | null = null;
  private state: TerrainAwarenessState = this.defaultState();
  private alertHistory: TerrainAlert[] = [];
  private lastAltM = 0;
  private prevVsMs = 0;

  private constructor() {}

  public static getInstance(): TerrainAwareness {
    if (!TerrainAwareness.instance) TerrainAwareness.instance = new TerrainAwareness();
    return TerrainAwareness.instance;
  }

  // ── Per-frame update ──────────────────────────────────────────────────────────

  public update(
    lat: number, lng: number, altM: number,
    vsMs: number, speedMs: number,
    gearDown: boolean, flaps: number,
    dt: number,
  ): TerrainAwarenessState {
    const terrainM = this.getTerrainElevation(lat, lng);
    const aglM = altM - terrainM;
    const msaM = this.computeMSA(lat, lng);
    const gridMoraM = this.getGridMORA(lat, lng);

    // Look-ahead: project position forward 30s
    const lookAheadNm = this.computeLookAhead(lat, lng, altM, speedMs);

    const alert = this.evaluateGPWS(
      aglM, vsMs, speedMs, gearDown, flaps, altM, msaM,
    );

    if (alert.level !== "NONE" && alert.level !== this.state.alert.level) {
      this.alertHistory.push({ ...alert, audioTrigger: alert.audioTrigger + "_" + Date.now() });
      if (this.alertHistory.length > 20) this.alertHistory.shift();
    }

    this.lastAltM = altM;
    this.prevVsMs = vsMs;
    void dt;

    this.state = { alert, terrainElevationM: terrainM, aglM, msaM, lookAheadClearNm: lookAheadNm, gridMoraM };
    return this.state;
  }

  // ── GPWS modes ────────────────────────────────────────────────────────────────

  private evaluateGPWS(
    aglM: number, vsMs: number, speedMs: number,
    gearDown: boolean, flaps: number, altM: number, msaM: number,
  ): TerrainAlert {
    // Mode 1 — excessive sink rate
    if (aglM < 600 && vsMs < -10) {
      const severity = vsMs < -15 ? "PULL_UP" : "WARNING";
      return { level: severity, mode: 1, message: "SINK RATE", audioTrigger: "SINK_RATE" };
    }

    // Mode 2 — excessive terrain closure rate
    if (aglM < 800 && vsMs < -7 && speedMs > 50) {
      return { level: "WARNING", mode: 2, message: "TERRAIN TERRAIN", audioTrigger: "TERRAIN_TERRAIN" };
    }

    // Mode 3 — altitude loss after takeoff / go-around
    if (!gearDown && aglM < 300 && vsMs < -3 && altM < this.lastAltM - 20) {
      return { level: "WARNING", mode: 3, message: "DON'T SINK", audioTrigger: "DONT_SINK" };
    }

    // Mode 4a — too low, gear not down
    if (aglM < 200 && !gearDown && speedMs < 80) {
      return { level: "CAUTION", mode: 4, message: "TOO LOW GEAR", audioTrigger: "TOO_LOW_GEAR" };
    }

    // Mode 4b — too low, flaps not set
    if (aglM < 200 && flaps < 0.3 && speedMs < 80) {
      return { level: "CAUTION", mode: 4, message: "TOO LOW FLAPS", audioTrigger: "TOO_LOW_FLAPS" };
    }

    // Mode 5 — below glideslope
    if (aglM < 300 && vsMs < -2 && aglM > 50) {
      return { level: "CAUTION", mode: 5, message: "GLIDESLOPE", audioTrigger: "GLIDESLOPE" };
    }

    // Mode 6 — advisory altitudes (500 ft AGL callout)
    if (aglM < 160 && aglM > 145) {
      return { level: "CAUTION", mode: 6, message: "FIVE HUNDRED", audioTrigger: "FIVE_HUNDRED" };
    }

    // EGPWS terrain-ahead alert
    if (altM < msaM - 100) {
      return { level: "WARNING", mode: 7, message: "TERRAIN AHEAD PULL UP", audioTrigger: "PULL_UP" };
    }

    if (altM < msaM + 300) {
      return { level: "CAUTION", mode: 7, message: "TERRAIN AHEAD", audioTrigger: "TERRAIN_AHEAD" };
    }

    return { level: "NONE", mode: 0, message: "", audioTrigger: "" };
  }

  // ── Terrain elevation lookup ──────────────────────────────────────────────────

  public getTerrainElevation(lat: number, lng: number): number {
    const CELL = 0.25;
    const clat = Math.floor(lat / CELL) * CELL;
    const clng = Math.floor(lng / CELL) * CELL;
    const key = `${clat.toFixed(2)},${clng.toFixed(2)}`;
    return NEPAL_TERRAIN_CELLS[key] ?? 200; // default Terai
  }

  /** Compute MSA from terrain + obstacles within 25 nm. */
  public computeMSA(lat: number, lng: number): number {
    // Terrain MSA from grid
    let maxTerrain = 0;
    for (let dLat = -0.5; dLat <= 0.5; dLat += 0.25) {
      for (let dLng = -0.5; dLng <= 0.5; dLng += 0.25) {
        maxTerrain = Math.max(maxTerrain, this.getTerrainElevation(lat + dLat, lng + dLng));
      }
    }
    // Obstacle MSA
    const obsMin = obstacleDb.minimumSafeAltitude(lat, lng, 25, 300);
    return Math.max(maxTerrain + 300, obsMin);
  }

  // ── Look-ahead terrain prediction ────────────────────────────────────────────

  private computeLookAhead(
    lat: number, lng: number, altM: number, speedMs: number,
  ): number {
    if (speedMs < 5) return 99;
    const lookAheadSec = 30;
    const lookAheadM = speedMs * lookAheadSec;
    const stepsNm = lookAheadM / 1852 / 5; // check every 0.2 nm
    let clearNm = lookAheadM / 1852;

    for (let i = 1; i <= 5; i++) {
      const frac = i / 5;
      const stepLat = lat + (frac * lookAheadM / 111320);
      const terrainM = this.getTerrainElevation(stepLat, lng);
      if (altM - terrainM < 300) {
        clearNm = Math.min(clearNm, haversineNm(lat, lng, stepLat, lng));
        break;
      }
    }
    void stepsNm;
    return clearNm;
  }

  // ── Grid MORA lookup ─────────────────────────────────────────────────────────

  private getGridMORA(lat: number, lng: number): number {
    return this.computeMSA(lat, lng) + 300;
  }

  // ── Accessors ─────────────────────────────────────────────────────────────────

  public getState(): TerrainAwarenessState { return this.state; }
  public getAlertHistory(): TerrainAlert[] { return [...this.alertHistory]; }
  public isAlertActive(): boolean { return this.state.alert.level !== "NONE"; }
  public getAGL(): number { return this.state.aglM; }
  public getMSA(): number { return this.state.msaM; }

  private defaultState(): TerrainAwarenessState {
    return {
      alert: { level: "NONE", mode: 0, message: "", audioTrigger: "" },
      terrainElevationM: 0, aglM: 0, msaM: 0,
      lookAheadClearNm: 99, gridMoraM: 0,
    };
  }
}

export const terrainAwareness = TerrainAwareness.getInstance();
