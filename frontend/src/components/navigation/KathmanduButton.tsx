"use client";

import { useEarthStore } from "@/components/earth/store/earthStore";

/**
 * Simple button to fly to Kathmandu in 3D
 */
export function KathmanduButton({ className = "" }: { className?: string }) {
  const requestFlyTo = useEarthStore((s) => s.requestFlyTo);

  const flyToKathmandu = () => {
    requestFlyTo({
      lat: 27.7172,  // Kathmandu coordinates
      lng: 85.3240,
      altitudeM: 15000, // 15km altitude for good city view
      duration: 2500,
      approach: "rotateThenZoom"
    });
  };

  return (
    <button 
      onClick={flyToKathmandu}
      className={`kathmandu-btn ${className}`}
      title="Fly to Kathmandu, Nepal - 3D View"
    >
      🏛️ View Kathmandu 3D
      <style jsx>{`
        .kathmandu-btn {
          background: linear-gradient(135deg, #dc2626, #ef4444);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 20px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
        }

        .kathmandu-btn:hover {
          background: linear-gradient(135deg, #b91c1c, #dc2626);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.5);
        }

        .kathmandu-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </button>
  );
}