"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  FrontSide,
  Group,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Texture,
  Vector3,
} from "three";
import {
  cloudsFragmentShader,
  cloudsVertexShader,
} from "./shaders/earthShaders";
import { useEarthStore } from "./store/earthStore";
import { CLOUD_RADIUS, CLOUD_ROTATION_SPEED } from "./utils/constants";
import type { EarthQualityProfile } from "./types";

interface CloudsProps {
  texture: Texture;
  sunDirection: Vector3;
  quality: EarthQualityProfile;
  earthRotationY: React.MutableRefObject<number>;
}

const LAYER_OFFSETS = [0, 0.0045, 0.009];

export function Clouds({
  texture,
  sunDirection,
  quality,
  earthRotationY,
}: CloudsProps) {
  const visible = useEarthStore((s) => s.layers.clouds);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const weatherOn = useEarthStore((s) => s.gisLayers.weather);
  const weatherFx = useEarthStore((s) => s.weatherFx);
  const intensities = useEarthStore((s) => s.weatherIntensities);
  const dryEarthOn = useEarthStore((s) => s.dryEarth.enabled);
  const displaySea = useEarthStore((s) => s.dryEarth.displaySeaLevelM);
  const groupRef = useRef<Group>(null);
  const cloudAngle = useRef(0);
  const materialsRef = useRef<ShaderMaterial[]>([]);

  const layerCount =
    quality.id === "low" ? 1 : quality.id === "medium" ? 2 : 3;

  const geometries = useMemo(() => {
    const segs = quality.cloudSegments;
    return LAYER_OFFSETS.slice(0, layerCount).map(
      (off) => new SphereGeometry(CLOUD_RADIUS + off, segs, segs),
    );
  }, [quality.cloudSegments, layerCount]);

  const materials = useMemo(() => {
    const mats = LAYER_OFFSETS.slice(0, layerCount).map(
      (_, i) =>
        new ShaderMaterial({
          vertexShader: cloudsVertexShader,
          fragmentShader: cloudsFragmentShader,
          uniforms: {
            uCloudMap: { value: texture },
            uSunDirection: { value: sunDirection.clone() },
            uOpacity: { value: 0 },
            uTime: { value: 0 },
            uWind: { value: 1 },
            uDensity: { value: 0.55 + i * 0.12 },
            uLayer: { value: i },
          },
          transparent: true,
          depthWrite: false,
          side: FrontSide,
          depthTest: true,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
    );
    materialsRef.current = mats;
    return mats;
  }, [texture, sunDirection, layerCount]);

  useEffect(() => {
    return () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    };
  }, [geometries, materials]);

  useFrame((_, delta) => {
    let target = 0;
    if (visible) {
      // Soft clouds in deep space only — mid-orbit cloud shells z-fight the globe
      if (altitudeM > 4_000_000) target = 0.55;
      else if (altitudeM > 2_000_000) target = 0.28;
      else if (altitudeM > 800_000) target = 0.08;
      else target = 0;
      // Fade clouds as oceans drain (scientific viz clarity)
      if (dryEarthOn && displaySea < -500) {
        target *= Math.max(0.15, 1 + displaySea / 12000);
      }
    }

    // Live weather modulates density / storm decks
    const wxClouds = weatherOn && weatherFx.clouds;
    const densityBoost = wxClouds ? intensities.cloudDensity : 0.55;
    const stormDark = wxClouds ? intensities.storm : 0;
    const windMul =
      reducedMotion ? 0.15 : 1.0 + (wxClouds ? intensities.wind * 1.8 : 0);

    if (!reducedMotion) {
      cloudAngle.current +=
        CLOUD_ROTATION_SPEED * delta * (1 + (wxClouds ? intensities.wind * 0.8 : 0));
    }

    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i];
      const layerScale = i === 0 ? 1 : i === 1 ? 0.55 : 0.32;
      // High layer = cirrus (index 2), low = rain deck
      const heightBias =
        i === 0
          ? 1 + stormDark * 0.35
          : i === 1
            ? 0.9 + densityBoost * 0.3
            : 0.7 + (1 - stormDark) * 0.4;
      const desired =
        target * layerScale * heightBias * (0.65 + densityBoost * 0.7);
      mat.uniforms.uOpacity.value +=
        (desired - mat.uniforms.uOpacity.value) * Math.min(1, delta * 2.5);
      mat.uniforms.uSunDirection.value.copy(sunDirection);
      mat.uniforms.uTime.value += delta;
      mat.uniforms.uWind.value = windMul;
      mat.uniforms.uDensity.value = 0.45 + densityBoost * 0.4 + stormDark * 0.25;
    }

    if (groupRef.current) {
      groupRef.current.rotation.y =
        earthRotationY.current + cloudAngle.current;
      groupRef.current.visible = materials[0]?.uniforms.uOpacity.value > 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {geometries.map((geo, i) => (
        <mesh
          key={i}
          geometry={geo}
          material={materials[i]}
          renderOrder={3 + i}
        />
      ))}
    </group>
  );
}
