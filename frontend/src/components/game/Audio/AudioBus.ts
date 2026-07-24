/**
 * Audio bus — silent until assets are added under /public/audio/flight/.
 * Ready for engine / wind / gear / weather layers.
 */
type BusId = "engine" | "wind" | "gear" | "flaps" | "ambience" | "weather";

class AudioBusImpl {
  private muted = false;
  private gains = new Map<BusId, number>();

  setMuted(m: boolean) {
    this.muted = m;
  }

  setGain(id: BusId, gain: number) {
    this.gains.set(id, Math.max(0, Math.min(1, gain)));
  }

  play(_id: BusId, _opts?: { loop?: boolean }) {
    if (this.muted) return;
    // Future: AudioContext + decodeAudioData from /audio/flight/*.mp3
  }

  stop(_id: BusId) {
    /* noop until assets wired */
  }

  /** Map throttle 0–1 to engine layer intensity. */
  syncEngine(throttle: number, airspeedMs: number) {
    this.setGain("engine", this.muted ? 0 : 0.15 + throttle * 0.7);
    this.setGain("wind", this.muted ? 0 : Math.min(1, airspeedMs / 120) * 0.45);
  }
}

export const AudioBus = new AudioBusImpl();
