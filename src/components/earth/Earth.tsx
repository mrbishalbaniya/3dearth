"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import type { LoadedEarthTextures } from "./utils/textures";
import {
  earthFragmentShader,
  earthVertexShader,
} from "./shaders/earthShaders";
import { useEarthStore } from "./store/earthStore";
import {
  ATMOSPHERE_COLOR,
  EARTH_RADIUS,
  IDLE_EARTH_ROTATION_SPEED,
  SUNSET_COLOR,
} from "./utils/constants";
import type { EarthQualityProfile } from "./types";
import { seasonFactor as climateSeasonFactor, seasonLandTint } from "./weather/seasons";

interface EarthProps {
  textures: LoadedEarthTextures;
  sunDirection: Vector3;
  sunColor?: Color;
  quality: EarthQualityProfile;
  rotationYRef: React.MutableRefObject<number>;
}

export function Earth({
  textures,
  sunDirection,
  sunColor,
  quality,
  rotationYRef,
}: EarthProps) {
  const idleRotation = useEarthStore((s) => s.idleRotation);
  const dayNight = useEarthStore((s) => s.layers.dayNight);
  const nightLights = useEarthStore((s) => s.gisLayers.nightLights);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const exposure = useEarthStore((s) => s.exposure);
  const focusLat = useEarthStore((s) => s.focusLat);
  const season = useEarthStore((s) => s.season);
  const intensities = useEarthStore((s) => s.weatherIntensities);
  const dryEarthOn = useEarthStore((s) => s.dryEarth.enabled);
  const displaySea = useEarthStore((s) => s.dryEarth.displaySeaLevelM);
  const meshRef = useRef<Mesh>(null);
  const sunColorRef = useRef(sunColor ?? new Color("#fff5e6"));

  const geometry = useMemo(
    () =>
      new SphereGeometry(
        EARTH_RADIUS,
        quality.earthSegments,
        quality.earthSegments,
      ),
    [quality.earthSegments],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: earthVertexShader,
        fragmentShader: earthFragmentShader,
        uniforms: {
          uDayMap: { value: textures.day },
          uNightMap: { value: textures.night },
          uNormalMap: { value: textures.normal },
          uSpecularMap: { value: textures.specular },
          uRoughnessMap: { value: textures.roughness },
          uSunDirection: { value: sunDirection.clone() },
          uSunColor: { value: new Color("#fff5e6") },
          uDayNightBlend: { value: 1 },
          uNightLights: { value: 1 },
          uTime: { value: 0 },
          uSeason: { value: 1 },
          uAtmosphereColor: { value: new Color(ATMOSPHERE_COLOR) },
          uSunsetColor: { value: new Color(SUNSET_COLOR) },
          uNormalScale: { value: quality.id === "ultra" ? 1.35 : 1.15 },
          uExposure: { value: 1.05 },
          uWetness: { value: 0 },
          uSnowCover: { value: 0 },
          uWaveStorm: { value: 0 },
          uSeasonTint: { value: new Color(1, 1, 1) },
        },
      }),
    [textures, sunDirection, quality.id],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    material.uniforms.uSunDirection.value.copy(sunDirection);
    if (sunColor) material.uniforms.uSunColor.value.copy(sunColor);
    else material.uniforms.uSunColor.value.copy(sunColorRef.current);
    material.uniforms.uDayNightBlend.value = dayNight ? 1 : 0;
    material.uniforms.uNightLights.value = nightLights ? 1 : 0;
    material.uniforms.uTime.value += delta;
    material.uniforms.uExposure.value = exposure;
    material.uniforms.uSeason.value = climateSeasonFactor(new Date(), focusLat);
    material.uniforms.uWetness.value = intensities.wetness;
    material.uniforms.uSnowCover.value = intensities.snowCover;
    material.uniforms.uWaveStorm.value = intensities.waveStorm;
    const tint = seasonLandTint(season);
    material.uniforms.uSeasonTint.value.setRGB(tint[0], tint[1], tint[2]);

    // Soften base globe oceans when Dry Earth overlay is active
    if (dryEarthOn) {
      const drain = Math.min(1, Math.max(0, -displaySea / 8000));
      material.uniforms.uExposure.value = exposure * (1 - drain * 0.12);
    }

    if (idleRotation && !reducedMotion) {
      rotationYRef.current += IDLE_EARTH_ROTATION_SPEED * delta;
    }

    // Never hide the globe at Street zoom — blank void when imagery is slow/cancelled
    if (meshRef.current) {
      meshRef.current.visible = true;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled
    />
  );
}
