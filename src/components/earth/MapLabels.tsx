"use client";

import { Html } from "@react-three/drei";
import { useMemo } from "react";
import { useEarthStore } from "./store/earthStore";
import { MAP_LABELS } from "./utils/labels";
import { latLngToVector3 } from "./utils/geo";
import { altitudeToZoomLevel } from "./utils/zoomLevels";
import { EARTH_RADIUS } from "./utils/constants";

function haversineApprox(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return dLat * dLat + dLng * dLng;
}

/**
 * Zoom-aware geographic labels with simple screen-space de-overlap
 * via priority + distance-to-focus filtering.
 */
export function MapLabels() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const labelsOn = useEarthStore((s) => s.layers.labels);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);

  const level = altitudeToZoomLevel(altitudeM);

  const visible = useMemo(() => {
    if (!labelsOn || !level.showLabels) return [];

    const kinds = new Set(level.labelKinds);
    const candidates = MAP_LABELS.filter(
      (l) =>
        kinds.has(l.kind) &&
        zoomLevel >= l.minLevel &&
        zoomLevel <= l.maxLevel,
    );

    // Prefer labels near focus as we zoom in
    const sorted = [...candidates].sort((a, b) => {
      const da = haversineApprox(focusLat, focusLng, a.lat, a.lng);
      const db = haversineApprox(focusLat, focusLng, b.lat, b.lng);
      if (zoomLevel >= 3 && Math.abs(da - db) > 0.01) return da - db;
      return b.priority - a.priority;
    });

    const maxCount =
      zoomLevel <= 1 ? 6 : zoomLevel <= 3 ? 12 : zoomLevel <= 5 ? 18 : 24;

    // Greedy de-overlap in lat/lng space
    const accepted: typeof sorted = [];
    const minSep =
      zoomLevel <= 2 ? 18 : zoomLevel <= 4 ? 4 : zoomLevel <= 6 ? 0.35 : 0.08;

    for (const label of sorted) {
      if (accepted.length >= maxCount) break;
      const overlaps = accepted.some(
        (o) =>
          haversineApprox(label.lat, label.lng, o.lat, o.lng) <
          minSep * minSep,
      );
      if (!overlaps) accepted.push(label);
    }

    return accepted;
  }, [labelsOn, level, zoomLevel, focusLat, focusLng]);

  if (!visible.length) return null;

  return (
    <group>
      {visible.map((label) => {
        const pos = latLngToVector3(
          label.lat,
          label.lng,
          EARTH_RADIUS * 1.004,
        );
        const sizeClass =
          label.kind === "continent"
            ? "earth-label--continent"
            : label.kind === "country"
              ? "earth-label--country"
              : label.kind === "city"
                ? "earth-label--city"
                : "earth-label--street";

        return (
          <Html
            key={label.id}
            position={pos}
            center
            style={{ pointerEvents: "none" }}
            zIndexRange={[10, 0]}
            occlude={false}
          >
            <div className={`earth-label ${sizeClass}`}>{label.name}</div>
          </Html>
        );
      })}
    </group>
  );
}
