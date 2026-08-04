"use client";

import { useState } from "react";
import { 
  flyToKathmandu, 
  flyToKathmanduArea, 
  startKathmanduTour,
  KATHMANDU_VIEW_PRESETS,
  KATHMANDU_AREAS 
} from "@/utils/kathmanduNavigation";

/**
 * Comprehensive Kathmandu 3D Viewer Component
 * Provides multiple ways to explore Kathmandu in 3D
 */
export function KathmanduViewer() {
  const [isTouring, setIsTouring] = useState(false);

  const handleTour = () => {
    setIsTouring(true);
    startKathmanduTour();
    // Tour takes about 20 seconds total
    setTimeout(() => setIsTouring(false), 20000);
  };

  return (
    <div className="kathmandu-viewer">
      <div className="viewer-header">
        <h2>🏔️ काठमाडौं Kathmandu 3D</h2>
        <p>Explore Nepal's capital city in immersive 3D</p>
      </div>

      {/* Quick Access Buttons */}
      <div className="quick-access">
        <h3>Quick Views</h3>
        <div className="preset-buttons">
          <button 
            onClick={() => flyToKathmandu("overview")}
            className="preset-btn preset-btn--overview"
          >
            🌍 Valley Overview
            <small>50km altitude</small>
          </button>
          
          <button 
            onClick={() => flyToKathmandu("city")}
            className="preset-btn preset-btn--city"
          >
            🏙️ City View
            <small>15km altitude</small>
          </button>
          
          <button 
            onClick={() => flyToKathmandu("neighborhood")}
            className="preset-btn preset-btn--neighborhood"
          >
            🏘️ Neighborhoods
            <small>5km altitude</small>
          </button>
          
          <button 
            onClick={() => flyToKathmandu("street")}
            className="preset-btn preset-btn--street"
          >
            🛣️ Street Level
            <small>1km altitude</small>
          </button>
        </div>
      </div>

      {/* Famous Places */}
      <div className="famous-places">
        <h3>Famous Places</h3>
        <div className="places-grid">
          <button 
            onClick={() => flyToKathmanduArea("durbarSquare")}
            className="place-btn"
          >
            🏛️ Durbar Square<br />
            <small>दरबार स्क्वायर</small>
          </button>
          
          <button 
            onClick={() => flyToKathmanduArea("swayambhunath")}
            className="place-btn"
          >
            🐒 Monkey Temple<br />
            <small>स्वयम्भूनाथ</small>
          </button>
          
          <button 
            onClick={() => flyToKathmanduArea("pashupatinath")}
            className="place-btn"
          >
            🕉️ Pashupatinath<br />
            <small>पशुपतिनाथ</small>
          </button>
          
          <button 
            onClick={() => flyToKathmanduArea("airport")}
            className="place-btn"
          >
            ✈️ Airport<br />
            <small>त्रिभुवन</small>
          </button>
        </div>
      </div>

      {/* Guided Tour */}
      <div className="tour-section">
        <h3>Guided Tour</h3>
        <button 
          onClick={handleTour}
          disabled={isTouring}
          className={`tour-btn ${isTouring ? "tour-btn--active" : ""}`}
        >
          {isTouring ? "🎬 Tour in Progress..." : "🎯 Start Kathmandu Tour"}
        </button>
        {isTouring && (
          <p className="tour-info">
            Taking you on a guided tour of Kathmandu's highlights! ✨
          </p>
        )}
      </div>

      <style jsx>{`
        .kathmandu-viewer {
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(16px);
          border-radius: 16px;
          padding: 24px;
          max-width: 320px;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        }

        .viewer-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .viewer-header h2 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .viewer-header p {
          margin: 0;
          font-size: 14px;
          opacity: 0.8;
        }

        .quick-access, .famous-places, .tour-section {
          margin-bottom: 20px;
        }

        .quick-access h3, .famous-places h3, .tour-section h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #fbbf24;
        }

        .preset-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .preset-btn {
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
          text-align: center;
        }

        .preset-btn:hover {
          background: linear-gradient(135deg, #2563eb, #60a5fa);
          transform: translateY(-1px);
        }

        .preset-btn small {
          display: block;
          font-size: 10px;
          opacity: 0.7;
          margin-top: 2px;
        }

        .places-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .place-btn {
          background: linear-gradient(135deg, #059669, #10b981);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.2s ease;
          text-align: center;
          line-height: 1.2;
        }

        .place-btn:hover {
          background: linear-gradient(135deg, #047857, #059669);
          transform: translateY(-1px);
        }

        .place-btn small {
          display: block;
          font-size: 9px;
          opacity: 0.8;
          margin-top: 2px;
        }

        .tour-btn {
          width: 100%;
          background: linear-gradient(135deg, #dc2626, #ef4444);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px 16px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .tour-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #b91c1c, #dc2626);
          transform: translateY(-1px);
        }

        .tour-btn--active {
          background: linear-gradient(135deg, #7c2d12, #ea580c);
          cursor: not-allowed;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .tour-info {
          margin: 8px 0 0 0;
          font-size: 12px;
          color: #fbbf24;
          text-align: center;
        }

        @media (max-width: 768px) {
          .kathmandu-viewer {
            max-width: 280px;
            padding: 20px;
          }

          .preset-buttons, .places-grid {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .preset-btn, .place-btn {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}