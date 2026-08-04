"use client";

import { useEffect, useState } from "react";
import type { FlightCorridor, StreamingState } from "./FlightCorridorEngine";
import { useEarthStore } from "../store/earthStore";

interface StreamingDebugPanelProps {
  corridor: FlightCorridor | null;
  state: StreamingState;
  fps: number;
  frameTimeMs: number;
}

export function StreamingDebugPanel({
  corridor,
  state,
  fps,
  frameTimeMs,
}: StreamingDebugPanelProps) {
  const [visible, setVisible] = useState(false);
  
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const altitudeM = useEarthStore((s) => s.altitudeM);

  // Toggle with keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        setVisible(v => !v);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!visible) {
    return (
      <div className="debug-hint">
        Press F3 to toggle debug panel
        <style jsx>{`
          .debug-hint {
            position: fixed;
            bottom: 10px;
            left: 10px;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.6);
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            font-family: monospace;
            border-radius: 4px;
            z-index: 1000;
          }
        `}</style>
      </div>
    );
  }

  const currentPoint = corridor?.routePoints[corridor.currentIndex];
  const distanceRemaining = corridor
    ? corridor.totalDistanceNm - (currentPoint?.distanceFromStartNm ?? 0)
    : 0;

  return (
    <div className="debug-panel">
      <div className="debug-panel__header">
        <h3>Flight Corridor Streaming Debug</h3>
        <button onClick={() => setVisible(false)}>×</button>
      </div>

      <div className="debug-panel__content">
        {/* Performance */}
        <section>
          <h4>Performance</h4>
          <div className="debug-row">
            <span>FPS:</span>
            <span className={fps < 30 ? "warn" : ""}>{fps.toFixed(1)}</span>
          </div>
          <div className="debug-row">
            <span>Frame Time:</span>
            <span className={frameTimeMs > 16.6 ? "warn" : ""}>{frameTimeMs.toFixed(2)}ms</span>
          </div>
        </section>

        {/* Memory */}
        <section>
          <h4>Memory</h4>
          <div className="debug-row">
            <span>Usage:</span>
            <span className={state.memoryUsageMB > state.maxMemoryMB * 0.9 ? "warn" : ""}>
              {state.memoryUsageMB.toFixed(1)} / {state.maxMemoryMB} MB
            </span>
          </div>
          <div className="debug-progress">
            <div
              className="debug-progress__bar"
              style={{
                width: `${Math.min(100, (state.memoryUsageMB / state.maxMemoryMB) * 100)}%`,
              }}
            />
          </div>
        </section>

        {/* Tiles */}
        <section>
          <h4>Tiles</h4>
          <div className="debug-row">
            <span>Loaded:</span>
            <span>{state.loadedTiles.size}</span>
          </div>
          <div className="debug-row">
            <span>Queued:</span>
            <span>{state.queuedTiles.size}</span>
          </div>
          <div className="debug-row">
            <span>Cached:</span>
            <span>{state.cachedTiles.size}</span>
          </div>
          <div className="debug-row">
            <span>Load Queue:</span>
            <span>{state.loadQueue.length}</span>
          </div>
          <div className="debug-row">
            <span>Unload Queue:</span>
            <span>{state.unloadQueue.length}</span>
          </div>
        </section>

        {/* Aircraft Position */}
        <section>
          <h4>Aircraft</h4>
          <div className="debug-row">
            <span>Latitude:</span>
            <span>{focusLat.toFixed(6)}°</span>
          </div>
          <div className="debug-row">
            <span>Longitude:</span>
            <span>{focusLng.toFixed(6)}°</span>
          </div>
          <div className="debug-row">
            <span>Altitude:</span>
            <span>{altitudeM.toFixed(0)}m</span>
          </div>
        </section>

        {/* Flight Corridor */}
        {corridor && (
          <section>
            <h4>Flight Corridor</h4>
            <div className="debug-row">
              <span>Route:</span>
              <span>{corridor.departure} → {corridor.destination}</span>
            </div>
            <div className="debug-row">
              <span>Total Distance:</span>
              <span>{corridor.totalDistanceNm.toFixed(1)} NM</span>
            </div>
            <div className="debug-row">
              <span>Distance Remaining:</span>
              <span>{distanceRemaining.toFixed(1)} NM</span>
            </div>
            <div className="debug-row">
              <span>Progress:</span>
              <span>
                {((currentPoint?.distanceFromStartNm ?? 0) / corridor.totalDistanceNm * 100).toFixed(1)}%
              </span>
            </div>
            <div className="debug-row">
              <span>Waypoint:</span>
              <span>{corridor.currentIndex + 1} / {corridor.routePoints.length}</span>
            </div>
            <div className="debug-row">
              <span>Streaming Radius:</span>
              <span>{(corridor.streamingRadiusM / 1000).toFixed(1)} km</span>
            </div>
          </section>
        )}

        {/* Current Waypoint */}
        {currentPoint && (
          <section>
            <h4>Current Waypoint</h4>
            <div className="debug-row">
              <span>Position:</span>
              <span>
                {currentPoint.lat.toFixed(6)}°, {currentPoint.lng.toFixed(6)}°
              </span>
            </div>
            <div className="debug-row">
              <span>Altitude:</span>
              <span>{currentPoint.altitudeM.toFixed(0)}m</span>
            </div>
            <div className="debug-row">
              <span>Bearing:</span>
              <span>{currentPoint.bearingDeg.toFixed(1)}°</span>
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        .debug-panel {
          position: fixed;
          top: 10px;
          left: 10px;
          width: 360px;
          max-height: calc(100vh - 20px);
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #fff;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          overflow-y: auto;
          z-index: 10000;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .debug-panel__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          position: sticky;
          top: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 1;
        }

        .debug-panel__header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #4ade80;
        }

        .debug-panel__header button {
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          color: #fff;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          transition: all 0.2s;
        }

        .debug-panel__header button:hover {
          background: rgba(239, 68, 68, 0.8);
        }

        .debug-panel__content {
          padding: 16px;
        }

        section {
          margin-bottom: 20px;
        }

        section:last-child {
          margin-bottom: 0;
        }

        h4 {
          margin: 0 0 8px 0;
          font-size: 12px;
          font-weight: 700;
          color: #60a5fa;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .debug-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .debug-row span:first-child {
          color: rgba(255, 255, 255, 0.6);
        }

        .debug-row span:last-child {
          color: #4ade80;
          font-weight: 600;
        }

        .debug-row .warn {
          color: #fbbf24;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .debug-progress {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 4px;
        }

        .debug-progress__bar {
          height: 100%;
          background: linear-gradient(90deg, #4ade80, #22c55e);
          transition: width 0.3s ease;
        }

        .debug-hint {
          position: fixed;
          bottom: 10px;
          left: 10px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.6);
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          font-family: monospace;
          border-radius: 4px;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
}
