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
} from "three";
import { SUN_DEF } from "../catalog";
import { sunCoronaFragmentShader, sunVertexShader } from "../shaders";

interface SunCoronaProps {
  segments?: number;
  radius: number;
}

export function SunCorona({ segments = 32, radius }: SunCoronaProps) {
  const innerRef = useRef<Mesh>(null);
  const outerRef = useRef<Mesh>(null);

  const innerGeo = useMemo(
    () =>
      new SphereGeometry(
        radius * SUN_DEF.coronaInnerScale,
        segments,
        segments,
      ),
    [radius, segments],
  );
  const outerGeo = useMemo(
    () =>
      new SphereGeometry(
        radius * SUN_DEF.coronaOuterScale,
        Math.max(16, segments - 8),
        Math.max(16, segments - 8),
      ),
    [radius, segments],
  );

  const innerMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: sunVertexShader,
        fragmentShader: sunCoronaFragmentShader,
        uniforms: {
          uColor: { value: new Color(SUN_DEF.glowColor) },
          uIntensity: { value: 0.55 },
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        side: BackSide,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const outerMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: sunVertexShader,
        fragmentShader: sunCoronaFragmentShader,
        uniforms: {
          uColor: { value: new Color(SUN_DEF.coronaColor) },
          uIntensity: { value: 0.28 },
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        side: BackSide,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      innerGeo.dispose();
      outerGeo.dispose();
      innerMat.dispose();
      outerMat.dispose();
    };
  }, [innerGeo, outerGeo, innerMat, outerMat]);

  useFrame((_, delta) => {
    innerMat.uniforms.uTime.value += delta;
    outerMat.uniforms.uTime.value += delta * 0.85;
  });

  return (
    <group name="sun-corona">
      <mesh
        ref={innerRef}
        geometry={innerGeo}
        material={innerMat}
        frustumCulled={false}
        renderOrder={-2}
      />
      <mesh
        ref={outerRef}
        geometry={outerGeo}
        material={outerMat}
        frustumCulled={false}
        renderOrder={-3}
      />
    </group>
  );
}
