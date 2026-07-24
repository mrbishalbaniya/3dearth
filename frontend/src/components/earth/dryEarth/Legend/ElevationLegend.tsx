"use client";

import { useEarthStore } from "../../store/earthStore";
import {
  elevToHypsometricHex,
  formatElevDepth,
  formatSeaLevel,
} from "../hypsometric";
import { HYPSO_STOPS, SEA_LEVEL_MAX_M, SEA_LEVEL_MIN_M } from "../constants";

export function ElevationLegend() {
  const enabled = useEarthStore((s) => s.dryEarth.enabled);
  const show = useEarthStore((s) => s.dryEarth.showLegend);
  const displaySea = useEarthStore((s) => s.dryEarth.displaySeaLevelM);
  const sample = useEarthStore((s) => s.dryEarth.measureSample);
  const altitudeM = useEarthStore((s) => s.altitudeM);

  if (!enabled || !show) return null;

  const { altitudeLabel, depthLabel } = sample
    ? formatElevDepth(sample.elevationM, displaySea)
    : { altitudeLabel: "—", depthLabel: "—" };

  return (
    <div className="dry-legend" aria-label="Elevation legend">
      <div className="dry-legend__title">Elevation vs MSL</div>
      <div
        className="dry-legend__ramp"
        style={{
          background: `linear-gradient(to bottom, ${HYPSO_STOPS.map((s) => elevToHypsometricHex(s.elev)).join(", ")})`,
        }}
      />
      <div className="dry-legend__ticks">
        <span>+{SEA_LEVEL_MAX_M.toLocaleString()} m</span>
        <span>0 m MSL</span>
        <span>{SEA_LEVEL_MIN_M.toLocaleString()} m</span>
      </div>
      <div className="dry-legend__stats">
        <div>
          <span className="dry-legend__k">Water level</span>
          <span className="dry-legend__v">{formatSeaLevel(displaySea)}</span>
        </div>
        <div>
          <span className="dry-legend__k">Camera alt</span>
          <span className="dry-legend__v">
            {altitudeM >= 1000
              ? `${(altitudeM / 1000).toFixed(0)} km`
              : `${Math.round(altitudeM)} m`}
          </span>
        </div>
        <div>
          <span className="dry-legend__k">Point alt</span>
          <span className="dry-legend__v">{altitudeLabel}</span>
        </div>
        <div>
          <span className="dry-legend__k">Point depth</span>
          <span className="dry-legend__v">{depthLabel}</span>
        </div>
      </div>
    </div>
  );
}
