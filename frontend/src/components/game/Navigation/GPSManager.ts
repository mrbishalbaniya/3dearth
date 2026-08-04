/**
 * GPSManager — Simulated GPS receiver with WAAS, RAIM integrity,
 * position noise modelling, satellite geometry, and fix quality.
 */

import type { GPSPosition, GPSConfig } from "./NavigationTypes";
import { EARTH_RADIUS_M, DEG2RAD, RAD2DEG } from "../Physics/Math/constants";

// ─── Satellite constellation (simplified 24 GPS + 4 WAAS) ────────────────────

interface SimSatellite {
  prn: number;
  azDeg: number;   // azimuth at ground
  elDeg: number;   // elevation above horizon
  snr: number;     // signal-to-noise ratio dB
  used: boolean;
}

const NEPAL_SAT_COUNT_TYPICAL = 10; // visible satellites over Nepal

// ─── GPSManager ───────────────────────────────────────────────────────────────

export class GPSManager {
  private static instance: GPSManager | null = null;

  private config: GPSConfig = {
    waasEnabled: true,
    updateRateHz: 5,
    antennaNoise: 1.5,   // metres 1-sigma
  };

  private position: GPSPosition = this.defaultFix();
  private satellites: SimSatellite[] = [];
  private lastUpdateMs = 0;
  private updateIntervalMs = 1000 / 5;

  private fixLostTimer = 0;
  private signalDegradation = 0; // 0 = perfect, 1 = no signal

  private constructor() {
    this.generateSatellites();
  }

  public static getInstance(): GPSManager {
    if (!GPSManager.instance) GPSManager.instance = new GPSManager();
    return GPSManager.instance;
  }

  // ── Per-frame update ──────────────────────────────────────────────────────────

  public update(
    trueLat: number,
    trueLng: number,
    trueAltM: number,
    trueTrackDeg: number,
    trueSpeedMs: number,
    dt: number,
  ): GPSPosition {
    const now = performance.now();
    if (now - this.lastUpdateMs < this.updateIntervalMs) return this.position;
    this.lastUpdateMs = now;

    // Slowly update satellite geometry
    this.updateSatellites(trueLat, trueLng, dt);

    const usedSats = this.satellites.filter((s) => s.used);
    const satCount = usedSats.length;

    if (satCount < 4 || this.signalDegradation > 0.95) {
      this.fixLostTimer += dt;
      this.position = { ...this.position, fixType: "none", satellites: satCount, accuracyM: 999 };
      return this.position;
    }
    this.fixLostTimer = 0;

    // DOP model from satellite spread
    const hdop = this.computeHDOP(usedSats);
    const vdop = hdop * 1.3;

    // Noise magnitude (WAAS halves it)
    const noiseScale = this.config.waasEnabled ? 0.5 : 1.0;
    const hNoiseM = hdop * this.config.antennaNoise * noiseScale;
    const vNoiseM = vdop * this.config.antennaNoise * noiseScale;

    // Gaussian noise
    const noiseLat = this.gaussianNoise(hNoiseM) / EARTH_RADIUS_M * RAD2DEG;
    const noiseLng = this.gaussianNoise(hNoiseM) / (EARTH_RADIUS_M * Math.cos(trueLat * DEG2RAD)) * RAD2DEG;
    const noiseAlt = this.gaussianNoise(vNoiseM);

    const accuracyM = Math.sqrt(hNoiseM * hNoiseM * 4); // 2-sigma horizontal

    const fixType: GPSPosition["fixType"] =
      this.config.waasEnabled && satCount >= 6 ? "waas"
      : satCount >= 5 ? "3d"
      : satCount >= 4 ? "2d"
      : "none";

    this.position = {
      lat: trueLat + noiseLat,
      lng: trueLng + noiseLng,
      altM: trueAltM + noiseAlt,
      hdop,
      vdop,
      satellites: satCount,
      fixType,
      accuracyM,
      velocityMs: trueSpeedMs,
      trackDeg: trueTrackDeg,
      timestamp: Date.now(),
    };

    return this.position;
  }

  // ── Getters ───────────────────────────────────────────────────────────────────

  public getPosition(): GPSPosition { return this.position; }
  public getSatellites(): SimSatellite[] { return [...this.satellites]; }
  public getHDOP(): number { return this.position.hdop; }
  public hasWAAS(): boolean { return this.config.waasEnabled && this.position.fixType === "waas"; }
  public isValid(): boolean { return this.position.fixType !== "none"; }
  public getAccuracyM(): number { return this.position.accuracyM; }

  /** RAIM (Receiver Autonomous Integrity Monitoring) check — true = safe to navigate. */
  public raimCheck(requiredAccuracyNm = 0.3): boolean {
    if (!this.isValid()) return false;
    const requiredM = requiredAccuracyNm * 1852;
    return this.position.accuracyM <= requiredM && this.satellites.filter((s) => s.used).length >= 5;
  }

  // ── Configuration ─────────────────────────────────────────────────────────────

  public setWAAS(enabled: boolean): void { this.config.waasEnabled = enabled; }
  public setUpdateRate(hz: number): void {
    this.config.updateRateHz = Math.max(1, Math.min(10, hz));
    this.updateIntervalMs = 1000 / this.config.updateRateHz;
  }

  /** Simulate GPS jamming / canyon terrain blocking (0 = clear, 1 = blocked). */
  public setSignalDegradation(factor: number): void {
    this.signalDegradation = Math.max(0, Math.min(1, factor));
  }

  // ── Private satellite simulation ──────────────────────────────────────────────

  private generateSatellites(): void {
    this.satellites = [];
    for (let i = 0; i < NEPAL_SAT_COUNT_TYPICAL + 4; i++) {
      this.satellites.push({
        prn: i + 1,
        azDeg: (i * 37 + 15) % 360,
        elDeg: 10 + (i * 23) % 70,
        snr: 30 + (i * 7) % 20,
        used: true,
      });
    }
  }

  private updateSatellites(lat: number, lng: number, dt: number): void {
    // Drift satellites slowly
    for (const sat of this.satellites) {
      sat.azDeg = (sat.azDeg + dt * 0.05) % 360;
      sat.elDeg = Math.max(5, Math.min(85, sat.elDeg + Math.sin(sat.prn + lat) * dt * 0.02));
      sat.snr = Math.max(15, Math.min(52, sat.snr + (Math.random() - 0.5) * 0.5));
      sat.used = sat.elDeg > 8 && sat.snr > 18 && Math.random() > this.signalDegradation;
    }
    void lng;
  }

  /** Simplified geometric DOP from satellite elevations. */
  private computeHDOP(sats: SimSatellite[]): number {
    if (sats.length < 4) return 99;
    const avgEl = sats.reduce((s, a) => s + a.elDeg, 0) / sats.length;
    // Lower elevation → higher HDOP
    return Math.max(0.8, 3 - avgEl / 40);
  }

  /** Box–Muller Gaussian noise. */
  private gaussianNoise(sigma: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  private defaultFix(): GPSPosition {
    return {
      lat: 27.6966, lng: 85.3591, altM: 1338,
      hdop: 1.2, vdop: 1.8,
      satellites: 0, fixType: "none",
      accuracyM: 999,
      velocityMs: 0, trackDeg: 0,
      timestamp: 0,
    };
  }
}

export const gpsManager = GPSManager.getInstance();
