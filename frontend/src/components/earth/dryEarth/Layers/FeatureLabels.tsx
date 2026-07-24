"use client";

import { Html } from "@react-three/drei";
import { useMemo } from "react";
import { useEarthStore } from "../../store/earthStore";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS } from "../../utils/constants";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";
import { DRY_EARTH_FEATURES } from "../features";
import type { DryEarthFeature } from "../types";

function kindClass(kind: DryEarthFeature["kind"]): string {
  if (kind === "trench" || kind === "basin") return "dry-label--deep";
  if (kind === "ridge" || kind === "rise" || kind === "seamount")
    return "dry-label--ridge";
  if (kind === "peak" || kind === "range") return "dry-label--peak";
  if (kind === "desert" || kind === "valley") return "dry-label--land";
  return "dry-label--water";
}

export function FeatureLabels() {
  const enabled = useEarthStore((s) => s.dryEarth.enabled);
  const showLabels = useEarthStore((s) => s.dryEarth.showLabels);
  const displaySea = useEarthStore((s) => s.dryEarth.displaySeaLevelM);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const geological = useEarthStore((s) => s.dryEarth.geological);

  const visible = useMemo(() => {
    if (!enabled || !showLabels) return [];
    const maxDist =
      altitudeM > 4_000_000 ? 90 : altitudeM > 1_000_000 ? 50 : 28;

    return DRY_EARTH_FEATURES.filter((f) => {
      if (zoomLevel < f.minZoom) return false;
      if (f.revealBelowM != null && displaySea > f.revealBelowM) return false;
      if (f.revealAboveM != null && displaySea < f.revealAboveM) return false;
      if (f.kind === "trench" && !geological.oceanTrenches) return false;
      if (
        (f.kind === "peak" || f.kind === "range") &&
        !geological.mountainRanges
      )
        return false;
      if (f.kind === "volcano" && !geological.volcanoes) return false;

      const dLat = f.lat - focusLat;
      const dLng =
        ((((f.lng - focusLng + 540) % 360) - 180));
      return Math.hypot(dLat, dLng) < maxDist;
    }).slice(0, 24);
  }, [
    enabled,
    showLabels,
    displaySea,
    zoomLevel,
    altitudeM,
    focusLat,
    focusLng,
    geological,
  ]);

  if (!visible.length) return null;

  const lift = Math.max(40, Math.min(400, altitudeM * 0.015)) / EARTH_RADIUS_M;

  return (
    <group name="dry-earth-labels">
      {visible.map((f) => {
        const pos = latLngToVector3(f.lat, f.lng, EARTH_RADIUS + lift);
        const elevLabel =
          f.elevM < 0
            ? `${Math.round(f.elevM).toLocaleString()} m`
            : `+${Math.round(f.elevM).toLocaleString()} m`;
        return (
          <group key={f.id} position={pos}>
            <Html
              center
              distanceFactor={altitudeM > 2_000_000 ? 18 : 10}
              style={{ pointerEvents: "none" }}
              zIndexRange={[40, 0]}
            >
              <div className={`dry-label ${kindClass(f.kind)}`}>
                <span className="dry-label__name">{f.name}</span>
                <span className="dry-label__meta">{elevLabel}</span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
