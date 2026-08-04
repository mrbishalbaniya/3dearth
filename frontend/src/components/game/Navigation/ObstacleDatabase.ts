/**
 * ObstacleDatabase — Nepal man-made obstacles and significant terrain features.
 * Towers, antennas, power lines, and notable ridgeline obstacles near airways.
 */

import type { Obstacle } from "./NavigationTypes";
import { haversineNm } from "./greatCircle";

// ─── Nepal obstacle data (AIP Nepal ENR 5.4 + terrain registry) ───────────────

const NEPAL_OBSTACLES_RAW: Obstacle[] = [
  // Kathmandu Valley
  { id: "OBS_KTM_TV1",  type: "antenna",  name: "Kathmandu TV Tower",      lat: 27.7308, lng: 85.3571, elevationMsl: 1420, heightAgl: 80,  summitElevM: 1500, lightedAtNight: true,  markedByDay: true },
  { id: "OBS_KTM_ANT1", type: "antenna",  name: "Shivapuri Antenna",        lat: 27.7962, lng: 85.3700, elevationMsl: 2732, heightAgl: 25,  summitElevM: 2757, lightedAtNight: true,  markedByDay: true },
  { id: "OBS_KTM_CHND", type: "building", name: "Chandragiri Hill Antenna",  lat: 27.6667, lng: 85.2000, elevationMsl: 2551, heightAgl: 30,  summitElevM: 2581, lightedAtNight: false, markedByDay: false },
  { id: "OBS_KTM_PWR1", type: "powerline", name: "KTM South Power Line",    lat: 27.6200, lng: 85.3000, elevationMsl: 1380, heightAgl: 40,  summitElevM: 1420, lightedAtNight: false, markedByDay: false },
  // Pokhara area
  { id: "OBS_PKR_ANT1", type: "antenna",  name: "Pokhara Radio Mast",       lat: 28.2300, lng: 84.0100, elevationMsl: 1000, heightAgl: 50,  summitElevM: 1050, lightedAtNight: true,  markedByDay: true },
  { id: "OBS_PKR_SRANG",type: "hill",     name: "Sarangkot Ridge",           lat: 28.2270, lng: 83.9533, elevationMsl: 1592, heightAgl: 0,   summitElevM: 1592, lightedAtNight: false, markedByDay: false },
  // Bhairahawa / Terai
  { id: "OBS_BHR_STK1", type: "stack",    name: "Bhairahawa Industrial",    lat: 27.5200, lng: 83.4500, elevationMsl: 120,  heightAgl: 90,  summitElevM: 210,  lightedAtNight: true,  markedByDay: true },
  { id: "OBS_BWA_TOWER",type: "tower",    name: "Butwal Comm Tower",         lat: 27.7007, lng: 83.4532, elevationMsl: 200,  heightAgl: 120, summitElevM: 320,  lightedAtNight: true,  markedByDay: true },
  // Biratnagar
  { id: "OBS_BIR_STK1", type: "stack",    name: "Biratnagar Industrial",    lat: 26.4900, lng: 87.2800, elevationMsl: 80,   heightAgl: 100, summitElevM: 180,  lightedAtNight: true,  markedByDay: true },
  // Lukla approach corridor
  { id: "OBS_LKL_RIDGE",type: "mountain", name: "Lukla South Ridge",         lat: 27.6600, lng: 86.7200, elevationMsl: 3100, heightAgl: 0,   summitElevM: 3100, lightedAtNight: false, markedByDay: false },
  { id: "OBS_LKL_NORTH",type: "mountain", name: "Lukla North Face",          lat: 27.7200, lng: 86.7400, elevationMsl: 3500, heightAgl: 0,   summitElevM: 3500, lightedAtNight: false, markedByDay: false },
  // Jomsom corridor
  { id: "OBS_JMS_WEST",  type: "mountain", name: "Jomsom West Wall",         lat: 28.7900, lng: 83.6900, elevationMsl: 4200, heightAgl: 0,   summitElevM: 4200, lightedAtNight: false, markedByDay: false },
  // Nepalgunj
  { id: "OBS_NEP_TWR1",  type: "tower",    name: "Nepalgunj Telecom Tower",   lat: 28.1100, lng: 81.6800, elevationMsl: 175,  heightAgl: 85,  summitElevM: 260,  lightedAtNight: true,  markedByDay: true },
  // Dhangarhi
  { id: "OBS_DHI_TWR1",  type: "tower",    name: "Dhangarhi Comm Tower",      lat: 28.7600, lng: 80.5900, elevationMsl: 200,  heightAgl: 75,  summitElevM: 275,  lightedAtNight: true,  markedByDay: true },
  // Himalayan ridges (major airway hazards)
  { id: "OBS_LAMTANG",   type: "mountain", name: "Langtang Lirung",           lat: 28.2469, lng: 85.5153, elevationMsl: 7234, heightAgl: 0,   summitElevM: 7234, lightedAtNight: false, markedByDay: false },
  { id: "OBS_GANESH",    type: "mountain", name: "Ganesh Himal",              lat: 28.3897, lng: 84.9078, elevationMsl: 7422, heightAgl: 0,   summitElevM: 7422, lightedAtNight: false, markedByDay: false },
  { id: "OBS_HIMAL_E",   type: "mountain", name: "Numbur (Shorong Himal)",    lat: 27.6100, lng: 86.6400, elevationMsl: 6959, heightAgl: 0,   summitElevM: 6959, lightedAtNight: false, markedByDay: false },
];

