"use client";

import { useEarthStore } from "@/components/earth/store/earthStore";
import { NEPAL_CITIES } from "@/components/game/NepalGame/nepalConfig";

/**
 * City Navigation Component
 * Provides quick navigation to major cities including Kathmandu
 */
export function CityNavigator() {
  const requestFlyTo = useEarthStore((s) => s.requestFlyTo);

  const flyToCity = (cityId: string) => {
    const city = NEPAL_CITIES.find(c => c.id === cityId);
    if (!city) return;

    requestFlyTo({
      lat: city.lat,
      lng: city.lng,
      altitudeM: 15000, // 15km altitude for good city view
      duration: 2500,
      approach: "rotateThenZoom"
    });
  };

  const flyToKathmandu = () => flyToCity("ktm");
  const flyToPokhara = () => flyToCity("pkr");
  const flyToBhaktapur = () => flyToCity("bkt");

  return (
    <div className="city-navigator">
      <h3>Navigate to Cities</h3>
      <div className="city-buttons">
        <button 
          onClick={flyToKathmandu}
          className="city-btn city-btn--capital"
          title="Kathmandu - Capital of Nepal"
        >
          🏛️ काठमाडौं<br />
          <small>Kathmandu</small>
        </button>
        
        <button 
          onClick={flyToPokhara}
          className="city-btn"
          title="Pokhara - Gateway to Annapurna"
        >
          🏔️ पोखरा<br />
          <small>Pokhara</small>
        </button>
        
        <button 
          onClick={() => flyToCity("ltp")}
          className="city-btn"
          title="Lalitpur - City of Fine Arts"
        >
          🎨 ललितपुर<br />
          <small>Lalitpur</small>
        </button>
        
        <button 
          onClick={() => flyToCity("brt")}
          className="city-btn"
          title="Bharatpur - Metropolitan city"
        >
          🏙️ भरतपुर<br />
          <small>Bharatpur</small>
        </button>
      </div>

      <style jsx>{`
        .city-navigator {
          position: fixed;
          top: 80px;
          right: 20px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          border-radius: 12px;
          padding: 20px;
          min-width: 220px;
          z-index: 1000;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .city-navigator h3 {
          color: white;
          margin: 0 0 15px 0;
          font-size: 16px;
          font-weight: 600;
          text-align: center;
        }

        .city-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .city-btn {
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
          line-height: 1.2;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .city-btn:hover {
          background: linear-gradient(135deg, #2563eb, #60a5fa);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
        }

        .city-btn--capital {
          background: linear-gradient(135deg, #dc2626, #ef4444);
          font-weight: 600;
        }

        .city-btn--capital:hover {
          background: linear-gradient(135deg, #b91c1c, #dc2626);
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
        }

        .city-btn small {
          display: block;
          font-size: 11px;
          opacity: 0.8;
          margin-top: 2px;
        }

        @media (max-width: 768px) {
          .city-navigator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            top: auto;
            min-width: 200px;
          }

          .city-buttons {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .city-btn {
            flex: 1;
            min-width: 90px;
            padding: 10px 8px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}