"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS_M } from "../../utils/zoomLevels";

const snowVert = /* glsl */ `
attribute float aSeed;
uniform float uSize;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * uPixelRatio * (55.0 / max(-mv.z, 0.5));
  gl_PointSize = clamp(gl_PointSize, 1.0, 14.0);
  vAlpha = 0.4 + fract(aSeed * 7.13) * 0.5;
  gl_Position = projectionMatrix * mv;
}
`;

const snowFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float soft = smoothstep(0.5, 0.12, d);
  float alpha = soft * uOpacity * vAlpha;
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

export function SnowEffect({ count }: { count: number }) {
  const intensities = useEarthStore((s) => s.weatherIntensities);
  const fx = useEarthStore((s) => s.weatherFx);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const weather = useEarthStore((s) => s.weather);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const pointsRef = useRef<Points>(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) seeds[i] = Math.random();
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    const mat = new ShaderMaterial({
      vertexShader: snowVert,
      fragmentShader: snowFrag,
      uniforms: {
        uColor: { value: new Color("#f4f8ff") },
        uOpacity: { value: 0 },
        uSize: { value: 5.5 },
        uPixelRatio: {
          value: typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio) : 1,
        },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return { geometry: geo, material: mat };
  }, [count]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const intensity = fx.snow ? intensities.snow : 0;
    const show = intensity > 0.04 && altitudeM < 60_000 && !reducedMotion;
    material.uniforms.uOpacity.value = show ? intensity * 0.9 : 0;
    if (pointsRef.current) pointsRef.current.visible = show;
    if (!show) return;

    const windDeg = weather?.windDirectionDeg ?? 0;
    const rad = (windDeg * Math.PI) / 180;
    const center = latLngToVector3(focusLat, focusLng, EARTH_RADIUS * 1.014);
    const up = center.clone().normalize();
    const east = new Vector3().crossVectors(new Vector3(0, 1, 0), up).normalize();
    if (east.lengthSq() < 0.1) east.set(1, 0, 0);
    const north = new Vector3().crossVectors(up, east).normalize();
    const windDir = east
      .clone()
      .multiplyScalar(Math.sin(rad))
      .addScaledVector(north, Math.cos(rad));

    const span = Math.min(0.11, Math.max(0.014, (altitudeM / EARTH_RADIUS_M) * 6));
    const fall = 0.012 + intensity * 0.02;
    const pos = geometry.getAttribute("position") as BufferAttribute;
    const active = Math.floor(count * Math.min(1, intensity * 1.05));
    const t = performance.now() * 0.001;

    for (let i = 0; i < count; i++) {
      if (i >= active) {
        pos.setXYZ(i, 0, 0, 0);
        continue;
      }
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      if (x === 0 && y === 0 && z === 0) {
        const p = center
          .clone()
          .addScaledVector(east, (Math.random() - 0.5) * span)
          .addScaledVector(north, (Math.random() - 0.5) * span)
          .addScaledVector(up, Math.random() * span * 0.75);
        pos.setXYZ(i, p.x, p.y, p.z);
        continue;
      }
      const cur = new Vector3(x, y, z);
      cur.addScaledVector(up, -delta * fall);
      cur.addScaledVector(windDir, delta * intensities.wind * 0.015);
      // Drift
      cur.addScaledVector(east, Math.sin(t + i * 0.1) * delta * 0.004);
      if (cur.length() - EARTH_RADIUS < 0.003) {
        const p = center
          .clone()
          .addScaledVector(east, (Math.random() - 0.5) * span)
          .addScaledVector(north, (Math.random() - 0.5) * span)
          .addScaledVector(up, span * 0.6);
        pos.setXYZ(i, p.x, p.y, p.z);
      } else {
        pos.setXYZ(i, cur.x, cur.y, cur.z);
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
