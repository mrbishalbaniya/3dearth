"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  FrontSide,
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
import { useEarthAppMode } from "./appMode";
import {
  ATMOSPHERE_COLOR,
  EARTH_RADIUS,
  IDLE_EARTH_ROTATION_SPEED,
  SUNSET_COLOR,
} from "./utils/constants";
import { altitudeToZoomLevel } from "./utils/zoomLevels";
import type { EarthQualityProfile } from "./types";
import { seasonFactor as climateSeasonFactor, seasonLandTint } from "./weather/seasons";
import { StreamPerf } from "./performance/StreamPerf";

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
  const satelliteOn = useEarthStore((s) => s.gisLayers.satellite);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const exposure = useEarthStore((s) => s.exposure);
  const focusLat = useEarthStore((s) => s.focusLat);
  const season = useEarthStore((s) => s.season);
  const intensities = useEarthStore((s) => s.weatherIntensities);
  const dryEarthOn = useEarthStore((s) => s.dryEarth.enabled);
  const displaySea = useEarthStore((s) => s.dryEarth.displaySeaLevelM);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const appMode = useEarthAppMode();
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
    () => {
      const mat = new ShaderMaterial({
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
          uDryBlend: { value: 0 },
          uSeaLevelM: { value: 0 },
        },
      });
      return mat;
    },
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

    // Satellite / Dry Earth: always daytime color (not night-lights void)
    const closeUp = altitudeM < 300_000;
    const forceDay = satelliteOn || closeUp || dryEarthOn;
    material.uniforms.uDayNightBlend.value = dayNight && !forceDay ? 1 : 0;
    material.uniforms.uNightLights.value =
      nightLights && dayNight && !forceDay ? 1 : 0;
    material.uniforms.uTime.value += delta;
    material.uniforms.uExposure.value = exposure * (forceDay ? 1.2 : 1);
    // FrontSide only — DoubleSide lets the far hemisphere show through ocean holes
    material.side = FrontSide;
    material.uniforms.uSeason.value = climateSeasonFactor(new Date(), focusLat);
    material.uniforms.uWetness.value = intensities.wetness;
    material.uniforms.uSnowCover.value = intensities.snowCover;
    material.uniforms.uWaveStorm.value = intensities.waveStorm;
    const tint = seasonLandTint(season);
    material.uniforms.uSeasonTint.value.setRGB(tint[0], tint[1], tint[2]);

    const dryBlend = material.uniforms.uDryBlend.value as number;
    const dryTarget = dryEarthOn ? 1 : 0;
    material.uniforms.uDryBlend.value =
      dryBlend + (dryTarget - dryBlend) * Math.min(1, delta * 4.5);
    material.uniforms.uSeaLevelM.value = displaySea;

    // Stop spinning once Dry Earth is on — DEM / focus stay locked to the view
    if (idleRotation && !reducedMotion && !dryEarthOn) {
      rotationYRef.current += IDLE_EARTH_ROTATION_SPEED * delta;
    }

    // Satellite: fade day-map underlay only as imagery coverage grows.
    // Never force globe to 0 while tiles are still streaming (black-gap fix).
    // Dry Earth: keep the base globe fully opaque so ocean discards are filled
    // by the dry shell without seeing stars / far-side continents through.
    // Game mode: ALWAYS keep base globe fully opaque since no tiles load
    let globeOp = dryEarthOn || appMode === "game" ? 1 : altitudeToZoomLevel(altitudeM).globeOpacity;
    if (satelliteOn && !dryEarthOn && altitudeM < 2_500_000 && appMode !== "game") {
      const satFade =
        altitudeM <= 550_000
          ? 1
          : (2_500_000 - altitudeM) / 1_950_000;
      const cov = StreamPerf.get();
      const coverageRatio =
        cov.imageryVisible > 0
          ? Math.min(
              1,
              cov.imageryLoaded /
                Math.max(8, cov.imageryVisible * 0.35),
            )
          : 0;
      const hide = satFade * (0.25 + 0.75 * coverageRatio);
      const minGlobe = coverageRatio > 0.55 ? 0.05 : 0.28;
      // Floor: even street/city zoomLevels set globeOpacity=0 — keep underlay
      // until enough satellite textures have painted.
      globeOp = Math.max(
        minGlobe * (1 - coverageRatio * 0.85),
        Math.min(globeOp, Math.max(minGlobe, 1 - hide)),
      );
    }
    material.transparent = !dryEarthOn && appMode !== "game" && globeOp < 0.98;
    material.opacity = globeOp;
    material.depthWrite = dryEarthOn || appMode === "game" || globeOp > 0.85;

    if (meshRef.current) {
      meshRef.current.visible = globeOp > 0.02;
      meshRef.current.frustumCulled = !closeUp;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    >
      {/* Add a simple fallback mesh with basic material for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.9, 32, 32]} />
          <meshBasicMaterial 
            map={textures.day} 
            transparent={true} 
            opacity={0.8}
          />
        </mesh>
      )}
    </mesh>
  );
}
