"use client";

import { useEarthStore } from "../../store/earthStore";
import { formatCoordinate } from "../../utils/geo";
import { formatSeaLevel } from "../hypsometric";

export function MeasureInfoPanel() {
  const sample = useEarthStore((s) => s.dryEarth.measureSample);
  const profile = useEarthStore((s) => s.dryEarth.profile);
  const measureMode = useEarthStore((s) => s.dryEarth.measureMode);
  const crossSectionMode = useEarthStore((s) => s.dryEarth.crossSectionMode);
  const enabled = useEarthStore((s) => s.dryEarth.enabled);
  const draft = useEarthStore((s) => s.dryEarth.profileDraft);

  if (!enabled || (!measureMode && !crossSectionMode && !sample && !profile))
    return null;

  return (
    <div className="dry-info" aria-live="polite">
      {measureMode && (
        <div className="dry-info__hint">Click the globe to measure</div>
      )}
      {crossSectionMode && (
        <div className="dry-info__hint">
          Click two points for a terrain profile
          {draft.length === 1 ? " · pick end point" : ""}
        </div>
      )}

      {sample && (
        <div className="dry-info__card">
          <div className="dry-info__title">Measurement</div>
          <dl className="dry-info__grid">
            <dt>Coords</dt>
            <dd>{formatCoordinate(sample.lat, sample.lng)}</dd>
            <dt>Elevation</dt>
            <dd>{Math.round(sample.elevationM).toLocaleString()} m</dd>
            <dt>Ocean depth</dt>
            <dd>
              {sample.depthM > 0
                ? `${Math.round(sample.depthM).toLocaleString()} m`
                : "—"}
            </dd>
            <dt>Water depth</dt>
            <dd>
              {sample.waterDepthM > 0
                ? `${Math.round(sample.waterDepthM).toLocaleString()} m`
                : "dry"}
            </dd>
            <dt>Slope</dt>
            <dd>{sample.slopeDeg.toFixed(1)}°</dd>
            <dt>Terrain</dt>
            <dd>{sample.terrainType}</dd>
            <dt>Dist. to sea</dt>
            <dd>
              {sample.distanceToSeaM > 0
                ? `${Math.round(sample.distanceToSeaM).toLocaleString()} m`
                : "—"}
            </dd>
            <dt>Sea level</dt>
            <dd>{formatSeaLevel(sample.seaLevelM)}</dd>
            {sample.country ? (
              <>
                <dt>Region</dt>
                <dd>{sample.country}</dd>
              </>
            ) : null}
          </dl>
        </div>
      )}

      {profile && (
        <div className="dry-info__card">
          <div className="dry-info__title">Cross section</div>
          <dl className="dry-info__grid">
            <dt>Distance</dt>
            <dd>
              {profile.distanceM >= 1000
                ? `${(profile.distanceM / 1000).toFixed(1)} km`
                : `${Math.round(profile.distanceM)} m`}
            </dd>
            <dt>Highest</dt>
            <dd>{Math.round(profile.highestM).toLocaleString()} m</dd>
            <dt>Lowest</dt>
            <dd>{Math.round(profile.lowestM).toLocaleString()} m</dd>
            <dt>Average</dt>
            <dd>{Math.round(profile.averageM).toLocaleString()} m</dd>
            <dt>Mean slope</dt>
            <dd>{profile.meanSlopeDeg.toFixed(1)}°</dd>
          </dl>
          <ProfileSparkline points={profile.points} />
        </div>
      )}
    </div>
  );
}

function ProfileSparkline({
  points,
}: {
  points: Array<{ elevationM: number; distanceM: number }>;
}) {
  if (points.length < 2) return null;
  const w = 220;
  const h = 64;
  const minE = Math.min(...points.map((p) => p.elevationM));
  const maxE = Math.max(...points.map((p) => p.elevationM));
  const span = Math.max(1, maxE - minE);
  const maxD = points[points.length - 1].distanceM || 1;
  const d = points
    .map((p, i) => {
      const x = (p.distanceM / maxD) * w;
      const y = h - ((p.elevationM - minE) / span) * (h - 8) - 4;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      className="dry-profile-svg"
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden
    >
      <path d={d} fill="none" stroke="rgba(120,200,255,0.85)" strokeWidth={1.5} />
    </svg>
  );
}
