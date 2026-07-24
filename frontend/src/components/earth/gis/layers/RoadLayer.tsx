"use client";

import { useEffect, useMemo, useState } from "react";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { bboxAround, fetchRoads, quantizeFocus } from "../overpass";
import {
  createLineGeometry,
  lineStringToSpherePositions,
} from "../geoProject";
import type { OsmWayFeature } from "../types";

const ROAD_COLORS: Record<string, string> = {
  motorway: "#f5c242",
  trunk: "#f0a830",
  primary: "#ffe08a",
  secondary: "#e8e0c8",
  tertiary: "#d0d0d0",
  residential: "#b8b8b8",
  unclassified: "#a8a8a8",
  service: "#909090",
  rail: "#c080ff",
  subway: "#a060e0",
  light_rail: "#b070f0",
  runway: "#ffffff",
  taxiway: "#d0d0d0",
};

function colorFor(kind: string): string {
  return ROAD_COLORS[kind] || "#c8c8c8";
}

export function RoadLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.gisLayers.roads);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);

  const [roads, setRoads] = useState<OsmWayFeature[]>([]);
  const q = quantizeFocus(focusLat, focusLng, zoomLevel >= 6 ? 0.012 : 0.03);

  useEffect(() => {
    if (!enabled || altitudeM > 80_000 || zoomLevel < 5) {
      setRoads([]);
      return;
    }
    const ctrl = new AbortController();
    const delta = altitudeM > 20_000 ? 0.18 : altitudeM > 5_000 ? 0.08 : 0.035;
    fetchRoads(bboxAround(q.lat, q.lng, delta), ctrl.signal)
      .then((res) => setRoads(res.slice(0, 2500)))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [enabled, q.lat, q.lng, altitudeM, zoomLevel]);

  const groups = useMemo(() => {
    const map = new Map<string, OsmWayFeature[]>();
    for (const r of roads) {
      const list = map.get(r.kind) || [];
      list.push(r);
      map.set(r.kind, list);
    }
    return [...map.entries()].map(([kind, list]) => {
      const segs = list.map((w) =>
        lineStringToSpherePositions(
          w.coords,
          EARTH_RADIUS * (kind === "motorway" || kind === "trunk" ? 1.0026 : 1.0023),
          0.05,
        ),
      );
      return { kind, geo: createLineGeometry(segs), color: colorFor(kind) };
    });
  }, [roads]);

  useEffect(() => {
    return () => {
      for (const g of groups) g.geo.dispose();
    };
  }, [groups]);

  if (!enabled || !groups.length) return null;

  return (
    <group>
      {groups.map(({ kind, geo, color }) => (
        <lineSegments key={kind} geometry={geo} renderOrder={8} frustumCulled>
          <lineBasicMaterial
            color={color}
            transparent
            opacity={
              kind === "motorway" || kind === "trunk"
                ? 0.95
                : kind.startsWith("rail")
                  ? 0.7
                  : 0.65
            }
            depthWrite={false}
          />
        </lineSegments>
      ))}
    </group>
  );
}
