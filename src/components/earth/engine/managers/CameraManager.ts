/**
 * CameraManager — mode + flyTo API over the Zustand store / OrbitControls.
 */
import type { EarthEngine } from "../core/EarthEngine";
import type { CameraMode, EngineManager } from "../core/types";
import { useEarthStore } from "../../store/earthStore";

export class CameraManager implements EngineManager {
  readonly id = "camera";
  private engine!: EarthEngine;
  mode: CameraMode = "orbit";

  init(engine: EarthEngine): void {
    this.engine = engine;
    this.engine.events.on("camera:flyTo", (p) => {
      this.flyTo(p.lat, p.lng, p.altitudeM, p.duration);
    });
    this.engine.events.on("camera:mode", ({ mode }) => {
      this.setMode(mode);
    });
  }

  setMode(mode: CameraMode) {
    this.mode = mode;
    this.engine.logger.debug(this.id, `mode → ${mode}`);
  }

  flyTo(lat: number, lng: number, altitudeM = 50_000, duration = 1.6) {
    useEarthStore.getState().requestFlyTo({ lat, lng, altitudeM, duration });
  }

  reset() {
    useEarthStore.getState().requestResetCamera();
  }

  zoom(delta: number) {
    useEarthStore.getState().requestZoom(delta);
  }

  setNorthLock(on: boolean) {
    useEarthStore.getState().setNorthLock(on);
  }

  get telemetry() {
    const s = useEarthStore.getState();
    return {
      altitudeM: s.altitudeM,
      lat: s.focusLat,
      lng: s.focusLng,
      heading: s.compassHeading,
      pitch: s.cameraPitch,
      zoomLevel: s.zoomLevel,
      mode: this.mode,
    };
  }

  dispose(): void {
    /* listeners cleaned with engine dispose */
  }
}
