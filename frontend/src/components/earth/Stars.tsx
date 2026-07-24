"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import {
  nebulaFragmentShader,
  nebulaVertexShader,
  starsFragmentShader,
  starsVertexShader,
} from "./shaders/spaceShaders";
import { useEarthStore } from "./store/earthStore";
import type { EarthQualityProfile } from "./types";

interface StarsProps {
  quality: EarthQualityProfile;
}

function createStarField(count: number, radius: number, seed = 1) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const color = new Color();

  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const r = radius * (0.55 + rand() * 0.45);
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const palette = rand();
    if (palette < 0.5) color.setHSL(0.58, 0.25 + rand() * 0.3, 0.7 + rand() * 0.3);
    else if (palette < 0.75) color.setHSL(0.1, 0.35, 0.78 + rand() * 0.2);
    else if (palette < 0.9) color.setHSL(0.72, 0.4, 0.75);
    else color.setRGB(1, 1, 1);

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = 0.35 + rand() * 2.4;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
  return geometry;
}

function createMilkyWay(count: number, radius: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const color = new Color();

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const band = (Math.random() - 0.5) * 0.28;
    const dist = radius * (0.65 + Math.random() * 0.35);
    const x = Math.cos(angle) * dist;
    const y = band * radius + Math.sin(angle * 3.1) * 0.06 * radius;
    const z = Math.sin(angle) * dist * 0.52;
    const tilt = 0.42;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y * Math.cos(tilt) - z * Math.sin(tilt);
    positions[i * 3 + 2] = y * Math.sin(tilt) + z * Math.cos(tilt);

    const t = Math.random();
    if (t < 0.35) color.set("#9bb6ff");
    else if (t < 0.65) color.set("#d4c4ff");
    else if (t < 0.85) color.set("#ffe4c4");
    else color.set("#ffffff");

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = 0.25 + Math.random() * 1.2;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
  return geometry;
}

export function Stars({ quality }: StarsProps) {
  const visible = useEarthStore((s) => s.layers.stars);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const groupRef = useRef<Group>(null);
  const dustRef = useRef<Points>(null);
  const fade = useRef(1);
  const twinkle = useRef(0);
  const { gl } = useThree();

  const starCount = quality.starCount;
  const milkyCount = Math.floor(starCount * 0.35);

  const starGeo = useMemo(
    () => createStarField(starCount, 85, 42),
    [starCount],
  );
  const brightGeo = useMemo(
    () => createStarField(Math.floor(starCount * 0.08), 55, 7),
    [starCount],
  );
  const milkyGeo = useMemo(
    () => createMilkyWay(milkyCount, 72),
    [milkyCount],
  );

  const starMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starsVertexShader,
        fragmentShader: starsFragmentShader,
        uniforms: {
          uPixelRatio: { value: Math.min(2, gl.getPixelRatio()) },
          uScale: { value: 1 },
          uOpacity: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [gl],
  );

  const brightMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starsVertexShader,
        fragmentShader: starsFragmentShader,
        uniforms: {
          uPixelRatio: { value: Math.min(2, gl.getPixelRatio()) },
          uScale: { value: 1.6 },
          uOpacity: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [gl],
  );

  const milkyMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starsVertexShader,
        fragmentShader: starsFragmentShader,
        uniforms: {
          uPixelRatio: { value: Math.min(2, gl.getPixelRatio()) },
          uScale: { value: 0.7 },
          uOpacity: { value: 0.55 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [gl],
  );

  const nebulaMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: nebulaVertexShader,
        fragmentShader: nebulaFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 1 },
          uColorA: { value: new Color("#1a2860") },
          uColorB: { value: new Color("#4a2068") },
        },
        transparent: true,
        depthWrite: false,
        side: BackSide,
        blending: AdditiveBlending,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      starGeo.dispose();
      brightGeo.dispose();
      milkyGeo.dispose();
      starMat.dispose();
      brightMat.dispose();
      milkyMat.dispose();
      nebulaMat.dispose();
    };
  }, [starGeo, brightGeo, milkyGeo, starMat, brightMat, milkyMat, nebulaMat]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = visible && zoomLevel <= 2 ? 1 : 0;
    fade.current += (target - fade.current) * Math.min(1, delta * 2.2);
    groupRef.current.visible = fade.current > 0.02;

    starMat.uniforms.uOpacity.value = fade.current;
    brightMat.uniforms.uOpacity.value =
      fade.current * (0.75 + Math.sin(twinkle.current * 2.1) * 0.2);
    milkyMat.uniforms.uOpacity.value = 0.5 * fade.current;
    nebulaMat.uniforms.uOpacity.value = fade.current;

    if (!reducedMotion && fade.current > 0.05) {
      twinkle.current += delta;
      nebulaMat.uniforms.uTime.value += delta;
      groupRef.current.rotation.y += delta * 0.0025;
      groupRef.current.rotation.x = Math.sin(twinkle.current * 0.04) * 0.008;
      if (dustRef.current) dustRef.current.rotation.z += delta * 0.006;
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={starGeo} material={starMat} frustumCulled={false} />
      <points geometry={brightGeo} material={brightMat} frustumCulled={false} />
      <points
        ref={dustRef}
        geometry={milkyGeo}
        material={milkyMat}
        frustumCulled={false}
      />

      {/* Deep space gradient */}
      <mesh scale={130} frustumCulled={false}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color="#02040a"
          side={BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Procedural nebula washes */}
      <mesh scale={95} frustumCulled={false} renderOrder={-1} material={nebulaMat}>
        <sphereGeometry args={[1, 48, 48]} />
      </mesh>

      <mesh position={new Vector3(28, 12, -38)} scale={22}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#1e1450"
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh position={new Vector3(-32, -10, 22)} scale={28}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#0a2848"
          transparent
          opacity={0.11}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
