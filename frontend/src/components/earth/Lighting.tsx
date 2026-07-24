"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DirectionalLight, HemisphereLight } from "three";
import {
  HEMISPHERE_GROUND,
  HEMISPHERE_INTENSITY,
  HEMISPHERE_SKY,
} from "./utils/constants";
import type { SunState } from "./hooks/useSunPosition";
import type { EarthQualityProfile } from "./types";
import { useEarthStore } from "./store/earthStore";

interface LightingProps {
  sun: SunState;
  quality: EarthQualityProfile;
}

export function Lighting({ sun, quality }: LightingProps) {
  const sunRef = useRef<DirectionalLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);
  const dayPhase = useEarthStore((s) => s.dayPhase);
  const storm = useEarthStore((s) => s.weatherIntensities.storm);

  useFrame(() => {
    if (sunRef.current) {
      sunRef.current.position.copy(sun.direction).multiplyScalar(60);
      sunRef.current.target.position.set(0, 0, 0);
      let intensity = sun.intensity;
      // Day-phase lighting accents
      if (dayPhase === "golden_hour" || dayPhase === "sunrise" || dayPhase === "sunset") {
        intensity *= 1.08;
      } else if (dayPhase === "blue_hour") {
        intensity *= 0.55;
      } else if (dayPhase === "midnight" || dayPhase === "night") {
        intensity *= 0.35;
      }
      // Overcast / storm softens sun
      intensity *= 1 - storm * 0.45;
      sunRef.current.intensity = intensity;
      sunRef.current.color.copy(sun.color);
      sunRef.current.target.updateMatrixWorld();

      if (quality.enableShadows && sunRef.current.castShadow) {
        const shadow = sunRef.current.shadow;
        shadow.mapSize.set(1024, 1024);
        shadow.camera.near = 10;
        shadow.camera.far = 120;
        shadow.bias = -0.0002;
      }
    }
    if (hemiRef.current) {
      hemiRef.current.intensity =
        HEMISPHERE_INTENSITY * 1.1 * (1 - storm * 0.25);
    }
  });

  return (
    <>
      <ambientLight intensity={sun.ambient * (1 - storm * 0.2)} color="#8eb6ff" />
      <hemisphereLight
        ref={hemiRef}
        args={[HEMISPHERE_SKY, HEMISPHERE_GROUND, HEMISPHERE_INTENSITY]}
      />
      <directionalLight
        ref={sunRef}
        intensity={sun.intensity}
        castShadow={quality.enableShadows}
        color="#fff5e6"
      />
    </>
  );
}
