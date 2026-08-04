"use client";

/**
 * NavigationMapLayer — React Three Fiber overlay for the Earth scene.
 * Renders: airport icons, waypoint markers, navigation routes, airspace
 * boundaries, terrain warnings, aircraft position needle, and CDI arc.
 *
 * Mounts inside EarthScene's <group> — uses the same latLngToVector3
 * coordinate system as the rest of the Earth renderer.
 */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, Color, BufferGeometry, LineBasicMaterial, Line } from "three";
import { latLngToVector3 } from "@/components/earth/utils/geo";
import { EARTH_RADIUS } from "@/components/earth/utils/constants";
import { useGameStore } from "../store/gameStore";
import { airportDb } from "./AirportDatabase";
import { airspaceManager } from "./AirspaceManager";
import { waypointManager } from "./WaypointManager";
import type { AirspaceBoundary, Waypoint } from "./NavigationTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const SURFACE_OFFSET = 1.0005; // slight above surface
const ROUTE_HEIGHT   = 1.0008;
const ICON_HEIGHT    = 1.0015;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function geo(lat: number, lng: number, heightMult = SURFACE_OFFSET): Vector3 {
  return latLngToVector3(lat, lng, EARTH_RADIUS * heightMult);
}

function polygonToPoints(boundary: Array<{ lat: number; lng: number }>, h = SURFACE_OFFSET): Vector3[] {
  const pts = boundary.map((p) => geo(p.lat, p.lng, h));
  if (pts.length > 1) pts.push(pts[0].clone()); // close polygon
  return pts;
}

function colorForAirspace(type: AirspaceBoundary["type"]): string {
  switch (type) {
    case "CTR":        return "#00aaff";
    case "TMA":        return "#0066ff";
    case "FIR":        return "#888888";
    case "RESTRICTED": return "#ff8800";
    case "PROHIBITED": return "#ff0000";
    case "MILITARY":   return "#cc0000";
    case "TRAINING":   return "#00cc88";
    default:           return "#aaaaaa";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AirspacePolygon({ boundary, color }: { boundary: AirspaceBoundary; color: string }) {
  const points = useMemo(() => polygonToPoints(boundary.boundary), [boundary.boundary]);
  const geometry = useMemo(() => {
    const geo = new BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);
  const material = useMemo(
    () => new LineBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.55 }),
    [color],
  );
  return <primitive object={new (Line as any)(geometry, material)} />;
}

function RoutePolyline({ waypoints }: { waypoints: Array<{ lat: number; lng: number }> }) {
  const points = useMemo(
    () => waypoints.map((w) => geo(w.lat, w.lng, ROUTE_HEIGHT)),
    [waypoints],
  );
  if (points.length < 2) return null;
  const geometry = useMemo(() => new BufferGeometry().setFromPoints(points), [points]);
  const material = useMemo(
    () => new LineBasicMaterial({ color: new Color("#00ffcc"), transparent: true, opacity: 0.9 }),
    [],
  );
  return <primitive object={new (Line as any)(geometry, material)} />;
}

function AirportMarker({ lat, lng, category }: { lat: number; lng: number; category: string }) {
  const pos = useMemo(() => geo(lat, lng, ICON_HEIGHT), [lat, lng]);
  const color = category === "international" ? "#ffd700"
    : category === "domestic" ? "#88eeff"
    : "#aaffaa";
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.0006, 6, 6]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function WaypointMarker({ wp }: { wp: Waypoint }) {
  const pos = useMemo(() => geo(wp.lat, wp.lng, ICON_HEIGHT), [wp.lat, wp.lng]);
  return (
    <mesh position={pos}>
      <boxGeometry args={[0.0004, 0.0004, 0.0004]} />
      <meshBasicMaterial color="#ffff00" />
    </mesh>
  );
}

function AircraftPositionIndicator({ lat, lng }: { lat: number; lng: number }) {
  const meshRef = useRef<any>(null);
  const pos = useMemo(() => geo(lat, lng, ICON_HEIGHT + 0.001), [lat, lng]);
  return (
    <mesh ref={meshRef} position={pos}>
      <coneGeometry args={[0.001, 0.003, 4]} />
      <meshBasicMaterial color="#ff3300" />
    </mesh>
  );
}

// ─── NavigationMapLayer ───────────────────────────────────────────────────────

interface NavigationMapLayerProps {
  showAirspace?: boolean;
  showAirports?: boolean;
  showWaypoints?: boolean;
  showRoute?: boolean;
  showAircraftPos?: boolean;
  airspaceTypes?: AirspaceBoundary["type"][];
}

export function NavigationMapLayer({
  showAirspace = true,
  showAirports = true,
  showWaypoints = false,
  showRoute = true,
  showAircraftPos = true,
  airspaceTypes,
}: NavigationMapLayerProps) {
  const route    = useGameStore((s) => s.route);
  const flightSt = useGameStore((s) => s.flightState);

  const airports = useMemo(() => airportDb.getActive(), []);

  const allAirspace = useMemo(() => {
    const all = airspaceManager.getAll();
    if (!airspaceTypes) return all;
    return all.filter((a) => airspaceTypes.includes(a.type));
  }, [airspaceTypes]);

  const enrouteWaypoints = useMemo(
    () => (showWaypoints ? waypointManager.getByRegion("ENROUTE").slice(0, 80) : []),
    [showWaypoints],
  );

  return (
    <group name="nav-map-layer">
      {/* Airspace polygons */}
      {showAirspace &&
        allAirspace.map((b) => (
          <AirspacePolygon key={b.id} boundary={b} color={colorForAirspace(b.type)} />
        ))}

      {/* Airport markers */}
      {showAirports &&
        airports.map((ap) => (
          <AirportMarker key={ap.icao} lat={ap.lat} lng={ap.lng} category={ap.category} />
        ))}

      {/* Enroute waypoints */}
      {showWaypoints &&
        enrouteWaypoints.map((wp) => (
          <WaypointMarker key={wp.id} wp={wp} />
        ))}

      {/* Active route polyline */}
      {showRoute && route.waypoints.length >= 2 && (
        <RoutePolyline waypoints={route.waypoints} />
      )}

      {/* Aircraft position */}
      {showAircraftPos && flightSt && (
        <AircraftPositionIndicator lat={flightSt.lat} lng={flightSt.lng} />
      )}
    </group>
  );
}
