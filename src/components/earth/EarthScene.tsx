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
import { LayerManager } from "./gis/LayerManager";
import { WeatherSystem } from "./weather/WeatherSystem";
import { EarthEngineBridge } from "./engine/EarthEngineBridge";
import { DryEarthSystem } from "./dryEarth";
import { useSunPosition } from "./hooks/useSunPosition";
import { useEarthStore } from "./store/earthStore";
import type { EarthQualityProfile } from "./types";
import { loadEarthTextures, type LoadedEarthTextures } from "./utils/textures";
import { disposeTextures } from "./utils/dispose";

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

  useEffect(() => {
    let cancelled = false;
    setLoadingProgress(10);

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
  }, [quality.anisotropicFiltering, quality.textureMaxSize, setLoadingProgress, setReady]);

  useEffect(() => {
    return () => {
      if (textures) disposeTextures(Object.values(textures));
    };
  }, [textures]);

  useFrame(() => {
    if (rotatingGroup.current) {
      rotatingGroup.current.rotation.y = rotationYRef.current;
      rotatingGroup.current.visible = true;
    }
  });

  if (!textures) return null;

  return (
    <>
      <EarthEngineBridge />
      <Lighting sun={sun} quality={quality} />
      <Stars quality={quality} />
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

      <PostFX quality={quality} />
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
