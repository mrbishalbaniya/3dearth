"use client";

/**
 * Dynamic scale bar — meters / km based on altitude & FOV.
 */
import { useMemo } from "react";
import { useEarthStore } from "../store/earthStore";

function niceLength(meters: number): { value: number; label: string } {
  const targets = [
    5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000,
    100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
  ];
  let best = targets[0];
  for (const t of targets) {
    if (t <= meters) best = t;
    else break;
  }
  if (best >= 1000) {
    return { value: best, label: `${best / 1000} km` };
  }
  return { value: best, label: `${best} m` };
}

export function ScaleBar() {
  const altitudeM = useEarthStore((s) => s.altitudeM);

  const { label, widthPx } = useMemo(() => {
    // Approximate ground width across ~120px of screen at current altitude
    const groundWidth = altitudeM * 0.85;
    const nice = niceLength(groundWidth * 0.35);
    const px = Math.max(40, Math.min(140, (nice.value / groundWidth) * 220));
    return { label: nice.label, widthPx: px };
  }, [altitudeM]);

  return (
    <div className="earth-scalebar" aria-label={`Scale ${label}`}>
      <div className="earth-scalebar__bar" style={{ width: widthPx }} />
      <span className="earth-scalebar__label">{label}</span>
    </div>
  );
}
