"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from "three";
import { KUIPER_HINT } from "../catalog";
import {
  auToSceneDistance,
  computePlanetStates,
  eclipticToSceneAligningSun,
} from "../ephemeris";
import { daysSinceJ2000, getSolarSystemDate } from "../time";
import { makeBeltSeeds } from "./seeds";

interface KuiperBeltProps {
  sunDirection: Vector3;
  visible: boolean;
}

function meanAnomaly(days: number, aAu: number, phase: number): number {
  const periodDays = Math.pow(Math.max(aAu, 0.05), 1.5) * 365.25;
  return phase + (days / periodDays) * Math.PI * 2;
}

export function KuiperBelt({ sunDirection, visible }: KuiperBeltProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const groupRef = useRef<Group>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const tmp = useMemo(() => new Vector3(), []);
  const tmpE = useMemo(() => new Vector3(), []);
  const earthHelio = useMemo(() => new Vector3(), []);

  const geo = useMemo(() => new SphereGeometry(1, 4, 3), []);
  const mat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(KUIPER_HINT.color),
        roughness: 0.98,
        metalness: 0.05,
      }),
    [],
  );

  const seeds = useMemo(
    () =>
      makeBeltSeeds(
        KUIPER_HINT.count,
        KUIPER_HINT.minAu,
        KUIPER_HINT.maxAu,
        0.006,
        0.018,
        500,
        0.35,
      ),
    [],
  );

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  useFrame(() => {
    if (groupRef.current) groupRef.current.visible = visible;
    if (!visible || !meshRef.current) return;

    const date = getSolarSystemDate();
    const days = daysSinceJ2000(date);
    const earth = computePlanetStates(date).find((s) => s.id === "earth");
    if (!earth) return;
    earthHelio.copy(earth.heliocentric);

    const mesh = meshRef.current;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      const a = meanAnomaly(days, s.a, s.phase);
      tmpE.set(
        Math.cos(a) * s.a,
        Math.sin(s.inc) * s.a * 0.35,
        Math.sin(a) * s.a,
      );
      tmpE.sub(earthHelio);
      const distAu = tmpE.length();
      eclipticToSceneAligningSun(tmpE, sunDirection, earthHelio, tmp);
      const dist = auToSceneDistance(distAu);
      if (tmp.lengthSq() < 1e-10) {
        dummy.scale.setScalar(0);
      } else {
        tmp.normalize().multiplyScalar(dist);
        dummy.position.copy(tmp);
        dummy.scale.setScalar(s.size);
        dummy.rotation.set(s.phase, s.inc, a);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef} name="kuiper-belt" visible={false}>
      <instancedMesh
        ref={meshRef}
        args={[geo, mat, KUIPER_HINT.count]}
        frustumCulled={false}
      />
    </group>
  );
}