// ─── Spatial grid ─────────────────────────────────────────────────────────────

const GRID_DEG = 0.25;

export class ObstacleDatabase {
  private static instance: ObstacleDatabase | null = null;
  private obstacles: Obstacle[] = [...NEPAL_OBSTACLES_RAW];
  private grid = new Map<string, Obstacle[]>();

  private constructor() {
    for (const obs of this.obstacles) this.index(obs);
  }

  public static getInstance(): ObstacleDatabase {
    if (!ObstacleDatabase.instance) ObstacleDatabase.instance = new ObstacleDatabase();
    return ObstacleDatabase.instance;
  }

  // ── Queries ───────────────────────────────────────────────────────────────────

  public getAll(): Obstacle[] { return [...this.obstacles]; }

  public getById(id: string): Obstacle | undefined {
    return this.obstacles.find((o) => o.id === id);
  }

  /** Obstacles within radiusNm of position, sorted by distance. */
  public nearest(
    lat: number, lng: number, radiusNm: number,
    minSummitM?: number,
  ): Array<{ obs: Obstacle; distNm: number }> {
    const degOffset = radiusNm / 60 + GRID_DEG;
    const seen = new Set<string>();
    const results: Array<{ obs: Obstacle; distNm: number }> = [];

    const latMin = lat - degOffset;
    const latMax = lat + degOffset;
    const lngMin = lng - degOffset;
    const lngMax = lng + degOffset;
    const latSteps = Math.ceil((latMax - latMin) / GRID_DEG);
    const lngSteps = Math.ceil((lngMax - lngMin) / GRID_DEG);

    for (let i = 0; i <= latSteps; i++) {
      for (let j = 0; j <= lngSteps; j++) {
        const key = this.cellKey(latMin + i * GRID_DEG, lngMin + j * GRID_DEG);
        if (seen.has(key)) continue;
        seen.add(key);
        const cell = this.grid.get(key);
        if (!cell) continue;
        for (const obs of cell) {
          if (minSummitM != null && obs.summitElevM < minSummitM) continue;
          const d = haversineNm(lat, lng, obs.lat, obs.lng);
          if (d <= radiusNm) results.push({ obs, distNm: d });
        }
      }
    }
    return results.sort((a, b) => a.distNm - b.distNm);
  }

  /** Check if any obstacle summit is within clearanceM metres of altM in flight path. */
  public checkClearance(
    lat: number, lng: number, altM: number,
    radiusNm: number, clearanceM = 300,
  ): Array<{ obs: Obstacle; clearanceM: number; distNm: number }> {
    return this.nearest(lat, lng, radiusNm)
      .filter(({ obs }) => obs.summitElevM + clearanceM > altM)
      .map(({ obs, distNm }) => ({
        obs, distNm,
        clearanceM: altM - obs.summitElevM,
      }));
  }

  /** Minimum safe altitude (MSL metres) to clear all obstacles within radiusNm + 300m buffer. */
  public minimumSafeAltitude(lat: number, lng: number, radiusNm = 5, bufferM = 300): number {
    const obs = this.nearest(lat, lng, radiusNm);
    if (!obs.length) return 0;
    return Math.max(...obs.map((o) => o.obs.summitElevM)) + bufferM;
  }

  // ── Dynamic add ───────────────────────────────────────────────────────────────

  public add(obs: Obstacle): void {
    this.obstacles.push(obs);
    this.index(obs);
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private index(obs: Obstacle): void {
    const key = this.cellKey(obs.lat, obs.lng);
    if (!this.grid.has(key)) this.grid.set(key, []);
    this.grid.get(key)!.push(obs);
  }

  private cellKey(lat: number, lng: number): string {
    const clat = Math.floor(lat / GRID_DEG) * GRID_DEG;
    const clng = Math.floor(lng / GRID_DEG) * GRID_DEG;
    return `${clat.toFixed(2)},${clng.toFixed(2)}`;
  }
}

export const obstacleDb = ObstacleDatabase.getInstance();
