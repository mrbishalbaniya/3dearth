"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Group } from "three";
import { Atmosphere } from "./Atmosphere";
import { CameraController } from "./CameraController";
import { Clouds } from "./Clouds";
import { CountryInteraction } from "./CountryInteraction";
import { Earth } from "./Earth";
import { Lighting } from "./Lighting";
import { Moon } from "./Moon";
import { PostFX } from "./PostFX";
import { Stars } from "./Stars";
import { SolarSystem } from "./solarSystem";
import { LayerManager } from "./gis/LayerManager";
import { WeatherSystem } from "./weather/WeatherSystem";
import { EarthEngineBridge } from "./engine/EarthEngineBridge";
import { DryEarthSystem } from "./dryEarth";
import { useSunPosition } from "./hooks/useSunPosition";
import { useEarthStore } from "./store/earthStore";
import type { EarthQualityProfile } from "./types";
import { loadEarthTextures, type LoadedEarthTextures } from "./utils/textures";
import { disposeTextures } from "./utils/dispose";
import { FlightMode } from "../game/FlightMode";
import { useGameStore } from "../game/store/gameStore";
import { NepalMarkers } from "../game/NepalGame";
import { useEarthAppMode } from "./appMode";
import { NepalFlightDemo } from "./flight/NepalFlightDemo";
import { AirportScene } from "./airport";
import { SAMPLE_KATHMANDU_BUILDINGS } from "./city3d/sampleData";
import { latLngToVector3 } from "./utils/geo";
import { EARTH_RADIUS } from "./utils/constants";

function KathmanduCity3DMarkers() {
  const markers = useMemo(
    () =>
      SAMPLE_KATHMANDU_BUILDINGS.slice(0, 64)
        .map((building) => {
          const center = building.geometry?.[0];
          if (!center) return null;

          const levels = Number.parseFloat(building.tags["building:levels"] || "2");
          const heightM = Number.parseFloat(building.tags.height || "") || levels * 2.5;
          const heightUnits = Math.max(0.0005, heightM / 6_371_000);
          const position = latLngToVector3(center.lat, center.lon, EARTH_RADIUS * 1.0018);

          return {
            id: building.id,
            position,
            heightUnits,
          };
        })
        .filter((item): item is { id: number; position: ReturnType<typeof latLngToVector3>; heightUnits: number } => item !== null),
    [],
  );

  return (
    <group name="kathmandu-city3d-markers">
      {markers.map((marker) => (
        <mesh key={marker.id} position={marker.position}>
          <boxGeometry args={[0.001, marker.heightUnits, 0.001]} />
          <meshStandardMaterial color="#9da0a3" roughness={0.65} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

interface EarthWorldProps {
  quality: EarthQualityProfile;
}

function EarthWorld({ quality }: EarthWorldProps) {
  const sun = useSunPosition();
  const rotationYRef = useRef(0);
  const rotatingGroup = useRef<Group>(null);
  const [textures, setTextures] = useState<LoadedEarthTextures | null>(null);
  const setLoadingProgress = useEarthStore((s) => s.setLoadingProgress);
  const setReady = useEarthStore((s) => s.setReady);
  const setIdleRotation = useEarthStore((s) => s.setIdleRotation);
  const flightMode = useGameStore((s) => s.mode === "flight");
  const appMode = useEarthAppMode();
  const layers = useEarthStore((s) => s.layers);

  useEffect(() => {
    if (flightMode) {
      setIdleRotation(false);
      // Align ECEF with latLngToVector3 — idle spin left the globe rotated
      // while the aircraft/camera stayed in unrotated world space (void sky).
      rotationYRef.current = 0;
      if (rotatingGroup.current) rotatingGroup.current.rotation.y = 0;
    }
  }, [flightMode, setIdleRotation, appMode]);

  useEffect(() => {
    let cancelled = false;
    setLoadingProgress(10);

    // Load once — do not reload when qualityId changes (VRAM spike → tab crash)
    loadEarthTextures(quality.anisotropicFiltering, quality.textureMaxSize)
      .then((loaded) => {
        if (cancelled) {
          disposeTextures(Object.values(loaded));
          return;
        }
        setTextures(loaded);
        setLoadingProgress(90);
        setReady(true);
        setLoadingProgress(100);
      })
      .catch((error) => {
        console.error("Failed to load textures:", error);
        if (!cancelled) {
          setLoadingProgress(100);
        }
      });

    return () => {
      cancelled = true;
    };
    // intentionally omit quality.* — first mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLoadingProgress, setReady]);

  useEffect(() => {
    return () => {
      if (textures) disposeTextures(Object.values(textures));
    };
  }, [textures]);

  useFrame(() => {
    if (rotatingGroup.current) {
      const flying = useGameStore.getState().mode === "flight";
      if (flying) {
        rotationYRef.current = 0;
        rotatingGroup.current.rotation.y = 0;
      } else {
        rotatingGroup.current.rotation.y = rotationYRef.current;
      }
      rotatingGroup.current.visible = true;
    }
  });

  if (!textures) {
    return (
      <>
        {/* Show a simple placeholder while loading */}
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="blue" wireframe />
        </mesh>
        <ambientLight intensity={0.5} />
      </>
    );
  }

  return (
    <>
      <EarthEngineBridge />
      <Lighting sun={sun} quality={quality} />
      
      {/* Simplified rendering for game mode */}
      <group ref={rotatingGroup}>
        <Earth
          textures={textures}
          sunDirection={sun.direction}
          sunColor={sun.color}
          quality={quality}
          rotationYRef={rotationYRef}
        />
        
        {/* Only essential components for game mode */}
        {appMode === "game" && <NepalMarkers />}
        {appMode === "game" && <LayerManager quality={quality} />}
        {appMode === "game" && <KathmanduCity3DMarkers />}
        {appMode === "game" && <AirportScene />}

        {/* Mount full flight simulation systems when game mode enters flight */}
        <FlightMode earthRotationY={rotationYRef} />
      </group>

      {appMode === "game" && (
        <NepalFlightDemo
          active={flightMode}
          qualityLevel="low"
          showDomesticRoutes
          showMountainFlights={false}
          speedMultiplier={1.25}
        />
      )}

      {layers.atmosphere && (
        <Atmosphere sunDirection={sun.direction} quality={quality} />
      )}
      <CameraController earthRotationY={rotationYRef} />
    </>
  );
}

interface EarthSceneProps {
  quality: EarthQualityProfile;
}

export function EarthScene({ quality }: EarthSceneProps) {
  return (
    <Suspense fallback={null}>
      <EarthWorld quality={quality} />
    </Suspense>
  );
}
