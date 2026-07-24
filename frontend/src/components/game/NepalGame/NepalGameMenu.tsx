"use client";

import { useNepalGameStore } from "./nepalGameStore";
import { NEPAL_CHALLENGES, NEPAL_CITIES, NEPAL_MOUNTAINS } from "./nepalConfig";
import { useEarthStore } from "@/components/earth/store/earthStore";
import { useGameStore } from "../store/gameStore";

export function NepalGameMenu() {
  const mode = useNepalGameStore((s) => s.mode);
  const setMode = useNepalGameStore((s) => s.setMode);
  const startChallenge = useNepalGameStore((s) => s.startChallenge);
  const challengesCompleted = useNepalGameStore((s) => s.challengesCompleted);
  const score = useNepalGameStore((s) => s.score);
  const resetGame = useNepalGameStore((s) => s.resetGame);
  const citiesFound = useNepalGameStore((s) => s.citiesFound);
  const mountainsFound = useNepalGameStore((s) => s.mountainsFound);

  const requestFlyTo = useEarthStore((s) => s.requestFlyTo);
  const beginFlight = useGameStore((s) => s.beginFlight);
  const gameMode = useGameStore((s) => s.mode);

  const handleCityClick = (cityId: string) => {
    const city = NEPAL_CITIES.find((c) => c.id === cityId);
    if (!city) return;
    requestFlyTo({
      lat: city.lat,
      lng: city.lng,
      altitude: 50000,
      duration: 2000,
    });
  };

  const handleMountainClick = (mountainId: string) => {
    const mountain = NEPAL_MOUNTAINS.find((m) => m.id === mountainId);
    if (!mountain) return;
    requestFlyTo({
      lat: mountain.lat,
      lng: mountain.lng,
      altitude: 30000,
      duration: 2000,
    });
  };

  const handleChallengeStart = (challengeId: string) => {
    const challenge = NEPAL_CHALLENGES.find((c) => c.id === challengeId);
    if (!challenge) return;
    startChallenge(challenge);
  };

  const handleStartFlight = (cityId: string) => {
    const city = NEPAL_CITIES.find((c) => c.id === cityId);
    if (!city) return;
    beginFlight({
      lat: city.lat,
      lng: city.lng,
      elevM: city.elevationM + 500, // Start 500m above city
      headingDeg: 0,
    });
  };

  return (
    <div className="nepal-menu">
      <div className="nepal-menu__header">
        <h1 className="nepal-menu__title">Explore Nepal</h1>
        <div className="nepal-menu__score">Score: {score}</div>
      </div>

      <div className="nepal-menu__tabs">
        <button
          className={`nepal-menu__tab ${mode === "explore" ? "nepal-menu__tab--active" : ""}`}
          onClick={() => setMode("explore")}
        >
          Explore
        </button>
        <button
          className={`nepal-menu__tab ${mode === "flight" ? "nepal-menu__tab--active" : ""}`}
          onClick={() => setMode("flight")}
        >
          Flight
        </button>
        <button
          className={`nepal-menu__tab ${mode === "city_finder" ? "nepal-menu__tab--active" : ""}`}
          onClick={() => setMode("city_finder")}
        >
          Cities
        </button>
        <button
          className={`nepal-menu__tab ${mode === "mountain_challenge" ? "nepal-menu__tab--active" : ""}`}
          onClick={() => setMode("mountain_challenge")}
        >
          Mountains
        </button>
      </div>

      <div className="nepal-menu__content">
        {mode === "explore" && (
          <div className="nepal-menu__section">
            <h3 className="nepal-menu__section-title">Challenges</h3>
            <div className="nepal-menu__challenges">
              {NEPAL_CHALLENGES.map((challenge) => {
                const completed = challengesCompleted.includes(challenge.id);
                return (
                  <button
                    key={challenge.id}
                    className={`nepal-menu__challenge ${completed ? "nepal-menu__challenge--completed" : ""}`}
                    onClick={() => !completed && handleChallengeStart(challenge.id)}
                    disabled={completed}
                  >
                    <div className="nepal-menu__challenge-header">
                      <span className="nepal-menu__challenge-name">
                        {challenge.title}
                      </span>
                      {completed && (
                        <span className="nepal-menu__challenge-check">✓</span>
                      )}
                    </div>
                    <div className="nepal-menu__challenge-subtitle">
                      {challenge.titleNe}
                    </div>
                    <div className="nepal-menu__challenge-footer">
                      <span className="nepal-menu__challenge-difficulty">
                        {challenge.difficulty}
                      </span>
                      <span className="nepal-menu__challenge-points">
                        {challenge.points} pts
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="nepal-menu__actions">
              <button
                className="nepal-menu__button nepal-menu__button--secondary"
                onClick={resetGame}
              >
                Reset Game
              </button>
            </div>
          </div>
        )}

        {mode === "flight" && (
          <div className="nepal-menu__section">
            <h3 className="nepal-menu__section-title">
              {gameMode === "flight" ? "In Flight" : "Select Departure City"}
            </h3>
            {gameMode === "flight" ? (
              <div className="nepal-menu__flight-active">
                <div className="nepal-menu__flight-status">
                  Flight in Progress
                </div>
                <p className="nepal-menu__flight-info">
                  Use WASD to control the aircraft. Press ESC to end flight.
                </p>
              </div>
            ) : (
              <div className="nepal-menu__list">
                {NEPAL_CITIES.map((city) => (
                  <button
                    key={city.id}
                    className="nepal-menu__list-item nepal-menu__flight-city"
                    onClick={() => handleStartFlight(city.id)}
                  >
                    <div className="nepal-menu__list-content">
                      <div className="nepal-menu__list-name">
                        {city.name}
                      </div>
                      <div className="nepal-menu__list-detail">
                        {city.description} • Elevation: {city.elevationM}m
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === "city_finder" && (
          <div className="nepal-menu__section">
            <h3 className="nepal-menu__section-title">
              Cities ({citiesFound.length}/{NEPAL_CITIES.length})
            </h3>
            <div className="nepal-menu__list">
              {NEPAL_CITIES.map((city) => {
                const found = citiesFound.includes(city.id);
                return (
                  <button
                    key={city.id}
                    className={`nepal-menu__list-item ${found ? "nepal-menu__list-item--found" : ""}`}
                    onClick={() => handleCityClick(city.id)}
                  >
                    <div className="nepal-menu__list-content">
                      <div className="nepal-menu__list-name">
                        {city.name}
                        {found && <span className="nepal-menu__found-badge">✓</span>}
                      </div>
                      <div className="nepal-menu__list-detail">
                        {city.description} • {city.elevationM}m
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === "mountain_challenge" && (
          <div className="nepal-menu__section">
            <h3 className="nepal-menu__section-title">
              8000m+ Peaks ({mountainsFound.length}/{NEPAL_MOUNTAINS.length})
            </h3>
            <div className="nepal-menu__list">
              {NEPAL_MOUNTAINS.map((mountain) => {
                const found = mountainsFound.includes(mountain.id);
                return (
                  <button
                    key={mountain.id}
                    className={`nepal-menu__list-item ${found ? "nepal-menu__list-item--found" : ""}`}
                    onClick={() => handleMountainClick(mountain.id)}
                  >
                    <div className="nepal-menu__list-content">
                      <div className="nepal-menu__list-name">
                        {mountain.name}
                        {found && <span className="nepal-menu__found-badge">✓</span>}
                      </div>
                      <div className="nepal-menu__list-detail">
                        Rank #{mountain.rank} • {mountain.elevationM}m • {mountain.range}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .nepal-menu {
          position: absolute;
          top: 100px;
          left: 20px;
          width: 400px;
          max-height: calc(100vh - 140px);
          background: linear-gradient(
            145deg,
            rgba(10, 14, 22, 0.95) 0%,
            rgba(20, 24, 36, 0.92) 100%
          );
          backdrop-filter: blur(20px);
          border: 1px solid rgba(251, 191, 36, 0.2);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(251, 191, 36, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          z-index: 100;
          animation: slideIn 0.4s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .nepal-menu__header {
          padding: 28px 24px;
          border-bottom: 1px solid rgba(251, 191, 36, 0.15);
          background: linear-gradient(
            135deg,
            rgba(220, 38, 38, 0.25),
            rgba(30, 64, 175, 0.2)
          );
          position: relative;
          overflow: hidden;
        }

        .nepal-menu__header::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(
            90deg,
            #dc2626,
            #fbbf24,
            #1e40af
          );
        }

        .nepal-menu__title {
          font-size: 30px;
          font-weight: 800;
          color: white;
          margin: 0 0 14px 0;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .nepal-menu__score {
          font-size: 22px;
          font-weight: 700;
          color: #fbbf24;
          text-shadow: 0 0 16px rgba(251, 191, 36, 0.5);
        }

        .nepal-menu__tabs {
          display: flex;
          gap: 8px;
          padding: 16px 16px 0 16px;
          background: rgba(0, 0, 0, 0.3);
        }

        .nepal-menu__tab {
          flex: 1;
          padding: 14px 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: none;
          border-radius: 10px 10px 0 0;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
        }

        .nepal-menu__tab:hover {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
          transform: translateY(-2px);
        }

        .nepal-menu__tab--active {
          background: linear-gradient(
            135deg,
            rgba(220, 38, 38, 0.4),
            rgba(239, 68, 68, 0.3)
          );
          border-color: rgba(220, 38, 38, 0.6);
          color: white;
          box-shadow: 0 0 20px rgba(220, 38, 38, 0.3);
        }

        .nepal-menu__tab--active::before {
          content: "";
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #dc2626, #fbbf24);
        }

        .nepal-menu__content {
          flex: 1;
          overflow-y: auto;
          padding: 24px 20px;
        }

        .nepal-menu__content::-webkit-scrollbar {
          width: 8px;
        }

        .nepal-menu__content::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }

        .nepal-menu__content::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.3);
          border-radius: 4px;
        }

        .nepal-menu__content::-webkit-scrollbar-thumb:hover {
          background: rgba(251, 191, 36, 0.5);
        }

        .nepal-menu__section-title {
          font-size: 15px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.85);
          margin: 0 0 18px 0;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nepal-menu__section-title::before {
          content: "";
          width: 3px;
          height: 16px;
          background: linear-gradient(180deg, #dc2626, #fbbf24);
          border-radius: 2px;
        }

        .nepal-menu__challenges {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .nepal-menu__challenge {
          padding: 18px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.06),
            rgba(255, 255, 255, 0.03)
          );
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .nepal-menu__challenge::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, #dc2626, #1e40af);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .nepal-menu__challenge:hover:not(:disabled) {
          background: linear-gradient(
            135deg,
            rgba(220, 38, 38, 0.15),
            rgba(239, 68, 68, 0.1)
          );
          border-color: rgba(220, 38, 38, 0.4);
          transform: translateX(4px);
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.2);
        }

        .nepal-menu__challenge:hover:not(:disabled)::before {
          opacity: 1;
        }

        .nepal-menu__challenge--completed {
          opacity: 0.5;
          cursor: not-allowed;
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .nepal-menu__challenge-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .nepal-menu__challenge-name {
          font-size: 16px;
          font-weight: 700;
          color: white;
        }

        .nepal-menu__challenge-check {
          color: #10b981;
          font-size: 20px;
          animation: checkPop 0.4s ease-out;
        }

        @keyframes checkPop {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        .nepal-menu__challenge-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.65);
          font-family: "Noto Sans Devanagari", sans-serif;
          margin-bottom: 14px;
          line-height: 1.4;
        }

        .nepal-menu__challenge-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .nepal-menu__challenge-difficulty {
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 600;
          font-size: 11px;
        }

        .nepal-menu__challenge-points {
          color: #fbbf24;
          font-weight: 700;
          font-size: 13px;
        }

        .nepal-menu__list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .nepal-menu__list-item {
          display: flex;
          gap: 14px;
          padding: 16px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.05),
            rgba(255, 255, 255, 0.02)
          );
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s ease;
          text-align: left;
        }

        .nepal-menu__list-item:hover {
          background: linear-gradient(
            135deg,
            rgba(220, 38, 38, 0.12),
            rgba(239, 68, 68, 0.08)
          );
          border-color: rgba(220, 38, 38, 0.4);
          transform: translateX(6px);
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.15);
        }

        .nepal-menu__list-item--found {
          border-color: rgba(16, 185, 129, 0.4);
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.08),
            rgba(16, 185, 129, 0.04)
          );
        }

        .nepal-menu__list-content {
          flex: 1;
          min-width: 0;
        }

        .nepal-menu__list-name {
          font-size: 15px;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nepal-menu__found-badge {
          color: #10b981;
          font-size: 16px;
          animation: checkPop 0.4s ease-out;
        }

        .nepal-menu__list-detail {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          font-weight: 500;
        }

        .nepal-menu__actions {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nepal-menu__button {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nepal-menu__button--secondary {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
        }

        .nepal-menu__button--secondary:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .nepal-menu__flight-active {
          padding: 24px;
          background: linear-gradient(
            135deg,
            rgba(34, 197, 94, 0.15),
            rgba(16, 185, 129, 0.1)
          );
          border: 2px solid rgba(34, 197, 94, 0.3);
          border-radius: 16px;
          text-align: center;
        }

        .nepal-menu__flight-status {
          font-size: 20px;
          font-weight: 700;
          color: #22c55e;
          margin-bottom: 12px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .nepal-menu__flight-info {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 0;
        }

        @media (max-width: 768px) {
          .nepal-menu {
            top: 100px;
            left: 12px;
            right: 12px;
            width: auto;
            max-height: 60vh;
          }

          .nepal-menu__header {
            padding: 20px 18px;
          }

          .nepal-menu__title {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
