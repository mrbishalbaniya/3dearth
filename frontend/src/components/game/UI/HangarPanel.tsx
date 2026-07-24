"use client";

import { useEffect, useState } from "react";
import { FLEET, getAircraftSpec } from "../Aircraft/fleet";
import {
  getAirport,
  loadAirports,
  primaryRunway,
  searchAirports,
} from "../Services/AirportService";
import type { Airport } from "../Types";
import { useGameStore } from "../store/gameStore";
import { buildFlightPlan } from "../FlightPlan/FlightPlanService";
import { markAirportVisited, loadProgress, saveProgress } from "../Save/SaveService";
import { startMission } from "../Mission/missions";
import { useEarthStore } from "../../earth/store/earthStore";
import { useSimUiStore } from "../../sim/stores/uiStore";
import {
  CorridorStreamer,
  DEFAULT_CORRIDOR_CONFIG,
  seedElevationProxy,
  warmElevation,
} from "../../earth/streaming";
import { syncFlightToEarth } from "../World/FlightWorldBridge";

export function HangarPanel() {
  const open = useGameStore((s) => s.hangarOpen);
  const pushToast = useSimUiStore((s) => s.pushToast);
  const setOpen = useGameStore((s) => s.setHangerOpen);
  const aircraftId = useGameStore((s) => s.selectedAircraftId);
  const setAircraft = useGameStore((s) => s.setAircraft);
  const spawnIcao = useGameStore((s) => s.spawnAirportIcao);
  const setSpawn = useGameStore((s) => s.setSpawnAirport);
  const beginFlight = useGameStore((s) => s.beginFlight);
  const setRoute = useGameStore((s) => s.setRoute);
  const setProgress = useGameStore((s) => s.setProgress);
  const requestFlyTo = useEarthStore((s) => s.requestFlyTo);

  const [q, setQ] = useState("");
  const [destQ, setDestQ] = useState("");
  const [ready, setReady] = useState(false);
  const [results, setResults] = useState<Airport[]>([]);
  const [destResults, setDestResults] = useState<Airport[]>([]);
  const [destIcao, setDestIcao] = useState<string | null>(null);
  const [altIcao, setAltIcao] = useState<string | null>(null);
  const [corridorKm, setCorridorKm] = useState(50);

  const plan = ready
    ? buildFlightPlan({
        departureIcao: spawnIcao,
        destinationIcao: destIcao,
        alternateIcao: altIcao,
        spec: getAircraftSpec(aircraftId),
      })
    : null;

  useEffect(() => {
    void loadAirports().then(() => {
      setReady(true);
      setResults(searchAirports("", 20));
      setProgress(loadProgress());
    });
  }, [setProgress]);

  useEffect(() => {
    if (!ready) return;
    setResults(searchAirports(q, 24));
  }, [q, ready]);

  useEffect(() => {
    if (!ready) return;
    setDestResults(searchAirports(destQ, 12));
  }, [destQ, ready]);

  if (!open) return null;

  const start = () => {
    const ap = getAirport(spawnIcao);
    if (!ap) return;
    const rw = primaryRunway(ap);
    startMission("free_flight");

    if (destIcao) {
      const dest = getAirport(destIcao);
      if (dest) {
        const built = buildFlightPlan({
          departureIcao: ap.icao,
          destinationIcao: destIcao,
          alternateIcao: altIcao,
          spec: getAircraftSpec(aircraftId),
        });
        built.route.corridorBufferKm = corridorKm;
        setRoute(built.route);
        CorridorStreamer.setBufferKm(corridorKm);
        // Kick corridor warm immediately so dep/dest scenery starts loading
        CorridorStreamer.tick();
      }
    }

    const progress = markAirportVisited(loadProgress(), ap.icao);
    setProgress(progress);
    saveProgress(progress);

    // Frame highland airports immediately (VNKT ~1.3 km MSL) before DEM arrives
    seedElevationProxy(ap.lat, ap.lng, ap.elevM);
    warmElevation(ap.lat, ap.lng);

    // Cue Earth camera near airport before physics takes over
    requestFlyTo({
      lat: ap.lat,
      lng: ap.lng,
      altitudeM: ap.elevM + 800,
      duration: 2.2,
      approach: "rotateThenZoom",
    });

    // Cut heavy GIS during flight to avoid WebGL tab crashes (STATUS_BREAKPOINT).
    // Do NOT change qualityId here — it reloads earth textures and spikes VRAM.
    const earth = useEarthStore.getState();
    earth.setGisLayer("buildings", false);
    earth.setGisLayer("roads", false);
    earth.setGisLayer("forest", false);
    earth.setGisLayer("landCover", false);
    earth.setGisLayer("pois", false);
    earth.setGisLayer("natural", false);
    earth.setGisLayer("parks", false);
    earth.setGisLayer("labels", false);

    beginFlight({
      lat: ap.lat,
      lng: ap.lng,
      elevM: ap.elevM,
      headingDeg: rw.headingDeg,
    });
    const spawned = useGameStore.getState().flightState;
    if (spawned) syncFlightToEarth(spawned);
    pushToast({
      kind: "success",
      title: "Flight started",
      body: `${getAircraftSpec(aircraftId).name} · ${ap.icao}`,
    });
    setOpen(false);
  };

  return (
    <div className="flight-hangar" role="dialog" aria-label="Flight hangar">
      <div className="flight-hangar__panel">
        <header className="flight-hangar__head">
          <div>
            <h2>Free Flight</h2>
            <p>Choose aircraft & airport — fly the whole Earth</p>
          </div>
          <button type="button" className="earth-chip" onClick={() => setOpen(false)}>
            Close
          </button>
        </header>

        <section className="flight-hangar__section">
          <h3>Aircraft</h3>
          <div className="flight-hangar__fleet">
            {FLEET.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`flight-hangar__card ${aircraftId === a.id ? "is-active" : ""}`}
                onClick={() => setAircraft(a.id)}
              >
                <strong>{a.name}</strong>
                <span className="flight-hangar__mfr">
                  {a.class.replace("_", " ")}
                </span>
                <em>{a.description}</em>
                <dl className="flight-hangar__specs">
                  <div>
                    <dt>Cruise</dt>
                    <dd>{Math.round(a.cruiseSpeedMs * 1.94384)} kt</dd>
                  </div>
                  <div>
                    <dt>Fuel</dt>
                    <dd>{a.fuelCapacityKg} kg</dd>
                  </div>
                  <div>
                    <dt>Stall</dt>
                    <dd>{Math.round(a.stallSpeedMs * 1.94384)} kt</dd>
                  </div>
                  <div>
                    <dt>Mass</dt>
                    <dd>{a.massKg} kg</dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>
        </section>

        <section className="flight-hangar__section">
          <h3>Departure</h3>
          <input
            className="flight-hangar__search"
            placeholder="Search ICAO / IATA / city…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flight-hangar__list">
            {results.map((a) => (
              <button
                key={a.icao}
                type="button"
                className={`flight-hangar__row ${spawnIcao === a.icao ? "is-active" : ""}`}
                onClick={() => setSpawn(a.icao)}
              >
                <strong>{a.icao}</strong>
                <span>{a.iata ?? "—"}</span>
                <em>
                  {a.name} · {a.city}
                </em>
              </button>
            ))}
          </div>
        </section>

        <section className="flight-hangar__section">
          <h3>Destination (optional)</h3>
          <input
            className="flight-hangar__search"
            placeholder="Navigate to…"
            value={destQ}
            onChange={(e) => setDestQ(e.target.value)}
          />
          <div className="flight-hangar__list flight-hangar__list--sm">
            {destResults.map((a) => (
              <button
                key={a.icao}
                type="button"
                className={`flight-hangar__row ${destIcao === a.icao ? "is-active" : ""}`}
                onClick={() => setDestIcao(a.icao)}
              >
                <strong>{a.icao}</strong>
                <em>{a.city}</em>
              </button>
            ))}
          </div>
          {plan && plan.destinationIcao && (
            <p className="flight-hangar__hint">
              Plan: {plan.route.distanceNm.toFixed(0)} nm · fuel ~
              {Math.round(plan.fuelRequiredKg + plan.fuelReserveKg)} kg (incl. reserve)
              {plan.eteSec != null &&
                ` · ETE ${Math.round(plan.eteSec / 60)} min`}
              {altIcao ? ` · ALTN ${altIcao}` : ""}
            </p>
          )}
          <div className="flight-hangar__fleet" style={{ marginTop: "0.5rem" }}>
            {destResults.slice(0, 4).map((a) => (
              <button
                key={`alt-${a.icao}`}
                type="button"
                className={`flight-hangar__ac ${altIcao === a.icao ? "is-active" : ""}`}
                onClick={() => setAltIcao(a.icao === altIcao ? null : a.icao)}
              >
                <strong>ALTN {a.icao}</strong>
                <span>{a.city}</span>
              </button>
            ))}
          </div>
          {destIcao && (
            <div className="flight-hangar__corridor" style={{ marginTop: 10 }}>
              <span className="flight-hangar__hint">
                Stream corridor buffer (scenery ahead of aircraft)
              </span>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 6,
                }}
              >
                {DEFAULT_CORRIDOR_CONFIG.bufferPresetsKm.map((km) => (
                  <button
                    key={km}
                    type="button"
                    className={`earth-chip ${corridorKm === km ? "earth-chip--active" : ""}`}
                    onClick={() => setCorridorKm(km)}
                  >
                    {km} km
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="flight-hangar__foot">
          <div className="flight-hangar__hint">
            WASD pitch/roll · Q/E yaw · Shift/Ctrl throttle · G gear · F flaps · B brakes · C camera · Esc pause
          </div>
          <button type="button" className="flight-hangar__go" onClick={start} disabled={!ready}>
            Start Free Flight
          </button>
        </footer>
      </div>
    </div>
  );
}

export function FlightPauseMenu() {
  const mode = useGameStore((s) => s.mode);
  const paused = useGameStore((s) => s.paused);
  const setPaused = useGameStore((s) => s.setPaused);
  const endFlight = useGameStore((s) => s.endFlight);
  const progress = useGameStore((s) => s.progress);

  if (mode !== "flight" || !paused) return null;

  return (
    <div className="flight-pause">
      <div className="flight-pause__card">
        <h2>Paused</h2>
        <p>{progress.flightHours.toFixed(2)} h logged · {progress.airportsVisited.length} airports</p>
        <button type="button" className="flight-hangar__go" onClick={() => setPaused(false)}>
          Resume
        </button>
        <button type="button" className="earth-chip" onClick={() => endFlight()}>
          Exit to Earth
        </button>
      </div>
    </div>
  );
}

export function FlightTouchControls() {
  const mode = useGameStore((s) => s.mode);
  // Touch overlay is optional; keyboard/gamepad primary
  if (mode !== "flight") return null;
  return (
    <div className="flight-touch" aria-hidden>
      <div className="flight-touch__label">Touch: use keyboard / gamepad for full control</div>
    </div>
  );
}
