"use client";

import { GlassPanel, SimButton, SimChip } from "../ui/Glass";
import { useSimUiStore } from "../stores/uiStore";

export function MultiplayerPanel() {
  const open = useSimUiStore((s) => s.multiplayerOpen);
  const setOpen = useSimUiStore((s) => s.setMultiplayerOpen);
  const pushToast = useSimUiStore((s) => s.pushToast);

  if (!open) return null;

  return (
    <div className="sim-overlay">
      <GlassPanel
        className="sim-panel-md"
        title="Multiplayer"
        subtitle="Friends · nearby pilots · voice"
        onClose={() => setOpen(false)}
      >
        <div className="sim-mp">
          <div className="sim-mp__row">
            <span>Server</span>
            <strong>orbit-world-01</strong>
            <SimChip tone="ok">Online</SimChip>
          </div>
          <div className="sim-mp__row">
            <span>Ping</span>
            <strong>—</strong>
            <SimChip>Voice ready</SimChip>
          </div>
          <div className="sim-mp__row">
            <span>Nearby</span>
            <strong>AI traffic</strong>
            <SimChip tone="cyan">Living world</SimChip>
          </div>
        </div>
        <p className="sim-muted">
          Human multiplayer connects via the Go backend WebSocket hub when the
          API is running. AI traffic is always active in Free Flight.
        </p>
        <footer className="sim-panel-actions">
          <SimButton
            variant="accent"
            onClick={() => {
              pushToast({
                kind: "info",
                title: "Invite copied",
                body: "Share your session when multiplayer is linked",
              });
            }}
          >
            Copy invite
          </SimButton>
          <SimButton variant="ghost" onClick={() => setOpen(false)}>
            Close
          </SimButton>
        </footer>
      </GlassPanel>
    </div>
  );
}
