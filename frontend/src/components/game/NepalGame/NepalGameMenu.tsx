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
      // Start higher so users stay in a readable 3D map context on takeoff.
      elevM: city.elevationM + 3200,
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
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: transparent;
          border: none;
          border-radius: 0;
          overflow: hidden;
          z-index: 1;
        }

        .nepal-menu__header {
          padding: 24px 24px 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: transparent;
          position: relative;
        }

        .nepal-menu__header::before {
          display: none;
        }

        .nepal-menu__title {
          font-size: 24px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .nepal-menu__score {
          font-size: 16px;
          font-weight: 500;
          color: #6b7280;
        }

        .nepal-menu__tabs {
          display: flex;
          gap: 0;
          padding: 0 24px;
          background: transparent;
          border-bottom: 1px solid #e5e7eb;
        }

        .nepal-menu__tab {
          flex: 1;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: capitalize;
        }

        .nepal-menu__tab:hover {
          background: #f9fafb;
          color: #374151;
        }

        .nepal-menu__tab--active {
          background: transparent;
          border-bottom-color: #3b82f6;
          color: #3b82f6;
          font-weight: 600;
        }

        .nepal-menu__content {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
        }

        .nepal-menu__content::-webkit-scrollbar {
          width: 6px;
        }

        .nepal-menu__content::-webkit-scrollbar-track {
          background: #f3f4f6;
        }

        .nepal-menu__content::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        .nepal-menu__content::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        .nepal-menu__section-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nepal-menu__section-title::before {
          content: "";
          width: 4px;
          height: 16px;
          background: #3b82f6;
          border-radius: 2px;
        }

        .nepal-menu__challenges {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .nepal-menu__challenge {
          padding: 16px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .nepal-menu__challenge:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #3b82f6;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        .nepal-menu__challenge--completed {
          opacity: 0.7;
          cursor: not-allowed;
          background: #f0fdf4;
          border-color: #10b981;
        }

        .nepal-menu__challenge-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .nepal-menu__challenge-name {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          line-height: 1.4;
        }

        .nepal-menu__challenge-check {
          color: #10b981;
          font-size: 18px;
          margin-left: 8px;
        }

        .nepal-menu__challenge-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .nepal-menu__challenge-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          padding-top: 8px;
          border-top: 1px solid #f3f4f6;
        }

        .nepal-menu__challenge-difficulty {
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          font-size: 11px;
          padding: 2px 6px;
          background: #f3f4f6;
          border-radius: 4px;
        }

        .nepal-menu__challenge-points {
          color: #f59e0b;
          font-weight: 600;
          font-size: 13px;
        }

        .nepal-menu__list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nepal-menu__list-item {
          display: flex;
          gap: 12px;
          padding: 14px 16px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .nepal-menu__list-item:hover {
          background: #f8fafc;
          border-color: #3b82f6;
          transform: translateX(2px);
        }

        .nepal-menu__list-item--found {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .nepal-menu__list-content {
          flex: 1;
          min-width: 0;
        }

        .nepal-menu__list-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .nepal-menu__found-badge {
          color: #10b981;
          font-size: 14px;
        }

        .nepal-menu__list-detail {
          font-size: 12px;
          color: #6b7280;
          font-weight: 400;
        }

        .nepal-menu__actions {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .nepal-menu__button {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nepal-menu__button--secondary {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          color: #374151;
        }

        .nepal-menu__button--secondary:hover {
          background: #e5e7eb;
          transform: translateY(-1px);
        }

        .nepal-menu__flight-active {
          padding: 20px;
          background: #f0f9ff;
          border: 2px solid #0ea5e9;
          border-radius: 12px;
          text-align: center;
        }

        .nepal-menu__flight-status {
          font-size: 18px;
          font-weight: 600;
          color: #0ea5e9;
          margin-bottom: 8px;
        }

        .nepal-menu__flight-info {
          font-size: 14px;
          color: #374151;
          line-height: 1.5;
          margin: 0;
        }

        @media (max-width: 768px) {
          .nepal-menu {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
