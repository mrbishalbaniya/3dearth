"use client";

import { useEffect } from "react";
import { Annunciator } from "../controls/Interactive";
import { useCockpitStore } from "../stores/cockpitStore";
import { useGameStore } from "../../game/store/gameStore";
import type { WarningAnnunciation } from "../types";
import { getAircraftSpec } from "../../game/Aircraft/fleet";

export function WarningSystem() {
  const warnings = useCockpitStore((s) => s.warnings);
  const setWarnings = useCockpitStore((s) => s.setWarnings);

  useEffect(() => {
    const id = window.setInterval(() => {
      const st = useGameStore.getState().flightState;
      const sys = useGameStore.getState().systemsState;
      if (!st || !sys) {
        setWarnings([]);
        return;
      }
      const spec = getAircraftSpec(useGameStore.getState().selectedAircraftId);
      const list: WarningAnnunciation[] = [];

      if (st.stalled) {
        list.push({
          id: "stall",
          level: "warning",
          text: "STALL",
          active: true,
        });
      }
      if (st.airspeedMs > spec.maxSpeedMs * 0.98) {
        list.push({
          id: "overspeed",
          level: "warning",
          text: "OVERSPEED",
          active: true,
        });
      }
      if (sys.fuel.totalKg < 25 || sys.fuel.starved) {
        list.push({
          id: "low_fuel",
          level: "caution",
          text: "LOW FUEL",
          active: true,
        });
      }
      if (!sys.electrical.busLive) {
        list.push({
          id: "electrical",
          level: "warning",
          text: "ELEC",
          active: true,
        });
      }
      if (sys.hydraulic.pressurePsi < 1200) {
        list.push({
          id: "hydraulic",
          level: "caution",
          text: "HYD LO",
          active: true,
        });
      }
      if (!st.onGround && !st.gearDown && st.altM < 200) {
        list.push({
          id: "gear",
          level: "warning",
          text: "GEAR",
          active: true,
        });
      }
      if (st.verticalSpeedMs < -15 && st.altM < 400) {
        list.push({
          id: "pull_up",
          level: "warning",
          text: "PULL UP",
          active: true,
        });
      }

      if (list.some((w) => w.level === "warning")) {
        list.unshift({
          id: "master_warning",
          level: "warning",
          text: "MASTER WARN",
          active: true,
        });
      } else if (list.some((w) => w.level === "caution")) {
        list.unshift({
          id: "master_caution",
          level: "caution",
          text: "MASTER CAUT",
          active: true,
        });
      }

      setWarnings(list);
    }, 200);
    return () => clearInterval(id);
  }, [setWarnings]);

  return (
    <div className="ck-warnings" aria-live="assertive">
      {warnings.map((w) => (
        <Annunciator key={w.id} level={w.level} active={w.active}>
          {w.text}
        </Annunciator>
      ))}
    </div>
  );
}
