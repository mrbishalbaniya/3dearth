"use client";

import { useEffect, useRef, useState } from "react";
import { useEarthStore } from "../store/earthStore";

/**
 * 2D mini-map overlay showing flight path and aircraft position
 */
export function FlightMapOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get corridor data from global window object
    const flightCorridor = (typeof window !== "undefined") 
      ? (window as any).__flightCorridor 
      : null;

    if (!flightCorridor?.engine) {
      // Draw "No Flight Plan" message
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("No Active Flight", canvas.width / 2, canvas.height / 2);
      return;
    }

    const corridor = flightCorridor.engine.getCorridor();
    if (!corridor || !corridor.routePoints || corridor.routePoints.length === 0) {
      // Draw "No Route" message
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Initializing Route...", canvas.width / 2, canvas.height / 2);
      return;
    }

    const currentWaypointIndex = flightCorridor.engine.getState().currentWaypointIndex || 0;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find bounds
    const lats = corridor.routePoints.map((c: any) => c.lat);
    const lngs = corridor.routePoints.map((c: any) => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padding = 20;
    const mapWidth = canvas.width - padding * 2;
    const mapHeight = canvas.height - padding * 2;

    // Convert lat/lng to canvas coordinates
    const latToY = (lat: number) => {
      const normalized = (lat - minLat) / (maxLat - minLat);
      return padding + (1 - normalized) * mapHeight;
    };

    const lngToX = (lng: number) => {
      const normalized = (lng - minLng) / (maxLng - minLng);
      return padding + normalized * mapWidth;
    };

    // Draw background
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Draw flight path
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.beginPath();

    corridor.routePoints.forEach((coord: any, idx: number) => {
      const x = lngToX(coord.lng);
      const y = latToY(coord.lat);

      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw waypoint markers
    corridor.routePoints.forEach((coord: any, idx: number) => {
      if (idx % 10 !== 0) return;

      const x = lngToX(coord.lng);
      const y = latToY(coord.lat);

      ctx.fillStyle = idx === currentWaypointIndex ? "#ffff00" : "#00ff00";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw departure (green square)
    const depX = lngToX(corridor.routePoints[0].lng);
    const depY = latToY(corridor.routePoints[0].lat);
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(depX - 5, depY - 5, 10, 10);

    // Draw arrival (red square)
    const arrX = lngToX(corridor.routePoints[corridor.routePoints.length - 1].lng);
    const arrY = latToY(corridor.routePoints[corridor.routePoints.length - 1].lat);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(arrX - 5, arrY - 5, 10, 10);

    // Draw aircraft position (yellow triangle)
    const acX = lngToX(focusLng);
    const acY = latToY(focusLat);
    ctx.fillStyle = "#ffff00";
    ctx.beginPath();
    ctx.moveTo(acX, acY - 8);
    ctx.lineTo(acX - 6, acY + 6);
    ctx.lineTo(acX + 6, acY + 6);
    ctx.closePath();
    ctx.fill();

    // Draw labels
    ctx.fillStyle = "#ffffff";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(corridor.departure, depX + 8, depY - 8);
    ctx.fillText(corridor.destination, arrX + 8, arrY - 8);

    // Draw progress info
    const progress = Math.round((currentWaypointIndex / corridor.routePoints.length) * 100);
    const remaining = corridor.totalDistanceNm * (1 - currentWaypointIndex / corridor.routePoints.length);

    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(padding, canvas.height - 65, 200, 55);

    ctx.fillStyle = "#00ff00";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Progress: ${progress}%`, padding + 5, canvas.height - 45);
    ctx.fillText(`Remaining: ${remaining.toFixed(1)} NM`, padding + 5, canvas.height - 25);

  }, [focusLat, focusLng]);

  if (!isVisible) return null;

  return (
    <div className="flight-map-overlay">
      <button 
        className="flight-map-toggle"
        onClick={() => setIsVisible(!isVisible)}
        title="Toggle Map"
      >
        MAP
      </button>

      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="flight-map-canvas"
      />

      <style jsx>{`
        .flight-map-overlay {
          position: fixed;
          bottom: 80px;
          right: 20px;
          z-index: 100;
          border: 2px solid rgba(0, 255, 0, 0.5);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7);
          background: rgba(0, 0, 0, 0.9);
        }

        .flight-map-canvas {
          display: block;
        }

        .flight-map-toggle {
          position: absolute;
          top: 5px;
          right: 5px;
          z-index: 101;
          background: rgba(0, 255, 0, 0.2);
          border: 1px solid rgba(0, 255, 0, 0.5);
          color: #00ff00;
          padding: 4px 8px;
          font-size: 10px;
          font-family: monospace;
          cursor: pointer;
          border-radius: 3px;
        }

        .flight-map-toggle:hover {
          background: rgba(0, 255, 0, 0.3);
        }

        @media (max-width: 768px) {
          .flight-map-overlay {
            bottom: 60px;
            right: 10px;
            transform: scale(0.8);
            transform-origin: bottom right;
          }
        }
      `}</style>
    </div>
  );
}
