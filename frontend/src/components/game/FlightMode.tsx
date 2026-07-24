"use client";

import { AircraftEntity } from "./Aircraft/AircraftEntity";
import { FlightCameraController } from "./Camera/FlightCameraController";
import { RunwayMarkers } from "./Airport/RunwayMarkers";
import { AiTrafficLayer } from "./World/AiTrafficLayer";
import { useGameStore } from "./store/gameStore";
import { getAirport } from "./Services/AirportService";
import { useEffect } from "react";
import { worldTraffic } from "./World/WorldTrafficEngine";

/**
 * In-canvas flight systems — mount inside EarthScene rotating group / world.
 */
export function FlightMode({
  earthRotationY,
}: {
  earthRotationY: React.MutableRefObject<number>;
}) {
  const mode = useGameStore((s) => s.mode);
  const icao = useGameStore((s) => s.spawnAirportIcao);
  const airport = getAirport(icao);
  const flight = useGameStore((s) => s.flightState);

  useEffect(() => {
    if (mode !== "flight" || !flight) return;
    let cancelled = false;
    void worldTraffic.init().then(() => {
      if (cancelled) return;
      worldTraffic.clear();
      worldTraffic.seedAroundFocus(flight.lat, flight.lng, 12);
      worldTraffic.enabled = true;
    });
    return () => {
      cancelled = true;
      worldTraffic.enabled = false;
    };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps — seed once per flight

  if (mode !== "flight") return null;

  return (
    <group name="flight-mode">
      {airport && <RunwayMarkers airport={airport} />}
      <AiTrafficLayer />
      <AircraftEntity />
      <FlightCameraController earthRotationY={earthRotationY} />
    </group>
  );
}
