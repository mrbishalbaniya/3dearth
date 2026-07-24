"use client";

/**
 * Immersive cockpit chrome — minimal DOM.
 * Avionics live on 3D dashboard CanvasTextures; this is seats / popovers only.
 */
import { useEffect, useState } from "react";
import { HeadUpDisplay } from "../displays/HeadUpDisplay";
import { AutopilotPanel } from "../panels/AutopilotPanel";
import { ThrottleQuadrant } from "../panels/ThrottleQuadrant";
import { OverheadPanel } from "../panels/OverheadPanel";
import { WarningSystem } from "../panels/WarningSystem";
import { ChecklistPanel } from "../panels/ChecklistPanel";
import { useCockpitStore } from "../stores/cockpitStore";
import { useAutopilotStore } from "../stores/autopilotStore";
import { useGameStore } from "../../game/store/gameStore";
import { getAircraftSpec } from "../../game/Aircraft/fleet";
import { LAYOUT_BY_CLASS, type CockpitSeat } from "../types";
import { PushButton } from "../controls/Interactive";
import {
  cameraModeFromSeat,
  isCockpitCameraMode,
  seatFromCameraMode,
} from "../camera/seats";

const SEATS: { id: CockpitSeat; label: string }[] = [
  { id: "captain", label: "CAPT" },
  { id: "first_officer", label: "FO" },
  { id: "jump", label: "JUMP" },
  { id: "overhead", label: "OVHD" },
  { id: "pedestal", label: "PED" },
  { id: "instrument", label: "INST" },
];

export function CockpitRoot() {
  const mode = useGameStore((s) => s.mode);
  const cam = useGameStore((s) => s.cameraMode);
  const setDeckOpen = useCockpitStore((s) => s.setDeckOpen);
  const seat = useCockpitStore((s) => s.seat);
  const setSeat = useCockpitStore((s) => s.setSeat);
  const setShowChecklist = useCockpitStore((s) => s.setShowChecklist);
  const setShowOverhead = useCockpitStore((s) => s.setShowOverhead);
  const hudEnabled = useCockpitStore((s) => s.hudEnabled);
  const setHud = useCockpitStore((s) => s.setHudEnabled);
  const [assistOpen, setAssistOpen] = useState(false);
  const aircraftId = useGameStore((s) => s.selectedAircraftId);
  const setCamera = useGameStore((s) => s.setCameraMode);
  const resetCockpit = useCockpitStore((s) => s.resetForFlight);
  const syncAp = useAutopilotStore((s) => s.syncFromFlight);

  const layout =
    LAYOUT_BY_CLASS[getAircraftSpec(aircraftId).class] ?? LAYOUT_BY_CLASS.sep;

  useEffect(() => {
    if (mode !== "flight") {
      resetCockpit();
      return;
    }
    const mapped = seatFromCameraMode(cam);
    if (mapped) {
      useCockpitStore.setState({ seat: mapped, deckOpen: true });
    }
    const st = useGameStore.getState().flightState;
    if (st) syncAp(st.yawDeg, st.altM, st.airspeedMs);
  }, [mode, cam, resetCockpit, syncAp]);

  const immersive = mode === "flight" && isCockpitCameraMode(cam);
  if (!immersive) return null;

  return (
    <div
      className="ck-root ck-root--immersive"
      data-seat={seat}
      data-layout={layout.id}
    >
      <HeadUpDisplay />
      <WarningSystem />

      <p className="ck-hint">
        Shift+drag / RMB — look · Click switches on overhead · Outside world fills
        windshield
      </p>

      <nav
        className="ck-toolbar ck-toolbar--immersive"
        aria-label="Cockpit tools"
      >
        {SEATS.map((s) => (
          <PushButton
            key={s.id}
            lit={seat === s.id}
            onClick={() => {
              setSeat(s.id);
              setCamera(cameraModeFromSeat(s.id));
              setDeckOpen(true);
            }}
          >
            {s.label}
          </PushButton>
        ))}
        <PushButton onClick={() => setShowOverhead(true)}>OVHD</PushButton>
        <PushButton onClick={() => setShowChecklist(true)}>CHK</PushButton>
        <PushButton lit={assistOpen} onClick={() => setAssistOpen((v) => !v)}>
          AP
        </PushButton>
        {layout.hasHud && (
          <PushButton lit={hudEnabled} onClick={() => setHud(!hudEnabled)}>
            HUD
          </PushButton>
        )}
        <PushButton
          tone="amber"
          onClick={() => {
            setDeckOpen(false);
            setCamera("chase");
          }}
        >
          EXIT
        </PushButton>
      </nav>

      {assistOpen && (
        <div className="ck-assist">
          <AutopilotPanel />
          <ThrottleQuadrant />
        </div>
      )}

      <OverheadPanel />
      <ChecklistPanel />
    </div>
  );
}
