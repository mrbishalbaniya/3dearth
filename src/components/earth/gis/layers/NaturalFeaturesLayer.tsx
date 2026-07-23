"use client";

import { Html } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";
import {
  bboxAround,
  fetchNaturalFeatures,
  quantizeFocus,
} from "../overpass";
import type { OsmNodeFeature } from "../types";

const NATURAL_COLORS: Record<string, string> = {
  peak: "#e8eef5",
  volcano: "#ef4444",
  cliff: "#a8a29e",
  waterfall: "#38bdf8",
  glacier: "#bae6fd",
  cape: "#fde68a",
  bay: "#7dd3fc",
  beach: "#fcd34d",
  island: "#86efac",
};

interface GeoPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: string;
}

export function NaturalFeaturesLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.gisLayers.natural);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);

  const [local, setLocal] = useState<OsmNodeFeature[]>([]);
  const [global, setGlobal] = useState<GeoPoint[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const q = quantizeFocus(focusLat, focusLng, 0.05);

  // Natural Earth geography points (peaks, deserts, etc.)
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/data/geo_points.geojson")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const pts: GeoPoint[] = (data.features || []).map(
          (
            f: {
              properties?: { name?: string; featurecla?: string };
              geometry?: { coordinates?: number[] };
            },
            i: number,
          ) => ({
            id: `geo-${i}`,
            name: f.properties?.name || "Feature",
            lng: f.geometry?.coordinates?.[0] ?? 0,
            lat: f.geometry?.coordinates?.[1] ?? 0,
            kind: f.properties?.featurecla || "region",
          }),
        );
        setGlobal(pts);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || zoomLevel < 4 || altitudeM > 300_000) {
      setLocal([]);
      return;
    }
    const ctrl = new AbortController();
    fetchNaturalFeatures(
      bboxAround(q.lat, q.lng, altitudeM > 50_000 ? 0.8 : 0.25),
      ctrl.signal,
    )
      .then((res) => setLocal(res.slice(0, 150)))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [enabled, q.lat, q.lng, altitudeM, zoomLevel]);

  const markers = useMemo(() => {
    const r = Math.max(20, Math.min(200, altitudeM * 0.02)) / EARTH_RADIUS_M;
    const near = (lat: number, lng: number) => {
      const dLat = lat - focusLat;
      const dLng = lng - focusLng;
      const span =
        altitudeM > 400_000
          ? 30
          : altitudeM > 100_000
            ? 16
            : altitudeM > 30_000
              ? 7
              : 3;
      return dLat * dLat + dLng * dLng < span * span;
    };
    const fromLocal = local
      .filter((p) => near(p.lat, p.lng))
      .map((p) => ({
        id: p.id,
        name: p.name || p.kind,
        kind: p.kind,
        pos: latLngToVector3(p.lat, p.lng, EARTH_RADIUS * 1.003),
        color: NATURAL_COLORS[p.kind] || "#f8fafc",
        r,
      }));
    const fromGlobal =
      zoomLevel <= 4
        ? global
            .filter((p) => near(p.lat, p.lng))
            .slice(0, 10)
            .map((p) => ({
              id: p.id,
              name: p.name,
              kind: p.kind,
              pos: latLngToVector3(p.lat, p.lng, EARTH_RADIUS * 1.0035),
              color: "#fde68a",
              r: r * 1.4,
            }))
        : [];
    return [...fromGlobal, ...fromLocal];
  }, [local, global, altitudeM, zoomLevel, focusLat, focusLng]);

  if (!enabled || !markers.length) return null;

  return (
    <group>
      {markers.map((m) => (
        <group key={m.id} position={m.pos}>
          <mesh
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(m.id);
            }}
            onPointerOut={() => setHovered(null)}
          >
            <sphereGeometry args={[m.r, 10, 10]} />
            <meshStandardMaterial
              color={m.color}
              emissive={m.color}
              emissiveIntensity={0.5}
              roughness={0.4}
            />
          </mesh>
          {hovered === m.id && (
            <Html center distanceFactor={2.2} style={{ pointerEvents: "none" }}>
              <div className="earth-label earth-label--street">{m.name}</div>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}
