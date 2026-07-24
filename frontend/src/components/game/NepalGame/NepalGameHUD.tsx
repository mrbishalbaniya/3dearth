"use client";

import { useEffect, useState } from "react";
import { useEarthStore } from "@/components/earth/store/earthStore";
import { useNepalGameStore } from "./nepalGameStore";
import { NEPAL_CITIES, NEPAL_MOUNTAINS } from "./nepalConfig";

export function NepalGameHUD() {
  const mode = useNepalGameStore((s) => s.mode);
  const score = useNepalGameStore((s) => s.score);
  const currentChallenge = useNepalGameStore((s) => s.currentChallenge);
  const citiesFound = useNepalGameStore((s) => s.citiesFound);
  const mountainsFound = useNepalGameStore((s) => s.mountainsFound);
  const totalDistance = useNepalGameStore((s) => s.totalDistance);
  const totalFlightTime = useNepalGameStore((s) => s.totalFlightTime);

  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const altitudeM = useEarthStore((s) => s.altitudeM);

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Challenge timer
  useEffect(() => {
    if (!currentChallenge?.timeLimit) {
      setTimeRemaining(null);
      return;
    }

    setTimeRemaining(currentChallenge.timeLimit);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentChallenge]);

  // Handle challenge timeout separately
  useEffect(() => {
    if (timeRemaining === 0 && currentChallenge) {
      useNepalGameStore.getState().completeChallenge(false);
    }
  }, [timeRemaining, currentChallenge]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDistance = (km: number) => {
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
  };

  return (
    <div className="nepal-hud">
      {/* Score Display */}
      <div className="nepal-hud__score">
        <div className="nepal-hud__score-label">Score</div>
        <div className="nepal-hud__score-value">{score}</div>
      </div>

      {/* Progress Stats */}
      <div className="nepal-hud__stats">
        <div className="nepal-hud__stat">
          <span className="nepal-hud__stat-value">
            {citiesFound.length}/{NEPAL_CITIES.length}
          </span>
          <span className="nepal-hud__stat-label">Cities</span>
        </div>
        <div className="nepal-hud__stat">
          <span className="nepal-hud__stat-value">
            {mountainsFound.length}/{NEPAL_MOUNTAINS.length}
          </span>
          <span className="nepal-hud__stat-label">Mountains</span>
        </div>
        {totalDistance > 0 && (
          <div className="nepal-hud__stat">
            <span className="nepal-hud__stat-value">
              {formatDistance(totalDistance)}
            </span>
            <span className="nepal-hud__stat-label">Distance</span>
          </div>
        )}
      </div>

      {/* Current Challenge */}
      {currentChallenge && (
        <div className="nepal-hud__challenge">
          <div className="nepal-hud__challenge-header">
            <h3 className="nepal-hud__challenge-title">
              {currentChallenge.title}
            </h3>
          </div>
          <div className="nepal-hud__challenge-description">
            {currentChallenge.description}
          </div>
          <div className="nepal-hud__challenge-footer">
            <div className="nepal-hud__challenge-points">
              {currentChallenge.points} points
            </div>
            {timeRemaining !== null && (
              <div
                className={`nepal-hud__challenge-timer ${
                  timeRemaining < 20 ? "nepal-hud__challenge-timer--warning" : ""
                }`}
              >
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Location Info */}
      <div className="nepal-hud__location">
        <div className="nepal-hud__location-coords">
          {focusLat.toFixed(4)}°N, {focusLng.toFixed(4)}°E
        </div>
        <div className="nepal-hud__location-altitude">
          Altitude: {(altitudeM / 1000).toFixed(1)}km
        </div>
      </div>

      <style jsx>{`
        .nepal-hud {
          position: absolute;
          top: 100px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 340px;
          pointer-events: none;
          z-index: 100;
          animation: slideInRight 0.4s ease-out;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .nepal-hud__score {
          background: linear-gradient(
            135deg,
            rgba(10, 14, 22, 0.95),
            rgba(20, 24, 36, 0.90)
          );
          backdrop-filter: blur(16px);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 16px;
          padding: 20px 28px;
          text-align: center;
          pointer-events: auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(251, 191, 36, 0.15);
          position: relative;
          overflow: hidden;
        }

        .nepal-hud__score::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #dc2626, #fbbf24, #1e40af);
        }

        .nepal-hud__score-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.55);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .nepal-hud__score-value {
          font-size: 42px;
          font-weight: 800;
          color: #fbbf24;
          text-shadow: 0 0 24px rgba(251, 191, 36, 0.6),
                       0 4px 8px rgba(0, 0, 0, 0.4);
          font-variant-numeric: tabular-nums;
        }

        .nepal-hud__stats {
          display: flex;
          gap: 12px;
          background: linear-gradient(
            135deg,
            rgba(10, 14, 22, 0.92),
            rgba(20, 24, 36, 0.88)
          );
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 14px 12px;
          pointer-events: auto;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .nepal-hud__stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 8px 4px;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .nepal-hud__stat:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .nepal-hud__stat-value {
          font-size: 19px;
          font-weight: 700;
          color: white;
          font-variant-numeric: tabular-nums;
        }

        .nepal-hud__stat-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.55);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 600;
        }

        .nepal-hud__challenge {
          background: linear-gradient(
            135deg,
            rgba(220, 38, 38, 0.92),
            rgba(239, 68, 68, 0.88)
          );
          backdrop-filter: blur(16px);
          border: 2px solid rgba(251, 191, 36, 0.4);
          border-radius: 18px;
          padding: 22px;
          pointer-events: auto;
          box-shadow: 0 12px 40px rgba(220, 38, 38, 0.4),
                      0 0 0 1px rgba(251, 191, 36, 0.2);
          animation: challengePulse 3s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }

        .nepal-hud__challenge::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #fbbf24, #dc2626, #1e40af);
        }

        @keyframes challengePulse {
          0%, 100% {
            box-shadow: 0 12px 40px rgba(220, 38, 38, 0.4),
                        0 0 0 1px rgba(251, 191, 36, 0.2);
          }
          50% {
            box-shadow: 0 16px 48px rgba(220, 38, 38, 0.6),
                        0 0 0 1px rgba(251, 191, 36, 0.4);
          }
        }

        .nepal-hud__challenge-header {
          margin-bottom: 14px;
        }

        .nepal-hud__challenge-title {
          font-size: 19px;
          font-weight: 800;
          color: white;
          margin: 0;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }

        .nepal-hud__challenge-description {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.5;
          margin-bottom: 14px;
          font-weight: 500;
        }

        .nepal-hud__challenge-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .nepal-hud__challenge-points {
          font-size: 15px;
          font-weight: 700;
          color: #fbbf24;
          text-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
        }

        .nepal-hud__challenge-timer {
          font-size: 20px;
          font-weight: 800;
          color: white;
          font-variant-numeric: tabular-nums;
          background: rgba(0, 0, 0, 0.3);
          padding: 6px 12px;
          border-radius: 8px;
        }

        .nepal-hud__challenge-timer--warning {
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.2);
          animation: timerBlink 1s ease-in-out infinite;
        }

        @keyframes timerBlink {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.05);
          }
        }

        .nepal-hud__location {
          background: linear-gradient(
            135deg,
            rgba(10, 14, 22, 0.85),
            rgba(20, 24, 36, 0.80)
          );
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.65);
          pointer-events: auto;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .nepal-hud__location-coords {
          font-variant-numeric: tabular-nums;
          margin-bottom: 6px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.75);
          font-size: 13px;
        }

        .nepal-hud__location-altitude {
          font-variant-numeric: tabular-nums;
          color: rgba(255, 255, 255, 0.5);
          font-size: 11px;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .nepal-hud {
            top: 100px;
            right: 12px;
            left: auto;
            max-width: 280px;
            gap: 12px;
          }

          .nepal-hud__score {
            padding: 16px 20px;
          }

          .nepal-hud__score-value {
            font-size: 34px;
          }

          .nepal-hud__challenge-title {
            font-size: 17px;
          }

          .nepal-hud__stats {
            gap: 8px;
            padding: 12px 10px;
          }

          .nepal-hud__stat-value {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
