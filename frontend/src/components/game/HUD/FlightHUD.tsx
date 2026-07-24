"use client";

import { useEffect, useState } from "react";
import { useEarthStore } from "../../earth/store/earthStore";
import { useGameStore } from "../store/gameStore";
import { useSimUiStore } from "../../sim/stores/uiStore";

function kts(ms: number) {
  return Math.round(ms * 1.94384);
}
function fpm(ms: number) {
  return Math.round(ms * 196.85);
}

export function FlightHUD() {
  const st = useGameStore((s) => s.flightState);
  const sys = useGameStore((s) => s.systemsState);
  const cam = useGameStore((s) => s.cameraMode);
  const paused = useGameStore((s) => s.paused);
  const route = useGameStore((s) => s.route);
  const fps = useEarthStore((s) => s.fps);
  const hudScale = useSimUiStore((s) => s.hudScale);
  const [utc, setUtc] = useState("");
  const [local, setLocal] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setUtc(now.toISOString().slice(11, 19) + "Z");
      setLocal(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!st) return null;

  const eng = sys?.engines[0];
  const isTurbine = eng && !eng.kind.includes("piston");
  const attitudeStyle = {
    transform: `rotate(${st.rollDeg}deg) translateY(${-st.pitchDeg * 1.8}px)`,
  };
  const hdg = Math.round(st.yawDeg).toString().padStart(3, "0");

  return (
    <div
      className="flight-hud"
      aria-label="Flight instruments"
      style={{ ["--sim-hud-scale" as string]: String(hudScale) }}
    >
      <div className="flight-hud__top">
        <span>{fps} FPS</span>
        <span>{utc}</span>
        <span>LOC {local}</span>
        <span>WX CLR</span>
        <span>WIND CALM</span>
      </div>

      <div className="flight-hud__attitude">
        <div className="flight-hud__horizon" style={attitudeStyle}>
          <div className="flight-hud__sky" />
          <div className="flight-hud__ground" />
        </div>
        <div className="flight-hud__aircraft-ref" />
        <div className="flight-hud__hdg-badge">{hdg}°</div>
      </div>

      <div className="flight-hud__strip flight-hud__strip--left">
        <div className="flight-hud__readout">
          <span>IAS</span>
          <strong>{kts(st.airspeedMs)}</strong>
          <em>kt</em>
        </div>
        <div className="flight-hud__readout">
          <span>VS</span>
          <strong>{fpm(st.verticalSpeedMs)}</strong>
          <em>fpm</em>
        </div>
        <div className="flight-hud__readout">
          <span>THR</span>
          <strong>{Math.round(st.throttle * 100)}</strong>
          <em>%</em>
        </div>
        {eng && (
          <div className="flight-hud__readout">
            <span>{isTurbine ? "N1" : "RPM"}</span>
            <strong>{Math.round(eng.rpmOrN1)}</strong>
            <em>{isTurbine ? "%" : ""}</em>
          </div>
        )}
        <div className="flight-hud__readout">
          <span>AoA</span>
          <strong className={st.stalled ? "flight-hud__warn" : undefined}>
            {(st.alphaDeg ?? 0).toFixed(1)}
          </strong>
          <em>°</em>
        </div>
        <div className="flight-hud__readout">
          <span>G</span>
          <strong>{(st.loadFactor ?? 1).toFixed(1)}</strong>
          <em>g</em>
        </div>
      </div>

      <div className="flight-hud__strip flight-hud__strip--right">
        <div className="flight-hud__readout">
          <span>ALT</span>
          <strong>{Math.round(st.altM)}</strong>
          <em>m</em>
        </div>
        <div className="flight-hud__readout">
          <span>HDG</span>
          <strong>{hdg}</strong>
          <em>°</em>
        </div>
        <div className="flight-hud__readout">
          <span>FUEL</span>
          <strong
            className={
              sys?.fuel.starved || st.fuelKg < 20 ? "flight-hud__warn" : undefined
            }
          >
            {Math.round(sys?.fuel.totalKg ?? st.fuelKg)}
          </strong>
          <em>kg</em>
        </div>
        {eng && (
          <div className="flight-hud__readout">
            <span>EGT</span>
            <strong>{Math.round(eng.egtC)}</strong>
            <em>°C</em>
          </div>
        )}
      </div>

      <aside className="flight-hud__nav" aria-label="Navigation">
        <div className="flight-hud__minimap">
          <span className="flight-hud__minimap-ac" />
          {route.destIcao && (
            <span
              className="flight-hud__minimap-dest"
              style={{
                transform: `rotate(${route.bearingDeg - st.yawDeg}deg) translateY(-28px)`,
              }}
            />
          )}
        </div>
        <div className="flight-hud__nav-meta">
          {route.destIcao ? (
            <>
              <strong>{route.destIcao}</strong>
              <span>{route.distanceNm.toFixed(0)} nm</span>
              <span>
                {route.etaSec != null
                  ? `ETA ${Math.round(route.etaSec / 60)}m`
                  : "—"}
              </span>
            </>
          ) : (
            <span>No route</span>
          )}
        </div>
      </aside>

      <div className="flight-hud__status">
        <span>
          {st.gearDown
            ? "GEAR DOWN"
            : sys?.gear.transitioning
              ? "GEAR…"
              : "GEAR UP"}
        </span>
        <span>FLAPS {Math.round(st.flaps * 100)}%</span>
        <span>{st.onGround ? "GND" : "AIR"}</span>
        {sys && (
          <span>HYD {Math.round(sys.hydraulic.pressurePsi / 100) * 100}</span>
        )}
        {sys && !sys.electrical.busLive && (
          <span className="flight-hud__warn">ELEC</span>
        )}
        {sys?.fuel.starved && (
          <span className="flight-hud__warn">FUEL STARVE</span>
        )}
        {st.stalled && <span className="flight-hud__warn">STALL</span>}
        {st.brakes && <span>BRK</span>}
        <span className="flight-hud__cam">{cam.toUpperCase()}</span>
      </div>

      <div className="flight-hud__gps">
        {st.lat.toFixed(4)}° {st.lng.toFixed(4)}°
      </div>

      {route.destIcao && (
        <div
          className="flight-hud__needle"
          style={{ transform: `rotate(${route.bearingDeg - st.yawDeg}deg)` }}
          title="Course to destination"
        />
      )}

      {paused && (
        <div className="flight-hud__paused">PAUSED — Esc to resume</div>
      )}
    </div>
  );
}
