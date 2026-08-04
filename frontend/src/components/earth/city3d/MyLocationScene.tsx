/**
 * My Location 3D Scene - Shows user's current location with buildings
 */

"use client";

import { useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { City3DScene } from "./City3DScene";
import type { City3DConfig, GeoBounds } from "./types";

export function MyLocationScene() {
  const geolocation = useGeolocation();
  const [useDemo, setUseDemo] = useState(false);

  // Generate bounds around user's location (0.02 degrees ~ 2.2km)
  const getUserBounds = (): GeoBounds | null => {
    if (!geolocation.data) return null;

    const { latitude, longitude } = geolocation.data;
    const delta = 0.015; // ~1.7km radius

    return {
      north: latitude + delta,
      south: latitude - delta,
      east: longitude + delta,
      west: longitude - delta,
    };
  };

  const bounds = getUserBounds();

  const config: City3DConfig | null = bounds
    ? {
        bounds,
        scale: 51000,
        defaultHeight: 10,
        levelHeight: 2.2,
      }
    : null;

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* Loading state */}
      {geolocation.loading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            backgroundColor: "#f5f5f5",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "20px",
            }}
          >
            📍
          </div>
          <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>
            Getting your location...
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>
            Please allow location access when prompted
          </div>
        </div>
      )}

      {/* Error state */}
      {geolocation.error && !useDemo && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            backgroundColor: "#f5f5f5",
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "20px",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "20px",
            }}
          >
            ⚠️
          </div>
          <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: "#d32f2f" }}>
            Location Access Required
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#666",
              marginBottom: "20px",
              maxWidth: "400px",
              textAlign: "center",
            }}
          >
            {geolocation.error}
          </div>

          {/* Instructions */}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "16px 20px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              maxWidth: "500px",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>
              How to enable location:
            </div>
            <ol style={{ fontSize: "12px", color: "#666", margin: 0, paddingLeft: "20px" }}>
              <li style={{ marginBottom: "6px" }}>
                Click the location icon in your browser's address bar
              </li>
              <li style={{ marginBottom: "6px" }}>Select "Allow" for location access</li>
              <li>Refresh the page</li>
            </ol>
          </div>

          {/* Demo button */}
          <button
            onClick={() => setUseDemo(true)}
            style={{
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "500",
              backgroundColor: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1565c0")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1976d2")}
          >
            Use Demo Location (Kathmandu)
          </button>
        </div>
      )}

      {/* Success - show 3D map */}
      {config && !geolocation.loading && (
        <>
          <City3DScene
            config={config}
            onLoadComplete={(stats) => {
              console.log(`Loaded ${stats.buildings} buildings, ${stats.roads} roads`);
            }}
            onLoadError={(error) => {
              console.error("Failed to load city data:", error);
            }}
          />

          {/* Location info overlay */}
          <div
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              backgroundColor: "#ffffffdd",
              backdropFilter: "blur(8px)",
              padding: "16px 20px",
              borderRadius: "8px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              fontFamily: "system-ui, -apple-system, sans-serif",
              maxWidth: "280px",
              zIndex: 1000,
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "8px" }}>
              📍 Your Location
            </div>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
              Latitude: {geolocation.data?.latitude.toFixed(6)}
            </div>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
              Longitude: {geolocation.data?.longitude.toFixed(6)}
            </div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "8px" }}>
              Accuracy: ±{geolocation.data?.accuracy.toFixed(0)}m
            </div>
          </div>
        </>
      )}

      {/* Demo mode (fallback) */}
      {useDemo && (
        <>
          <City3DScene
            config={{
              bounds: {
                north: 27.7172,
                south: 27.6884,
                east: 85.3340,
                west: 85.3000,
              },
              scale: 51000,
              defaultHeight: 10,
              levelHeight: 2.2,
            }}
          />

          {/* Demo notice */}
          <div
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              backgroundColor: "#fff3e0",
              border: "1px solid #ffb74d",
              padding: "12px 16px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              fontFamily: "system-ui, -apple-system, sans-serif",
              maxWidth: "280px",
              zIndex: 1000,
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
              📍 Demo Location
            </div>
            <div style={{ fontSize: "11px", color: "#666" }}>
              Showing Kathmandu, Nepal
            </div>
          </div>
        </>
      )}
    </div>
  );
}
