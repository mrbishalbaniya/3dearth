"use client";

import { Html, Instances, Instance } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";
import { bboxAround, fetchPois, quantizeFocus } from "../overpass";
import type { OsmNodeFeature } from "../types";

const POI_COLORS: Record<string, string> = {
  school: "#60a5fa",
  university: "#818cf8",
  hospital: "#f87171",
  clinic: "#fb7185",
  place_of_worship: "#fbbf24",
  fuel: "#f59e0b",
  bus_station: "#34d399",
  restaurant: "#fb923c",
  cafe: "#fdba74",
  fast_food: "#f97316",
  hotel: "#a78bfa",
  attraction: "#22d3ee",
  museum: "#38bdf8",
  viewpoint: "#2dd4bf",
  mall: "#e879f9",
  supermarket: "#c084fc",
  aerodrome: "#94a3b8",
  park: "#4ade80",
  stadium: "#86efac",
};

function poiRadius(altitudeM: number): number {
  const m = Math.max(10, Math.min(70, altitudeM * 0.007));
  return m / EARTH_RADIUS_M;
}

/** Grid-cluster POIs when zoomed out within city range. */
function clusterPois(
  pois: OsmNodeFeature[],
  cellDeg: number,
): Array<OsmNodeFeature & { count: number }> {
  if (cellDeg <= 0) {
    return pois.map((p) => ({ ...p, count: 1 }));
  }
  const map = new Map<string, OsmNodeFeature & { count: number }>();
  for (const p of pois) {
    const key = `${Math.round(p.lat / cellDeg)}_${Math.round(p.lng / cellDeg)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...p, count: 1 });
    } else {
      existing.count += 1;
    }
  }
  return [...map.values()];
}

export function PoiLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const enabled = useEarthStore((s) => s.gisLayers.pois);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);

  const [pois, setPois] = useState<OsmNodeFeature[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const q = quantizeFocus(focusLat, focusLng, 0.015);

  useEffect(() => {
    if (!enabled || zoomLevel < 5 || altitudeM > 15_000) {
      setPois([]);
      return;
    }
    const ctrl = new AbortController();
    const delta = altitudeM > 5_000 ? 0.06 : 0.03;
    fetchPois(bboxAround(q.lat, q.lng, delta), ctrl.signal)
      .then((res) => setPois(res.slice(0, 300)))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [enabled, q.lat, q.lng, altitudeM, zoomLevel]);

  const r = poiRadius(altitudeM);
  const cell = zoomLevel <= 5 ? 0.02 : zoomLevel === 6 ? 0.008 : 0;
  const clustered = useMemo(() => clusterPois(pois, cell), [pois, cell]);

  const items = useMemo(
    () =>
      clustered.map((p) => ({
        ...p,
        pos: latLngToVector3(p.lat, p.lng, EARTH_RADIUS * 1.0028),
        color: POI_COLORS[p.kind] || "#e2e8f0",
        scale: p.count > 1 ? 1 + Math.min(1.5, Math.log2(p.count) * 0.35) : 1,
      })),
    [clustered],
  );

  if (!enabled || !items.length) return null;

  return (
    <group>
      <Instances limit={400} range={items.length} frustumCulled={false}>
        <sphereGeometry args={[r, 10, 10]} />
        <meshStandardMaterial roughness={0.35} metalness={0.2} />
        {items.map((p) => (
          <Instance
            key={p.id}
            position={p.pos}
            color={p.color}
            scale={p.scale}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(p.id);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHovered(null);
              document.body.style.cursor = "auto";
            }}
          />
        ))}
      </Instances>

      {hovered &&
        items
          .filter((p) => p.id === hovered)
          .map((p) => (
            <Html
              key={`tip-${p.id}`}
              position={p.pos}
              center
              distanceFactor={1.8}
              style={{ pointerEvents: "none" }}
            >
              <div className="earth-marker-tooltip">
                <div className="earth-marker-tooltip__name">
                  {p.name || p.kind}
                  {p.count > 1 ? ` · ${p.count}` : ""}
                </div>
                <div className="earth-marker-tooltip__desc">{p.kind}</div>
              </div>
            </Html>
          ))}
    </group>
  );
}
