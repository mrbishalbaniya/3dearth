"use client";

import { GlassPanel, SimButton, SimChip } from "../ui/Glass";
import { useSimUiStore } from "../stores/uiStore";
import { useGameStore } from "../../game/store/gameStore";

export function SettingsPanel() {
  const open = useSimUiStore((s) => s.settingsOpen);
  const setOpen = useSimUiStore((s) => s.setSettingsOpen);
  const hudScale = useSimUiStore((s) => s.hudScale);
  const setHudScale = useSimUiStore((s) => s.setHudScale);
  const mute = useGameStore((s) => s.muteAudio);
  const setMute = useGameStore((s) => s.setMuteAudio);
  const touch = useGameStore((s) => s.showTouchControls);

  if (!open) return null;

  return (
    <div className="sim-overlay">
      <GlassPanel
        className="sim-panel-md"
        title="Settings"
        subtitle="Graphics · controls · accessibility"
        onClose={() => setOpen(false)}
      >
        <section className="sim-settings-block">
          <h4>Display</h4>
          <label className="sim-slider">
            <span>UI scale</span>
            <input
              type="range"
              min={0.85}
              max={1.25}
              step={0.05}
              value={hudScale}
              onChange={(e) => setHudScale(Number(e.target.value))}
            />
            <em>{Math.round(hudScale * 100)}%</em>
          </label>
        </section>

        <section className="sim-settings-block">
          <h4>Audio</h4>
          <label className="sim-check">
            <input
              type="checkbox"
              checked={mute}
              onChange={(e) => setMute(e.target.checked)}
            />
            Mute engine / ATC audio
          </label>
        </section>

        <section className="sim-settings-block">
          <h4>Controls</h4>
          <p className="sim-muted">
            WASD pitch/roll · Q/E yaw · Shift/Ctrl throttle · F flaps · G gear ·
            C camera · Esc pause
          </p>
          <label className="sim-check">
            <input
              type="checkbox"
              checked={touch}
              onChange={(e) => {
                useGameStore.setState({ showTouchControls: e.target.checked });
              }}
            />
            Show touch controls
          </label>
        </section>

        <section className="sim-settings-block">
          <h4>Quality presets</h4>
          <div className="sim-chip-row">
            <SimChip>Terrain LOD</SimChip>
            <SimChip tone="cyan">Clouds</SimChip>
            <SimChip>Shadows</SimChip>
            <SimChip tone="ok">60 FPS target</SimChip>
          </div>
          <p className="sim-muted" style={{ marginTop: 8 }}>
            Earth layer quality is controlled from the map layer panel while
            exploring.
          </p>
        </section>

        <footer className="sim-panel-actions">
          <SimButton variant="primary" onClick={() => setOpen(false)}>
            Done
          </SimButton>
        </footer>
      </GlassPanel>
    </div>
  );
}
