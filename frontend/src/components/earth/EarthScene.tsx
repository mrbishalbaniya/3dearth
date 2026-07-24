"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    if (flightMode) {
      setIdleRotation(false);
      // Align ECEF with latLngToVector3 — idle spin left the globe rotated
      // while the aircraft/camera stayed in unrotated world space (void sky).
      rotationYRef.current = 0;
      if (rotatingGroup.current) rotatingGroup.current.rotation.y = 0;
    }
  }, [flightMode, setIdleRotation]);

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
      .catch(() => {
        if (!cancelled) setLoadingProgress(100);
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

  if (!textures) return null;

  return (
    <>
      <EarthEngineBridge />
      <Lighting sun={sun} quality={quality} />
      <Stars quality={quality} />
      <SolarSystem sunDirection={sun.direction} sunColor={sun.color} />
      <Moon
        sunDirection={sun.direction}
        segments={quality.id === "low" ? 32 : 56}
      />

      <group ref={rotatingGroup}>
        <Earth
          textures={textures}
          sunDirection={sun.direction}
          sunColor={sun.color}
          quality={quality}
          rotationYRef={rotationYRef}
        />
        <DryEarthSystem
          textures={textures}
          sunDirection={sun.direction}
        />
        <LayerManager quality={quality} />
        <WeatherSystem sunElevation={sun.direction.y} />
        {/* Nepal game markers - only show in game mode */}
        {appMode === "game" && <NepalMarkers />}
        {/* Must live in the same frame as the globe / GIS tiles */}
        <FlightMode earthRotationY={rotationYRef} />
      </group>

      <Clouds
        texture={textures.clouds}
        sunDirection={sun.direction}
        quality={quality}
        earthRotationY={rotationYRef}
      />

      <Atmosphere sunDirection={sun.direction} quality={quality} />
      <CameraController earthRotationY={rotationYRef} />
      <CountryInteraction earthRotationY={rotationYRef} />

      {!flightMode && <PostFX quality={quality} />}
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
