"use client";

import { useEffect, useState } from "react";
import { useEarthStore } from "@/components/earth/store/earthStore";
import { useNepalGameStore } from "./store/nepalGameStore";
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
  const toggleLayer = useEarthStore((s) => s.toggleLayer);
  const atmosphere = useEarthStore((s) => s.layers.atmosphere);
  const clouds = useEarthStore((s) => s.layers.clouds);
  const dayNight = useEarthStore((s) => s.layers.dayNight);
  const borders = useEarthStore((s) => s.layers.borders);

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showMission, setShowMission] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

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
      useNepalGameStore.getState().failChallenge();
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
    <>
      {/* Quick Action Panel - Top Right */}
      <div className="nepal-hud">
        <div className="nepal-hud__quick-actions">
          <button
            className={`nepal-hud__action-btn ${showMission ? 'nepal-hud__action-btn--active' : ''}`}
            onClick={() => setShowMission(!showMission)}
            title="Mission Info"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11H5a2 2 0 0 0-2 2v7c0 1.1.9 2 2 2h11a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4" />
              <path d="M9 7V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3" />
              <path d="M9 11h6" />
            </svg>
            <span>Mission</span>
          </button>

          <button
            className={`nepal-hud__action-btn ${showStats ? 'nepal-hud__action-btn--active' : ''}`}
            onClick={() => setShowStats(!showStats)}
            title="Statistics"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-4 4 4 6-6" />
            </svg>
            <span>Stats</span>
          </button>

          <button
            className={`nepal-hud__action-btn ${showSettings ? 'nepal-hud__action-btn--active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2" />
            </svg>
            <span>Settings</span>
          </button>
        </div>

        {/* Progress Indicators */}
        <div className="nepal-hud__progress">
          <div className="nepal-progress-card">
            <div className="nepal-progress-card__header">
              <span className="nepal-progress-card__icon">🏙️</span>
              <span className="nepal-progress-card__title">Cities</span>
            </div>
            <div className="nepal-progress-card__value">{citiesFound.length}/{NEPAL_CITIES.length}</div>
            <div className="nepal-progress-card__bar">
              <div 
                className="nepal-progress-card__fill"
                style={{ width: `${(citiesFound.length / NEPAL_CITIES.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="nepal-progress-card">
            <div className="nepal-progress-card__header">
              <span className="nepal-progress-card__icon">⛰️</span>
              <span className="nepal-progress-card__title">Peaks</span>
            </div>
            <div className="nepal-progress-card__value">{mountainsFound.length}/{NEPAL_MOUNTAINS.length}</div>
            <div className="nepal-progress-card__bar">
              <div 
                className="nepal-progress-card__fill"
                style={{ width: `${(mountainsFound.length / NEPAL_MOUNTAINS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mission Panel */}
      {showMission && currentChallenge && (
        <div className="nepal-panel nepal-panel--mission">
          <div className="nepal-panel__header">
            <div className="nepal-panel__title-group">
              <h3 className="nepal-panel__title">Active Mission</h3>
              <div className="nepal-panel__badge nepal-panel__badge--active">In Progress</div>
            </div>
            <button
              className="nepal-panel__close"
              onClick={() => setShowMission(false)}
              title="Close"
            >
              ×
            </button>
          </div>
          <div className="nepal-panel__content">
            <div className="nepal-mission">
              <h4 className="nepal-mission__title">{currentChallenge.title}</h4>
              <p className="nepal-mission__description">{currentChallenge.description}</p>
              
              <div className="nepal-mission__meta">
                <div className="nepal-mission__meta-item">
                  <span className="nepal-mission__meta-label">Reward</span>
                  <span className="nepal-mission__meta-value">{currentChallenge.points} pts</span>
                </div>
                {timeRemaining !== null && (
                  <div className="nepal-mission__meta-item">
                    <span className="nepal-mission__meta-label">Time Left</span>
                    <span className={`nepal-mission__meta-value ${timeRemaining < 20 ? "nepal-mission__meta-value--warning" : ""}`}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Panel */}
      {showStats && (
        <div className="nepal-panel nepal-panel--stats">
          <div className="nepal-panel__header">
            <div className="nepal-panel__title-group">
              <h3 className="nepal-panel__title">Flight Statistics</h3>
            </div>
            <button
              className="nepal-panel__close"
              onClick={() => setShowStats(false)}
              title="Close"
            >
              ×
            </button>
          </div>
          <div className="nepal-panel__content">
            <div className="nepal-stats">
              <div className="nepal-stat-item">
                <div className="nepal-stat-item__icon">🛫</div>
                <div className="nepal-stat-item__content">
                  <span className="nepal-stat-item__label">Total Distance</span>
                  <span className="nepal-stat-item__value">{formatDistance(totalDistance)}</span>
                </div>
              </div>

              <div className="nepal-stat-item">
                <div className="nepal-stat-item__icon">⏱️</div>
                <div className="nepal-stat-item__content">
                  <span className="nepal-stat-item__label">Flight Time</span>
                  <span className="nepal-stat-item__value">{formatTime(totalFlightTime)}</span>
                </div>
              </div>

              <div className="nepal-stat-item">
                <div className="nepal-stat-item__icon">🎯</div>
                <div className="nepal-stat-item__content">
                  <span className="nepal-stat-item__label">Current Score</span>
                  <span className="nepal-stat-item__value">{score}</span>
                </div>
              </div>

              <div className="nepal-stat-item">
                <div className="nepal-stat-item__icon">📍</div>
                <div className="nepal-stat-item__content">
                  <span className="nepal-stat-item__label">Position</span>
                  <span className="nepal-stat-item__value">
                    {focusLat?.toFixed(3)}°, {focusLng?.toFixed(3)}°
                  </span>
                </div>
              </div>

              <div className="nepal-stat-item">
                <div className="nepal-stat-item__icon">📏</div>
                <div className="nepal-stat-item__content">
                  <span className="nepal-stat-item__label">Altitude</span>
                  <span className="nepal-stat-item__value">{Math.round(altitudeM || 0)}m</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="nepal-panel nepal-panel--settings">
          <div className="nepal-panel__header">
            <div className="nepal-panel__title-group">
              <h3 className="nepal-panel__title">Display Settings</h3>
            </div>
            <button
              className="nepal-panel__close"
              onClick={() => setShowSettings(false)}
              title="Close"
            >
              ×
            </button>
          </div>
          <div className="nepal-panel__content">
            <div className="nepal-settings">
              <div className="nepal-settings__section">
                <h4 className="nepal-settings__section-title">Environment Layers</h4>
                <div className="nepal-settings__options">
                  <label className="nepal-settings__option">
                    <input
                      type="checkbox"
                      checked={atmosphere}
                      onChange={() => toggleLayer("atmosphere")}
                    />
                    <span className="nepal-settings__option-label">Atmosphere Effects</span>
                  </label>
                  <label className="nepal-settings__option">
                    <input
                      type="checkbox"
                      checked={clouds}
                      onChange={() => toggleLayer("clouds")}
                    />
                    <span className="nepal-settings__option-label">Cloud Layer</span>
                  </label>
                  <label className="nepal-settings__option">
                    <input
                      type="checkbox"
                      checked={dayNight}
                      onChange={() => toggleLayer("dayNight")}
                    />
                    <span className="nepal-settings__option-label">Day/Night Cycle</span>
                  </label>
                  <label className="nepal-settings__option">
                    <input
                      type="checkbox"
                      checked={borders}
                      onChange={() => toggleLayer("borders")}
                    />
                    <span className="nepal-settings__option-label">Country Borders</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Main HUD Container */
        .nepal-hud {
          position: fixed;
          top: 100px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          z-index: 200;
          max-width: 320px;
          animation: slideInRight 0.4s ease-out;
        }

        /* Quick Action Buttons */
        .nepal-hud__quick-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .nepal-hud__action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, rgba(10, 14, 22, 0.95), rgba(20, 24, 36, 0.90));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          pointer-events: auto;
        }

        .nepal-hud__action-btn:hover {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.1));
          border-color: rgba(251, 191, 36, 0.4);
          color: #fbbf24;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(251, 191, 36, 0.3);
        }

        .nepal-hud__action-btn--active {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(251, 191, 36, 0.15));
          border-color: rgba(251, 191, 36, 0.5);
          color: #fbbf24;
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
        }

        .nepal-hud__action-btn span {
          display: none;
        }

        @media (min-width: 1024px) {
          .nepal-hud__action-btn span {
            display: block;
          }
        }

        /* Progress Cards */
        .nepal-hud__progress {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .nepal-progress-card {
          padding: 1rem;
          background: linear-gradient(135deg, rgba(10, 14, 22, 0.95), rgba(20, 24, 36, 0.90));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          pointer-events: auto;
          min-width: 200px;
        }

        .nepal-progress-card__header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .nepal-progress-card__icon {
          font-size: 1.5rem;
          filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));
        }

        .nepal-progress-card__title {
          font-size: 0.9rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .nepal-progress-card__value {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 800;
          color: #fbbf24;
          text-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
          margin-bottom: 0.75rem;
        }

        .nepal-progress-card__bar {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .nepal-progress-card__fill {
          height: 100%;
          background: linear-gradient(90deg, #fbbf24, #dc2626);
          border-radius: 3px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
        }

        /* Collapsible Panels */
        .nepal-panel {
          background: linear-gradient(135deg, rgba(10, 14, 22, 0.95), rgba(20, 24, 36, 0.90));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: auto;
        }

        .nepal-panel__header {
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        }

        .nepal-panel__header:hover {
          background: rgba(251, 191, 36, 0.05);
          border-bottom-color: rgba(251, 191, 36, 0.2);
        }

        .nepal-panel__title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.95rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .nepal-panel__icon {
          font-size: 1.25rem;
          color: #fbbf24;
          filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));
        }

        .nepal-panel__chevron {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.5);
          transition: transform 0.3s ease;
        }

        .nepal-panel--expanded .nepal-panel__chevron {
          transform: rotate(180deg);
        }

        .nepal-panel__content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nepal-panel--expanded .nepal-panel__content {
          max-height: 400px;
        }

        .nepal-panel__body {
          padding: 1rem;
        }

        /* Mission Panel Specific */
        .nepal-mission__objective {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .nepal-mission__objective-text {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.5;
          margin-bottom: 0.75rem;
        }

        .nepal-mission__progress {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .nepal-mission__progress-bar {
          flex: 1;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .nepal-mission__progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #fbbf24, #f59e0b);
          border-radius: 4px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
        }

        .nepal-mission__progress-text {
          font-size: 0.85rem;
          font-weight: 600;
          color: #fbbf24;
          text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
        }

        /* Stats Panel Specific */
        .nepal-stats__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .nepal-stats__item {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 0.75rem;
          text-align: center;
        }

        .nepal-stats__label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }

        .nepal-stats__value {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 800;
          color: #fbbf24;
          text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
        }

        /* Settings Panel Specific */
        .nepal-settings__group {
          margin-bottom: 1.5rem;
        }

        .nepal-settings__label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .nepal-settings__slider {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          outline: none;
          -webkit-appearance: none;
          cursor: pointer;
        }

        .nepal-settings__slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
        }

        .nepal-settings__slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
        }

        .nepal-settings__toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .nepal-settings__toggle:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(251, 191, 36, 0.3);
        }

        .nepal-settings__toggle-switch {
          width: 48px;
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          position: relative;
          transition: background 0.3s ease;
        }

        .nepal-settings__toggle--active .nepal-settings__toggle-switch {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
        }

        .nepal-settings__toggle-knob {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .nepal-settings__toggle--active .nepal-settings__toggle-knob {
          transform: translateX(24px);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .nepal-hud {
            position: fixed;
            top: auto;
            bottom: 20px;
            right: 20px;
            left: 20px;
            max-width: none;
            flex-direction: column;
            gap: 0.75rem;
          }

          .nepal-hud__quick-actions {
            justify-content: center;
            flex-wrap: wrap;
          }

          .nepal-hud__action-btn {
            padding: 0.75rem;
            min-width: 48px;
          }

          .nepal-hud__action-btn span {
            display: none;
          }

          .nepal-progress-card {
            padding: 0.75rem;
            min-width: auto;
          }

          .nepal-stats__grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }

          .nepal-panel__body {
            padding: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .nepal-hud {
            bottom: 10px;
            right: 10px;
            left: 10px;
            gap: 0.5rem;
          }

          .nepal-stats__grid {
            grid-template-columns: 1fr;
          }

          .nepal-progress-card__value {
            font-size: 1.25rem;
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Collapsible Panels */
        .nepal-panel {
          position: absolute;
          top: 80px;
          right: 80px;
          max-width: 380px;
          min-width: 320px;
          background: linear-gradient(135deg, rgba(10, 14, 22, 0.97), rgba(20, 24, 36, 0.95));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
          pointer-events: auto;
          z-index: 150;
          animation: slideInRight 0.3s ease-out;
        }

        .nepal-panel--mission {
          border: 2px solid rgba(220, 38, 38, 0.4);
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.92), rgba(239, 68, 68, 0.88));
        }

        .nepal-panel__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 22px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nepal-panel__title {
          font-size: 16px;
          font-weight: 800;
          color: white;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .nepal-panel__close {
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 24px;
          color: white;
          transition: all 0.2s;
          line-height: 1;
        }

        .nepal-panel__close:hover {
          background: rgba(220, 38, 38, 0.8);
          border-color: rgba(220, 38, 38, 0.9);
          transform: scale(1.1);
        }

        .nepal-panel__content {
          padding: 20px 22px;
        }

        /* Mission Panel Content */
        .nepal-mission__title {
          font-size: 18px;
          font-weight: 800;
          color: white;
          margin: 0 0 14px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }

        .nepal-mission__description {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.6;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .nepal-mission__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
        }

        .nepal-mission__points {
          font-size: 16px;
          font-weight: 700;
          color: #fbbf24;
          text-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
        }

        .nepal-mission__timer {
          font-size: 20px;
          font-weight: 800;
          color: white;
          font-variant-numeric: tabular-nums;
          background: rgba(0, 0, 0, 0.3);
          padding: 6px 14px;
          border-radius: 8px;
        }

        .nepal-mission__timer--warning {
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

        /* Settings Panel Content */
        .nepal-settings__layers {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .nepal-settings__layer {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.85);
          cursor: pointer;
          padding: 10px 12px;
          border-radius: 10px;
          transition: all 0.2s;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .nepal-settings__layer:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(251, 191, 36, 0.3);
        }

        .nepal-settings__layer input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #fbbf24;
        }

        .nepal-settings__layer span {
          font-weight: 600;
          flex: 1;
        }

        @media (max-width: 768px) {
          .nepal-hud__icons {
            top: 12px;
            right: 12px;
            gap: 8px;
          }

          .nepal-hud__icon-btn {
            width: 42px;
            height: 42px;
          }

          .nepal-hud {
            top: 70px;
            right: 12px;
            max-width: 280px;
            gap: 12px;
          }

          .nepal-panel {
            top: 70px;
            right: 70px;
            min-width: 260px;
            max-width: 300px;
          }

          .nepal-hud__score {
            padding: 16px 20px;
          }

          .nepal-hud__score-value {
            font-size: 34px;
          }

          .nepal-mission__title {
            font-size: 16px;
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
    </>
  );
}
