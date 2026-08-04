/**
 * Kathmandu Flight Scene - Integrates 3D city with flight simulator
 * Combines FlightCorridorTerrain with City3D buildings for immersive city flying
 */

"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sky, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Building3D } from "./Building3D";
import { Road3D } from "./Road3D";
import { OverpassAPI, KATHMANDU_BOUNDS } from "./OverpassAPI";
import type { City3DConfig, OSMBuilding, OSMRoad } from "./types";

const DEFAULT_SCALE = 51000;
const DEFAULT_HEIGHT = 10;
const LEVEL_HEIGHT = 2.2;

interface KathmanduFlightSceneProps {
  config: City3DConfig;
  aircraftPosition?: { lat: number; lng: number; alt: number };
  onLoadComplete?: (data: { buildings: number; roads: number }) => void;
}

function TerrainGround({ refLat, refLng, scale }: { refLat: number; refLng: number; scale: number }) {
  // Create a large ground plane with height variation
  const groundMesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Add some terrain variation using noise
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      // Simple noise function for terrain
      positions[i + 2] = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 5;
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <primitive object={groundMesh} />
      <meshStandardMaterial
        color="#8B7355"
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}

function AircraftFollowCamera({
  aircraftPosition,
  refLat,
  refLng,
  scale,
}: {
  aircraftPosition?: { lat: number; lng: number; alt: number };
  refLat: number;
  refLng: number;
  scale: number;
}) {
  useFrame(({ camera }) => {
    if (aircraftPosition) {
      // Convert aircraft lat/lng to scene coordinates
      const x = (aircraftPosition.lng - refLng) * scale * Math.cos((refLat * Math.PI) / 180);
      const z = -(aircraftPosition.lat - refLat) * scale;
      const y = aircraftPosition.alt;

      // Position camera behind and above aircraft
      camera.position.set(x, y + 50, z + 100);
      camera.lookAt(x, y, z);
    }
  });

  return null;
}

export function KathmanduFlightScene({
  config,
  aircraftPosition,
  onLoadComplete,
}: KathmanduFlightSceneProps) {
  const [buildings, setBuildings] = useState<OSMBuilding[]>([]);
  const [roads, setRoads] = useState<OSMRoad[]>([]);
  const [loading, setLoading] = useState(false);

  const scale = config.scale ?? DEFAULT_SCALE;
  const defaultHeight = config.defaultHeight ?? DEFAULT_HEIGHT;
  const levelHeight = config.levelHeight ?? LEVEL_HEIGHT;

  const refLat = (config.bounds.north + config.bounds.south) / 2;
  const refLng = (config.bounds.east + config.bounds.west) / 2;

  function project(lat: number, lng: number): THREE.Vector2 {
    const x = (lng - refLng) * scale * Math.cos((refLat * Math.PI) / 180);
    const y = (lat - refLat) * scale;
    return new THREE.Vector2(x, y);
  }

  // Load city data
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);

      try {
        const data = await OverpassAPI.fetchCityData(config.bounds);
        
        if (!cancelled) {
          setBuildings(data.buildings);
          setRoads(data.roads);
          onLoadComplete?.({
            buildings: data.buildings.length,
            roads: data.roads.length,
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load Kathmandu city data:", error);
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

  // Convert buildings to 3D shapes
  const buildingShapes = useMemo(() => {
    return buildings
      .filter((bld) => bld.geometry && bld.geometry.length >= 3)
      .map((bld) => {
        const shapePoints = bld.geometry!.map((pt) => project(pt.lat, pt.lon));
        
        if (!shapePoints[0].equals(shapePoints[shapePoints.length - 1])) {
          shapePoints.push(shapePoints[0]);
        }

        const shape = new THREE.Shape(shapePoints);

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
  }, [buildings, refLat, refLng, scale, defaultHeight, levelHeight]);

  return (
    <>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 20,
            zIndex: 1000,
            backgroundColor: "#ffffff96",
            backdropFilter: "blur(8px)",
            padding: "10px 16px",
            borderRadius: "8px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "13px",
            fontWeight: "500",
            boxShadow: "0 2px 14px rgba(0, 0, 0, 0.16)",
          }}
        >
          🏙️ Loading Kathmandu 3D Buildings...
        </div>
      )}

      {/* Ambient lighting */}
      <ambientLight intensity={0.6} />
      
      {/* Directional sunlight */}
      <directionalLight
        position={[100, 200, 100]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={1000}
        shadow-camera-left={-500}
        shadow-camera-right={500}
        shadow-camera-top={500}
        shadow-camera-bottom={-500}
      />

      {/* Fill light */}
      <pointLight position={[-100, 50, -100]} intensity={0.3} />

      {/* Terrain ground */}
      <TerrainGround refLat={refLat} refLng={refLng} scale={scale} />

      {/* Buildings */}
      {buildingShapes.map((item) => (
        <Building3D
          key={item.id}
          shape={item.shape}
          extrudeSettings={item.extrudeSettings}
          tags={item.tags}
        />
      ))}

      {/* Roads */}
      {roads.map((road) => (
        <Road3D
          key={road.id}
          road={road}
          refLat={refLat}
          refLng={refLng}
          scale={scale}
        />
      ))}

      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={[1, 0.3, 0]}
        inclination={0}
        azimuth={0.25}
      />

      {/* Environment */}
      <Environment preset="city" />

      {/* Camera follows aircraft if position provided */}
      {aircraftPosition && (
        <AircraftFollowCamera
          aircraftPosition={aircraftPosition}
          refLat={refLat}
          refLng={refLng}
          scale={scale}
        />
      )}

      {/* Grid helper for reference */}
      <gridHelper args={[1000, 50, "#888888", "#444444"]} position={[0, 0, 0]} />
    </>
  );
}
