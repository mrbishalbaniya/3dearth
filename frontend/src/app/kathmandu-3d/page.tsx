/**
 * Kathmandu Valley 3D Map Demo
 * 
 * This page demonstrates a 3D city map of Kathmandu using OpenStreetMap data.
 * Based on map3d by cartesiancs - MIT License
 * https://github.com/cartesiancs/map3d
 */

"use client";

import { useState } from "react";
import { City3DScene, KATHMANDU_BOUNDS, KATHMANDU_VALLEY_BOUNDS } from "@/components/earth/city3d";
import type { City3DConfig } from "@/components/earth/city3d";

export default function Kathmandu3DPage() {
  const [loadingStats, setLoadingStats] = useState<{
    buildings: number;
    roads: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<"center" | "valley">("center");
  const [key, setKey] = useState(0); // Force remount on area change

  const handleAreaChange = (area: "center" | "valley") => {
    setSelectedArea(area);
    setLoadingStats(null);
    setError(null);
    setKey(prev => prev + 1); // Force remount
  };

  // Configuration for Kathmandu city center
  const cityConfig: City3DConfig = {
    bounds: KATHMANDU_BOUNDS,
    defaultHeight: 10,
    levelHeight: 2.2,
    buildingColor: "#9da0a3",
    roadColor: "#34f516",
    scale: 51000,
  };

  // Configuration for Kathmandu valley (larger area)
  const valleyConfig: City3DConfig = {
    bounds: KATHMANDU_VALLEY_BOUNDS,
    defaultHeight: 10,
    levelHeight: 2.2,
    buildingColor: "#9da0a3",
    roadColor: "#34f516",
    scale: 51000,
  };

  const config = selectedArea === "center" ? cityConfig : valleyConfig;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 1000,
          backgroundColor: "#ffffff",
          backdropFilter: "blur(8px)",
          padding: "16px 20px",
          borderRadius: "12px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxShadow: "0 2px 14px rgba(0, 0, 0, 0.16)",
        }}
      >
        <h1
          style={{
            margin: 0,
            marginBottom: "8px",
            fontSize: "20px",
            fontWeight: "600",
          }}
        >
          Kathmandu 3D Map
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: "#5f6368", marginBottom: "12px" }}>
          Interactive 3D city map from OpenStreetMap
        </p>

        {/* Area selector */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <button
            onClick={() => handleAreaChange("center")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: selectedArea === "center" ? "#007bff" : "#f0f0f0",
              color: selectedArea === "center" ? "#ffffff" : "#000000",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
          >
            City Center
          </button>
          <button
            onClick={() => handleAreaChange("valley")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: selectedArea === "valley" ? "#007bff" : "#f0f0f0",
              color: selectedArea === "valley" ? "#ffffff" : "#000000",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
          >
            Valley (Larger)
          </button>
        </div>

        {/* Stats */}
        {loadingStats && (
          <div style={{ fontSize: "13px", color: "#5f6368" }}>
            <div>✓ Buildings: {loadingStats.buildings}</div>
            <div>✓ Roads: {loadingStats.roads}</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: "12px",
              padding: "8px 12px",
              borderRadius: "6px",
              backgroundColor: error.includes("Demo Mode") ? "#e3f2fd" : "#fee",
              color: error.includes("Demo Mode") ? "#1976d2" : "#c00",
              fontSize: "12px",
              border: error.includes("Demo Mode") ? "1px solid #90caf9" : "none",
            }}
          >
            {error}
            {error.includes("Demo Mode") && (
              <div style={{ marginTop: "6px", fontSize: "11px", color: "#666" }}>
                The Overpass API is currently unavailable. Using 8 sample buildings for demonstration.
              </div>
            )}
          </div>
        )}

        {/* Controls hint */}
        <div
          style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid #e0e0e0",
            fontSize: "12px",
            color: "#888",
          }}
        >
          <div>🖱️ Click + drag to rotate</div>
          <div>🔍 Scroll to zoom</div>
          <div>👆 Right-click + drag to pan</div>
          <div>🏢 Click buildings for info</div>
        </div>
      </div>

      {/* 3D Scene */}
      <City3DScene
        key={key} // Force remount on area change
        config={config}
        onLoadStart={() => {
          setLoadingStats(null);
          setError(null);
        }}
        onLoadComplete={(stats) => {
          setLoadingStats(stats);
          // Check if we're in demo mode (small number of buildings)
          if (stats.buildings <= 10) {
            setError("ℹ️ Demo Mode: Overpass API unavailable. Showing sample buildings.");
          }
        }}
        onLoadError={(err) => {
          const errorMsg = err.message;
          
          // Provide helpful context based on error type
          if (errorMsg.includes("rate limit") || errorMsg.includes("429")) {
            setError("⏳ Too many requests. The Overpass API is rate-limiting. Please wait 1-2 minutes and refresh the page.");
          } else if (errorMsg.includes("timeout") || errorMsg.includes("AbortError")) {
            setError("⏱️ Request timeout. Try using 'City Center' for a smaller area, or refresh to try again.");
          } else if (errorMsg.includes("Failed to fetch") || errorMsg.includes("network")) {
            setError("🌐 Network error. Check your internet connection and try again.");
          } else {
            setError(`❌ Error: ${errorMsg}`);
          }
        }}
      />

      {/* Attribution */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          zIndex: 1000,
          fontSize: "11px",
          color: "#888",
          backgroundColor: "#ffffffcc",
          padding: "6px 10px",
          borderRadius: "6px",
        }}
      >
        Data © <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener">OpenStreetMap</a> contributors |{" "}
        Based on <a href="https://github.com/cartesiancs/map3d" target="_blank" rel="noopener">map3d</a>
      </div>
    </div>
  );
}
