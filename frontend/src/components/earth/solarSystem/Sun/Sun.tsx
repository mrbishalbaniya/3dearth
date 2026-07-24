"use client";

/**
 * Sun stack — photosphere, corona, fill light.
 * Distance = compressed Earth–Sun AU from JPL ephemeris; size ≈ angular diameter.
 */
import { useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import { Color, Group, Vector3 } from "three";
import { useEarthStore } from "../../store/earthStore";
import { BodyLabel } from "../BodyLabel";
import { SUN_DEF, sunRadiusAtSceneDistance } from "../catalog";
import { SunCorona } from "./SunCorona";
import { SunLight } from "./SunLight";
import { SunSurface } from "./SunSurface";

interface SunProps {
  sunDirection: Vector3;
  sunColor?: Color;
  segments?: number;
  sceneDistanceRef: MutableRefObject<number>;
  initialRadius: number;
}

export function Sun({
  sunDirection,
  sunColor,
  segments = 64,
  sceneDistanceRef,
  initialRadius,
}: SunProps) {
  const groupRef = useRef<Group>(null);
  const scaleRef = useRef<Group>(null);
  const showLabels = useEarthStore((s) => s.layers.labels);
  const baseDist = useRef(sceneDistanceRef.current);

  useFrame(() => {
    const dist = sceneDistanceRef.current;
    if (groupRef.current) {
      groupRef.current.position.copy(sunDirection).multiplyScalar(dist);
    }
    if (scaleRef.current && baseDist.current > 1e-6) {
      const r = sunRadiusAtSceneDistance(dist);
      const r0 = sunRadiusAtSceneDistance(baseDist.current);
      scaleRef.current.scale.setScalar(r / Math.max(r0, 1e-6));
    }
  });

  return (
    <group ref={groupRef} name="sun">
      <group ref={scaleRef}>
        <SunSurface
          segments={segments}
          tint={sunColor}
          radius={initialRadius}
        />
        <SunCorona
          segments={Math.max(24, Math.floor(segments / 2))}
          radius={initialRadius}
        />
      </group>
      <SunLight />
      {showLabels && (
        <BodyLabel
          text={SUN_DEF.label}
          y={initialRadius * 1.75}
          distanceFactor={22}
          color="rgba(255,236,180,0.92)"
        />
      )}
    </group>
  );
}
