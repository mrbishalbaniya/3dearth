"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import { EarthCanvas } from "@/components/earth";
import { useEarthStore } from "@/components/earth/store/earthStore";
import { useNepalGameStore } from "@/components/game/NepalGame/nepalGameStore";
import { NEPAL_CITIES, NEPAL_MOUNTAINS, NEPAL_BOUNDS } from "@/components/game/NepalGame/nepalConfig";
import { GameErrorBoundary } from "@/components/game/ErrorBoundary";

// Dynamic imports with error boundaries
const NepalGameMenu = dynamic(
  () => import("@/components/game/NepalGame").then((m) => m.NepalGameMenu),
  { 
    ssr: false,
    loading: () => <div className="loading-placeholder">Loading menu...</div>
  }
);

const NavigationOverlay = dynamic(
  () => import("@/components/game/Navigation/NavigationOverlay").then((m) => m.NavigationOverlay),
  { 
    ssr: false,
    loading: () => null
  }
);


export default function GamePage() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const layers = useEarthStore((s) => s.layers);
  const weatherFx = useEarthStore((s) => s.weatherFx);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const zoomLevelName = useEarthStore((s) => s.zoomLevelName);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const toggleLayer = useEarthStore((s) => s.toggleLayer);
  const toggleWeatherFx = useEarthStore((s) => s.toggleWeatherFx);
  const requestFlyTo = useEarthStore((s) => s.requestFlyTo);
  const requestResetCamera = useEarthStore((s) => s.requestResetCamera);

  const score = useNepalGameStore((s) => s.score);
  const citiesFound = useNepalGameStore((s) => s.citiesFound);
  const mountainsFound = useNepalGameStore((s) => s.mountainsFound);
  const totalDistance = useNepalGameStore((s) => s.totalDistance);

  // Fullscreen functionality with error handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      try {
        setIsFullscreen(!!document.fullscreenElement);
      } catch (error) {
        console.warn('Fullscreen state check failed:', error);
      }
    };

    const handleFullscreenError = (event: Event) => {
      console.warn('Fullscreen error:', event);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('fullscreenerror', handleFullscreenError);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('fullscreenerror', handleFullscreenError);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      // Fallback for browsers that don't support fullscreen API
      if (!document.fullscreenElement) {
        document.body.style.position = 'fixed';
        document.body.style.top = '0';
        document.body.style.left = '0';
        document.body.style.width = '100vw';
        document.body.style.height = '100vh';
        document.body.style.zIndex = '9999';
        setIsFullscreen(true);
      } else {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.zIndex = '';
        setIsFullscreen(false);
      }
    }
  }, []);

  const handleFlyToKathmandu = useCallback(() => {
    try {
      const city = NEPAL_CITIES.find((c) => c.id === "ktm");
      if (!city) return;
      requestFlyTo({ lat: city.lat, lng: city.lng, altitude: 45_000, duration: 1800 });
    } catch (error) {
      console.error('Error flying to Kathmandu:', error);
    }
  }, [requestFlyTo]);

  const handleFlyToEverest = useCallback(() => {
    try {
      const mountain = NEPAL_MOUNTAINS.find((m) => m.id === "everest");
      if (!mountain) return;
      requestFlyTo({ lat: mountain.lat, lng: mountain.lng, altitude: 35_000, duration: 2200 });
    } catch (error) {
      console.error('Error flying to Everest:', error);
    }
  }, [requestFlyTo]);

  const handleResetView = useCallback(() => {
    try {
      requestResetCamera();
      requestFlyTo({
        lat: NEPAL_BOUNDS.center.lat,
        lng: NEPAL_BOUNDS.center.lng,
        altitude: 250_000,
        duration: 1200,
      });
    } catch (error) {
      console.error('Error resetting view:', error);
    }
  }, [requestResetCamera, requestFlyTo]);

  return (
    <GameErrorBoundary>
      <div className={`game-page game-page--nepal ${isFullscreen ? 'fullscreen' : ''}`}>
        <GameErrorBoundary>
          <div className="earth-container">
            <EarthCanvas mode="game" />
          </div>
        </GameErrorBoundary>
        
        <GameErrorBoundary>
          <NavigationOverlay />
        </GameErrorBoundary>

        {/* Professional Header */}
        <div className="app-header">
        <div className="app-brand">
          <div className="brand-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L22 7V17L12 22L2 17V7L12 2Z" stroke="currentColor" strokeWidth="2" fill="rgba(59, 130, 246, 0.1)"/>
              <path d="M12 8L18 11V16L12 19L6 16V11L12 8Z" stroke="currentColor" strokeWidth="1.5" fill="rgba(59, 130, 246, 0.2)"/>
            </svg>
          </div>
          <div className="brand-text">
            <h1 className="brand-title">Nepal Explorer</h1>
            <span className="brand-subtitle">Interactive Geography Platform</span>
          </div>
        </div>
        
        <div className="header-actions">
          <button
            onClick={toggleFullscreen}
            className="action-btn action-btn--secondary"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              {isFullscreen ? (
                <>
                  <path d="M8 3V5H5V8H3V5A2 2 0 0 1 5 3H8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 8V5A2 2 0 0 0 19 3H16V5H19V8H21" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 21V19H19V16H21V19A2 2 0 0 1 19 21H16" stroke="currentColor" strokeWidth="2"/>
                  <path d="M3 16V19A2 2 0 0 0 5 21H8V19H5V16H3" stroke="currentColor" strokeWidth="2"/>
                </>
              ) : (
                <>
                  <path d="M8 3H5A2 2 0 0 0 3 5V8" stroke="currentColor" strokeWidth="2"/>
                  <polyline points="9,9 3,3 9,9 5,9 9,5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 3H19A2 2 0 0 1 21 5V8" stroke="currentColor" strokeWidth="2"/>
                  <polyline points="15,9 21,3 15,9 19,9 15,5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 21H19A2 2 0 0 0 21 19V16" stroke="currentColor" strokeWidth="2"/>
                  <polyline points="15,15 21,21 15,15 19,15 15,19" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 21H5A2 2 0 0 1 3 19V16" stroke="currentColor" strokeWidth="2"/>
                  <polyline points="9,15 3,21 9,15 5,15 9,19" stroke="currentColor" strokeWidth="2"/>
                </>
              )}
            </svg>
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

        {/* Professional Sidebar */}
        <GameErrorBoundary>
          <div className="sidebar">
            <NepalGameMenu />
          </div>
        </GameErrorBoundary>

        {/* Professional Control Panel */}
        <div className="control-panel">
        <div className="panel-section">
          <h3 className="panel-title">Map Controls</h3>
          <div className="control-group">
            <button
              className={`control-btn ${layers.markers ? "control-btn--active" : ""}`}
              onClick={() => toggleLayer("markers")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 10C21 17 12 23 12 23S3 17 3 10A9 9 0 0 1 12 1A9 9 0 0 1 21 10Z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Markers
            </button>
            <button
              className={`control-btn ${layers.terrain ? "control-btn--active" : ""}`}
              onClick={() => toggleLayer("terrain")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M2 3H8A4 4 0 0 1 12 7A4 4 0 0 1 16 3H22" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 3V19A4 4 0 0 0 6 23H18A4 4 0 0 0 22 19V3" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Terrain
            </button>
          </div>
        </div>

        <div className="panel-section">
          <h3 className="panel-title">Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Cities Found</div>
              <div className="stat-value">{citiesFound.length}/{NEPAL_CITIES.length}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Mountains</div>
              <div className="stat-value">{mountainsFound.length}/{NEPAL_MOUNTAINS.length}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Distance</div>
              <div className="stat-value">{Math.round(totalDistance)} km</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Score</div>
              <div className="stat-value">{score}</div>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <h3 className="panel-title">Quick Actions</h3>
          <div className="action-list">
            <button className="action-item" onClick={handleFlyToKathmandu}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 16V8A2 2 0 0 0 19 6H5A2 2 0 0 0 3 8V16A2 2 0 0 0 5 18H19A2 2 0 0 0 21 16Z" stroke="currentColor" strokeWidth="2"/>
                <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              View Kathmandu
            </button>
            <button className="action-item" onClick={handleFlyToEverest}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2"/>
                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              View Everest
            </button>
            <button className="action-item" onClick={handleResetView}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 10C21 17 12 23 12 23S3 17 3 10A9 9 0 0 1 12 1A9 9 0 0 1 21 10Z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Reset View
            </button>
          </div>
        </div>
      </div>

        {/* Professional Status Bar */}
        <div className="status-bar">
        <div className="status-left">
          <span className="status-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Ready
          </span>
          <span className="status-item">
            Lat: {focusLat.toFixed(4)}° Lng: {focusLng.toFixed(4)}°
          </span>
        </div>
        <div className="status-right">
          <span className="status-item">Zoom: {zoomLevelName}</span>
          <span className="status-item">Alt: {Math.round(altitudeM / 1000)}km</span>
        </div>
      </div>

        {/* Minimal UI - only essential elements */}

        <style jsx>{`
        .loading-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #6b7280;
          font-size: 14px;
        }

        .earth-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          background: #000;
        }

        /* Performance optimizations */
        .game-page--nepal {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #f8fafc;
          padding-top: 64px;
          padding-left: 360px;
          padding-right: 280px;
          padding-bottom: 32px;
          transition: all 0.3s ease;
          /* Improve performance */
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }

        .game-page--nepal.fullscreen {
          padding: 0;
        }

        .earth-container {
          /* GPU acceleration */
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }

        /* Professional App Styles */
        .app-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 1000;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
          /* Performance */
          transform: translateZ(0);
          will-change: transform;
        }

        .fullscreen .app-header {
          transform: translateY(-100%);
        }

        .fullscreen .app-header:hover {
          transform: translateY(0);
        }

        .app-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          color: #3b82f6;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0;
          line-height: 1.2;
        }

        .brand-subtitle {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .action-btn--secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .action-btn--secondary:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .sidebar {
          position: fixed;
          top: 64px;
          left: 0;
          width: 360px;
          height: calc(100vh - 64px);
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(12px);
          border-right: 1px solid rgba(0, 0, 0, 0.08);
          z-index: 100;
          overflow-y: auto;
          transition: transform 0.3s ease;
          /* Performance */
          transform: translateZ(0);
          will-change: transform;
        }

        .fullscreen .sidebar {
          transform: translateX(-100%);
        }

        .fullscreen .sidebar:hover {
          transform: translateX(0);
        }

        .control-panel {
          position: fixed;
          top: 64px;
          right: 0;
          width: 280px;
          height: calc(100vh - 64px);
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(12px);
          border-left: 1px solid rgba(0, 0, 0, 0.08);
          z-index: 100;
          overflow-y: auto;
          padding: 24px 20px;
          transition: transform 0.3s ease;
          /* Performance */
          transform: translateZ(0);
          will-change: transform;
        }

        .fullscreen .control-panel {
          transform: translateX(100%);
        }

        .fullscreen .control-panel:hover {
          transform: translateX(0);
        }

        .panel-section {
          margin-bottom: 32px;
        }

        .panel-title {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .control-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .control-btn--active {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #1d4ed8;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .stat-item {
          padding: 16px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          text-align: center;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }

        .action-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .action-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .action-item:hover {
          background: #f8fafc;
          border-color: #3b82f6;
          color: #1d4ed8;
        }

        .status-bar {
          position: fixed;
          bottom: 0;
          left: 360px;
          right: 280px;
          height: 32px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          z-index: 100;
          font-size: 12px;
          color: #6b7280;
          transition: transform 0.3s ease;
        }

        .fullscreen .status-bar {
          transform: translateY(100%);
          left: 0;
          right: 0;
        }

        .fullscreen .status-bar:hover {
          transform: translateY(0);
        }

        .status-left,
        .status-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }

        .status-item svg {
          color: #3b82f6;
        }

        @media (max-width: 1024px) {
          .control-panel {
            display: none;
          }

          .game-page--nepal {
            padding-right: 0;
          }

          .status-bar {
            right: 0;
          }

          .game-page--nepal.fullscreen {
            padding: 0;
          }

          .fullscreen .status-bar {
            right: 0;
          }
        }

        @media (max-width: 768px) {
          .app-header {
            padding: 0 16px;
          }
          
          .brand-title {
            font-size: 18px;
          }
          
          .brand-subtitle {
            font-size: 11px;
          }

          .sidebar {
            position: fixed;
            top: 64px;
            left: -360px;
            transition: left 0.3s ease;
            z-index: 200;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
          }

          .sidebar.open {
            left: 0;
          }

          .game-page--nepal {
            padding-left: 0;
          }

          .game-page--nepal.fullscreen {
            padding: 0;
          }

          .fullscreen .sidebar {
            transform: translateX(-100%);
          }

          .status-bar {
            left: 0;
            font-size: 11px;
            padding: 0 12px;
          }

          .status-left,
          .status-right {
            gap: 12px;
          }

          .fullscreen .status-bar {
            left: 0;
            right: 0;
          }

          .header-actions {
            gap: 8px;
          }

          .action-btn {
            padding: 6px 12px;
            font-size: 13px;
          }

          .brand-text {
            display: none;
          }
        }
        `}</style>
      </div>
  );
}
