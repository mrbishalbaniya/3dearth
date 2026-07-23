/**
 * TerrainManager — elevation sampling + clearance policy.
 */
import type { EarthEngine } from "../core/EarthEngine";
import type { EngineManager } from "../core/types";
import {
  peekElevation,
  sampleElevation,
  warmElevation,
} from "../../streaming";
import { useEarthStore } from "../../store/earthStore";
import {
  BUILDING_CLEARANCE_M,
  MIN_CAMERA_AGL_M,
} from "../../utils/cameraClearance";

export class TerrainManager implements EngineManager {
  readonly id = "terrain";
  private engine!: EarthEngine;

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  async elevation(lat: number, lng: number, z = 10): Promise<number> {
    return sampleElevation(lat, lng, z);
  }

  peek(lat: number, lng: number): number | null {
    return peekElevation(lat, lng);
  }

  warmFocus() {
    const s = useEarthStore.getState();
    warmElevation(s.focusLat, s.focusLng, 10);
  }

  /** Minimum AGL clearance in meters given DEM + capped exaggeration. */
  clearanceMeters(lat: number, lng: number): number {
    const elev = Math.max(0, peekElevation(lat, lng) ?? 0);
    const ex = Math.min(1.15, useEarthStore.getState().terrainExaggeration);
    const terrainTop = elev * ex;
    const low =
      useEarthStore.getState().altitudeM < 3_000 ? BUILDING_CLEARANCE_M : 0;
    return terrainTop + MIN_CAMERA_AGL_M + low;
  }

  dispose(): void {
    this.engine.logger.debug(this.id, "disposed");
  }
}
