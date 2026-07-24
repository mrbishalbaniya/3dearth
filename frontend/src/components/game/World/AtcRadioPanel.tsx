"use client";

/**
 * Player ATC radio — text clearances now; schema is voice-ready.
 */
import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { worldTraffic } from "./WorldTrafficEngine";
import type { AtcClearance, ClearanceType } from "./types";

const REQUESTS: { type: ClearanceType; label: string }[] = [
  { type: "pushback", label: "Push & start" },
  { type: "taxi", label: "Taxi" },
  { type: "lineup_wait", label: "Line up" },
  { type: "takeoff", label: "Takeoff" },
  { type: "climb", label: "Climb" },
  { type: "approach", label: "Approach" },
  { type: "landing", label: "Landing" },
  { type: "taxi_in", label: "Taxi in" },
];

export function AtcRadioPanel() {
  const mode = useGameStore((s) => s.mode);
  const st = useGameStore((s) => s.flightState);
  const icao = useGameStore((s) => s.spawnAirportIcao);
  const [msgs, setMsgs] = useState<AtcClearance[]>([]);
  const [freq, setFreq] = useState(121.7);
  const [facility, setFacility] = useState("ground");

  useEffect(() => {
    if (mode !== "flight") return;
    const id = window.setInterval(() => {
      setMsgs([...worldTraffic.playerAtc.messages].reverse().slice(0, 8));
      setFreq(worldTraffic.playerAtc.frequencyMhz);
      setFacility(worldTraffic.playerAtc.facility);
    }, 400);
    return () => clearInterval(id);
  }, [mode]);

  if (mode !== "flight" || !st) return null;

  const request = (type: ClearanceType) => {
    worldTraffic.playerRequest(type, {
      onGround: st.onGround,
      altM: st.altM,
      airportIcao: icao,
      callsign: worldTraffic.playerAtc.callsign,
    });
    setMsgs([...worldTraffic.playerAtc.messages].reverse().slice(0, 8));
  };

  const stats = worldTraffic.getAnalytics();

  return (
    <div className="atc-radio" aria-label="ATC radio">
      <header className="atc-radio__head">
        <strong>ATC</strong>
        <span>
          {facility.toUpperCase()} · {freq.toFixed(1)}
        </span>
      </header>
      <div className="atc-radio__actions">
        {REQUESTS.map((r) => (
          <button
            key={r.type}
            type="button"
            className="atc-radio__btn"
            onClick={() => request(r.type)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="atc-radio__log">
        {msgs.length === 0 && (
          <p className="atc-radio__empty">No clearances yet — request taxi / takeoff</p>
        )}
        {msgs.map((m) => (
          <p key={m.id} className="atc-radio__msg">
            <em>{m.facility}</em> {m.text}
          </p>
        ))}
      </div>
      <footer className="atc-radio__stats">
        Traffic F{stats.activeFull}/R{stats.activeRegional}/G{stats.activeGlobal}
        {" · "}
        done {stats.flightsCompleted}
      </footer>
    </div>
  );
}
