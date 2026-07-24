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

const rainVert = /* glsl */ `
attribute float aSeed;
uniform float uSize;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * uPixelRatio * (45.0 / max(-mv.z, 0.5));
  gl_PointSize = clamp(gl_PointSize, 0.5, 10.0);
  vAlpha = 0.55 + fract(aSeed) * 0.35;
  gl_Position = projectionMatrix * mv;
}
`;

const rainFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5, 0.15);
  // Streak shape
  float streak = 1.0 - smoothstep(0.08, 0.5, abs(c.x) * 4.0 + abs(c.y));
  float alpha = streak * uOpacity * vAlpha;
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

interface RainEffectProps {
  count: number;
}

export function RainEffect({ count }: RainEffectProps) {
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
      vertexShader: rainVert,
      fragmentShader: rainFrag,
      uniforms: {
        uColor: { value: new Color("#9ec9ff") },
        uOpacity: { value: 0 },
        uSize: { value: 4.5 },
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
    const intensity = fx.rain ? intensities.rain : 0;
    const show =
      intensity > 0.04 &&
      altitudeM < 60_000 &&
      !reducedMotion;
    material.uniforms.uOpacity.value = show ? intensity * 0.85 : 0;
    if (pointsRef.current) pointsRef.current.visible = show;
    if (!show) return;

    const windDeg = weather?.windDirectionDeg ?? 0;
    const windStr = intensities.wind;
    const rad = (windDeg * Math.PI) / 180;

    const center = latLngToVector3(focusLat, focusLng, EARTH_RADIUS * 1.012);
    const up = center.clone().normalize();
    const east = new Vector3().crossVectors(new Vector3(0, 1, 0), up).normalize();
    if (east.lengthSq() < 0.1) east.set(1, 0, 0);
    const north = new Vector3().crossVectors(up, east).normalize();
    const windDir = east
      .clone()
      .multiplyScalar(Math.sin(rad))
      .addScaledVector(north, Math.cos(rad));

    const span = Math.min(0.1, Math.max(0.012, (altitudeM / EARTH_RADIUS_M) * 6));
    const fall = 0.04 + intensity * 0.06;
    const pos = geometry.getAttribute("position") as BufferAttribute;
    const active = Math.floor(count * Math.min(1, intensity * 1.1));

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
          .addScaledVector(up, Math.random() * span * 0.7);
        pos.setXYZ(i, p.x, p.y, p.z);
        continue;
      }
      const cur = new Vector3(x, y, z);
      cur.addScaledVector(up, -delta * fall);
      cur.addScaledVector(windDir, delta * windStr * 0.02);
      if (cur.length() - EARTH_RADIUS < 0.0025) {
        const p = center
          .clone()
          .addScaledVector(east, (Math.random() - 0.5) * span)
          .addScaledVector(north, (Math.random() - 0.5) * span)
          .addScaledVector(up, span * 0.55 + Math.random() * span * 0.2);
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
