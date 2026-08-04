/**
 * 3D City Scene Component
 * Based on map3d by cartesiancs - MIT License
 * https://github.com/cartesiancs/map3d
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky, Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Building3D } from "./Building3D";
import { Road3D } from "./Road3D";
import { OverpassAPI } from "./OverpassAPI";
import type { City3DConfig, OSMBuilding, OSMRoad } from "./types";

const DEFAULT_SCALE = 51000;
const DEFAULT_HEIGHT = 10; // meters
const LEVEL_HEIGHT = 2.2; // meters per level

interface City3DSceneProps {
  config: City3DConfig;
  onLoadStart?: () => void;
  onLoadComplete?: (data: { buildings: number; roads: number }) => void;
  onLoadError?: (error: Error) => void;
}

export function City3DScene({
  config,
  onLoadStart,
  onLoadComplete,
  onLoadError,
}: City3DSceneProps) {
  const [buildings, setBuildings] = useState<OSMBuilding[]>([]);
  const [roads, setRoads] = useState<OSMRoad[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const scale = config.scale ?? DEFAULT_SCALE;
  const defaultHeight = config.defaultHeight ?? DEFAULT_HEIGHT;
  const levelHeight = config.levelHeight ?? LEVEL_HEIGHT;

  // Reference point for projection (center of bounds)
  const refLat = (config.bounds.north + config.bounds.south) / 2;
  const refLng = (config.bounds.east + config.bounds.west) / 2;

  // Project lat/lng to local coordinates
  function project(lat: number, lng: number): THREE.Vector2 {
    const x = (lng - refLng) * scale * Math.cos((refLat * Math.PI) / 180);
    const y = (lat - refLat) * scale;
    return new THREE.Vector2(x, y);
  }

  // Load city data from OpenStreetMap
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      onLoadStart?.();

      try {
        const data = await OverpassAPI.fetchCityData(config.bounds);
        
        if (!cancelled) {
          // Check if we got demo data (sample data has exactly 8 buildings)
          const isDemo = data.buildings.length === 8 && 
                         data.buildings[0]?.tags?.name === "Royal Palace";
          
          setBuildings(data.buildings);
          setRoads(data.roads);
          setIsDemoMode(isDemo);
          
          onLoadComplete?.({
            buildings: data.buildings.length,
            roads: data.roads.length,
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load city data:", error);
          onLoadError?.(error as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [config.bounds]);

  // Convert buildings to 3D shapes (with limit to prevent browser hang)
  const buildingShapes = useMemo(() => {
    if (buildings.length === 0) return [];
    
    setProcessing(true);
    console.log(`Processing ${buildings.length} buildings...`);
    
    const validBuildings = buildings
      .filter((bld) => bld.geometry && bld.geometry.length >= 3)
      .slice(0, 2000); // Limit to 2000 buildings max to prevent hang
    
    console.log(`Rendering ${validBuildings.length} buildings (limited from ${buildings.length})`);
    
    const result = validBuildings.map((bld) => {
        const shapePoints = bld.geometry!.map((pt) => project(pt.lat, pt.lon));
        
        // Close the shape if not already closed
        if (!shapePoints[0].equals(shapePoints[shapePoints.length - 1])) {
          shapePoints.push(shapePoints[0]);
        }

        const shape = new THREE.Shape(shapePoints);

        // Calculate building height
        let heightValue = parseFloat(bld.tags.height || "");
        const heightLevels = parseFloat(bld.tags["building:levels"] || "");
        
        if (isNaN(heightValue)) {
          heightValue = defaultHeight;
        }
        
        if (!isNaN(heightLevels)) {
          heightValue = heightLevels * levelHeight;
        }

        const extrudeSettings = {
          steps: 1,
          depth: heightValue,
          bevelEnabled: false,
        };

        return {
          id: bld.id,
          shape,
          extrudeSettings,
          tags: bld.tags,
        };
      });
    
    setProcessing(false);
    return result;
  }, [buildings, refLat, refLng, scale, defaultHeight, levelHeight]);

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            backgroundColor: "#fff3cd",
            border: "1px solid #ffc107",
            color: "#856404",
            padding: "12px 24px",
            borderRadius: "8px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 2px 14px rgba(0, 0, 0, 0.16)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>⚠️</span>
          <span>Demo Mode: Overpass API unavailable - showing sample buildings</span>
        </div>
      )}
      
      {(loading || processing) && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 1000,
            backgroundColor: "#ffffff96",
            backdropFilter: "blur(8px)",
            padding: "12px 20px",
            borderRadius: "8px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 2px 14px rgba(0, 0, 0, 0.16)",
          }}
        >
          {loading ? "Loading data from OpenStreetMap..." : "Processing buildings..."}
        </div>
      )}

      <Canvas camera={{ fov: 90, near: 0.1, far: 7000, position: [0, 100, 200] }}>
        <ambientLight intensity={Math.PI / 2} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          decay={0}
          intensity={Math.PI}
        />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />

        {/* Ground plane for reference */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[10000, 10000]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>

        {/* Buildings */}
        {buildingShapes.length > 0 && buildingShapes.map((item) => (
          <Building3D
            key={item.id}
            shape={item.shape}
            extrudeSettings={item.extrudeSettings}
            tags={item.tags}
          />
        ))}

        {/* Roads */}
        {roads.length > 0 && roads.slice(0, 500).map((road) => ( // Limit roads too
          <Road3D
            key={road.id}
            road={road}
            refLat={refLat}
            refLng={refLng}
            scale={scale}
          />
        ))}

        <Sky
          distance={450000}
          sunPosition={[0, 1, 0]}
          inclination={0}
          azimuth={0.25}
        />
        <Environment preset="city" />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={2000}
        />
      </Canvas>

      {/* Stats overlay */}
      {!loading && !processing && (buildings.length > 0 || roads.length > 0) && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            zIndex: 1000,
            backgroundColor: "#ffffff96",
            backdropFilter: "blur(8px)",
            padding: "12px 16px",
            borderRadius: "8px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "13px",
            boxShadow: "0 2px 14px rgba(0, 0, 0, 0.16)",
          }}
        >
          <div style={{ fontWeight: "600", marginBottom: "4px" }}>
            Kathmandu 3D Map
          </div>
          <div style={{ color: "#5f6368" }}>
            Buildings: {Math.min(buildingShapes.length, 2000)} (of {buildings.length}) | Roads: {Math.min(roads.length, 500)}
          </div>
          {buildings.length > 2000 && (
            <div style={{ color: "#f57c00", fontSize: "11px", marginTop: "4px" }}>
              ⚠️ Showing limited buildings for performance
            </div>
          )}
        </div>
      )}
    </div>
  );
}
