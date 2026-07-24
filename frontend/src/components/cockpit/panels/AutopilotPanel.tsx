"use client";

import { PushButton } from "../controls/Interactive";
import { useAutopilotStore } from "../stores/autopilotStore";
import { useGameStore } from "../../game/store/gameStore";

export function AutopilotPanel() {
  const ap = useAutopilotStore((s) => s.ap);
  const setMaster = useAutopilotStore((s) => s.setMaster);
  const setLateral = useAutopilotStore((s) => s.setLateral);
  const setVertical = useAutopilotStore((s) => s.setVertical);
  const setSpeed = useAutopilotStore((s) => s.setSpeed);
  const setTargetHdg = useAutopilotStore((s) => s.setTargetHdg);
  const setTargetAlt = useAutopilotStore((s) => s.setTargetAlt);
  const setTargetVs = useAutopilotStore((s) => s.setTargetVs);
  const setTargetSpeed = useAutopilotStore((s) => s.setTargetSpeed);
  const sync = useAutopilotStore((s) => s.syncFromFlight);

  const syncNow = () => {
    const st = useGameStore.getState().flightState;
    if (!st) return;
    sync(st.yawDeg, st.altM, st.airspeedMs);
  };

  return (
    <section className="ck-ap" aria-label="Autopilot">
      <header>
        <strong>AUTOPILOT</strong>
        <PushButton
          tone="green"
          lit={ap.master}
          onClick={() => {
            if (!ap.master) syncNow();
            setMaster(!ap.master);
          }}
        >
          AP
        </PushButton>
      </header>

      <div className="ck-ap__modes">
        <PushButton
          lit={ap.lateral === "hdg"}
          onClick={() => setLateral(ap.lateral === "hdg" ? "off" : "hdg")}
        >
          HDG
        </PushButton>
        <PushButton
          lit={ap.lateral === "lnav"}
          onClick={() => setLateral(ap.lateral === "lnav" ? "off" : "lnav")}
        >
          LNAV
        </PushButton>
        <PushButton
          lit={ap.lateral === "loc"}
          onClick={() => setLateral(ap.lateral === "loc" ? "off" : "loc")}
        >
          LOC
        </PushButton>
        <PushButton
          lit={ap.vertical === "alt"}
          onClick={() => setVertical(ap.vertical === "alt" ? "off" : "alt")}
        >
          ALT
        </PushButton>
        <PushButton
          lit={ap.vertical === "vs"}
          onClick={() => setVertical(ap.vertical === "vs" ? "off" : "vs")}
        >
          VS
        </PushButton>
        <PushButton
          lit={ap.vertical === "vnav"}
          onClick={() => setVertical(ap.vertical === "vnav" ? "off" : "vnav")}
        >
          VNAV
        </PushButton>
        <PushButton
          lit={ap.vertical === "gs"}
          onClick={() => setVertical(ap.vertical === "gs" ? "off" : "gs")}
        >
          APP
        </PushButton>
        <PushButton
          lit={ap.speed === "spd"}
          tone="amber"
          onClick={() => setSpeed(ap.speed === "spd" ? "off" : "spd")}
        >
          IAS
        </PushButton>
      </div>

      <div className="ck-ap__targets">
        <label>
          HDG
          <input
            type="number"
            value={Math.round(ap.targetHdgDeg)}
            onChange={(e) => setTargetHdg(Number(e.target.value))}
          />
        </label>
        <label>
          ALT m
          <input
            type="number"
            step={50}
            value={Math.round(ap.targetAltM)}
            onChange={(e) => setTargetAlt(Number(e.target.value))}
          />
        </label>
        <label>
          VS m/s
          <input
            type="number"
            step={0.5}
            value={ap.targetVsMs}
            onChange={(e) => setTargetVs(Number(e.target.value))}
          />
        </label>
        <label>
          IAS m/s
          <input
            type="number"
            step={1}
            value={Math.round(ap.targetSpeedMs)}
            onChange={(e) => setTargetSpeed(Number(e.target.value))}
          />
        </label>
      </div>
      <button type="button" className="ck-ap__sync" onClick={syncNow}>
        Sync targets to aircraft
      </button>
    </section>
  );
}
