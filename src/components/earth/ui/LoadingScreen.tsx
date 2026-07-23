"use client";

import { useEarthStore } from "../store/earthStore";

export function LoadingScreen() {
  const progress = useEarthStore((s) => s.loadingProgress);

  return (
    <div className="earth-loading" role="status" aria-live="polite">
      <div className="earth-loading__orb" />
      <div className="earth-loading__label">Loading Earth</div>
      <div className="earth-loading__bar">
        <div
          className="earth-loading__fill"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <div className="earth-loading__pct">{Math.round(progress)}%</div>
    </div>
  );
}
