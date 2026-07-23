"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import {
  atmosphereFragmentShader,
  atmosphereHaloFragmentShader,
  atmosphereVertexShader,
} from "./shaders/earthShaders";
import { useEarthStore } from "./store/earthStore";
import {
  ATMOSPHERE_COLOR,
  ATMOSPHERE_HALO_RADIUS,
  ATMOSPHERE_RADIUS,
  SUNSET_COLOR,
} from "./utils/constants";
import type { EarthQualityProfile } from "./types";

interface AtmosphereProps {
  sunDirection: Vector3;
  quality: EarthQualityProfile;
}

export function Atmosphere({ sunDirection, quality }: AtmosphereProps) {
  const visible = useEarthStore((s) => s.layers.atmosphere);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const cameraDistance = useEarthStore((s) => s.cameraDistance);
  const meshRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);

  const geometry = useMemo(
    () =>
      new SphereGeometry(
        ATMOSPHERE_RADIUS,
        quality.atmosphereSegments,
        quality.atmosphereSegments,
      ),
    [quality.atmosphereSegments],
  );

  const haloGeometry = useMemo(
    () =>
      new SphereGeometry(
        ATMOSPHERE_HALO_RADIUS,
        quality.atmosphereSegments,
        quality.atmosphereSegments,
      ),
    [quality.atmosphereSegments],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        uniforms: {
          uSunDirection: { value: sunDirection.clone() },
          uAtmosphereColor: { value: new Color(ATMOSPHERE_COLOR) },
          uSunsetColor: { value: new Color(SUNSET_COLOR) },
          uIntensity: { value: 1.25 },
          uThickness: { value: 0.55 },
          uCameraAltitude: { value: 2 },
        },
        transparent: true,
        depthWrite: false,
        side: BackSide,
      }),
    [sunDirection],
  );

  const haloMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereHaloFragmentShader,
        uniforms: {
          uAtmosphereColor: { value: new Color(ATMOSPHERE_COLOR) },
          uSunsetColor: { value: new Color(SUNSET_COLOR) },
          uSunDirection: { value: sunDirection.clone() },
          uIntensity: { value: 0.9 },
          uCameraAltitude: { value: 2 },
        },
        transparent: true,
        depthWrite: false,
        side: BackSide,
        blending: AdditiveBlending,
      }),
    [sunDirection],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      haloGeometry.dispose();
      material.dispose();
      haloMaterial.dispose();
    };
  }, [geometry, haloGeometry, material, haloMaterial]);

  useFrame((_, delta) => {
    material.uniforms.uSunDirection.value.copy(sunDirection);
    haloMaterial.uniforms.uSunDirection.value.copy(sunDirection);

    // Scene-unit height above surface for near-fade
    const altScene = Math.max(0.001, cameraDistance - 1);
    material.uniforms.uCameraAltitude.value = altScene;
    haloMaterial.uniforms.uCameraAltitude.value = altScene;

    // Thicker from deep space, thinner near planet
    const thickness = Math.min(1, Math.max(0.15, altScene * 0.35));
    material.uniforms.uThickness.value = thickness;

    // Intensity fades with altitude (GIS street zoom → gone)
    let target = 0;
    if (visible) {
      if (altitudeM > 2_000_000) target = 1.35;
      else if (altitudeM > 500_000) target = 1.05;
      else if (altitudeM > 80_000) target = 0.55;
      else if (altitudeM > 20_000) target = 0.18;
      else target = 0;
    }

    material.uniforms.uIntensity.value +=
      (target - material.uniforms.uIntensity.value) * Math.min(1, delta * 2.8);
    haloMaterial.uniforms.uIntensity.value =
      material.uniforms.uIntensity.value * 0.78;

    const show = material.uniforms.uIntensity.value > 0.04;
    if (meshRef.current) meshRef.current.visible = show;
    if (haloRef.current) haloRef.current.visible = show;
  });

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        renderOrder={2}
      />
      <mesh
        ref={haloRef}
        geometry={haloGeometry}
        material={haloMaterial}
        renderOrder={1}
      />
    </>
  );
}
