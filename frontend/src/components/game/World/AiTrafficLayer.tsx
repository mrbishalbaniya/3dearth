"use client";

/**
 * Instanced AI traffic near the player — lightweight boxes scaled to Earth.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Color, Group, MathUtils, Vector3 } from "three";
import { latLngToVector3 } from "../../earth/utils/geo";
import { EARTH_RADIUS_M } from "../../earth/utils/zoomLevels";
import { worldTraffic } from "./WorldTrafficEngine";
import type { TrafficAircraft } from "./types";

const METERS_TO_SCENE = 1 / EARTH_RADIUS_M;
const _pos = new Vector3();
const _up = new Vector3();
const _fwd = new Vector3();
const _east = new Vector3();
const _north = new Vector3();

function categoryColor(cat: TrafficAircraft["category"]): string {
  switch (cat) {
    case "cargo":
      return "#8a7a5a";
    case "business":
      return "#c0c8d8";
    case "ga":
      return "#6aaa6a";
    case "emergency":
    case "sar":
      return "#d05040";
    case "regional":
      return "#6a90b8";
    default:
      return "#b8c4d4";
  }
}

function AiCraft({ ac }: { ac: TrafficAircraft }) {
  const ref = useRef<Group>(null);
  const color = useMemo(() => new Color(categoryColor(ac.category)), [ac.category]);

  useFrame(() => {
    if (!ref.current) return;
    const r = 1 + ac.altM / EARTH_RADIUS_M;
    latLngToVector3(ac.lat, ac.lng, r, _pos);
    _up.copy(_pos).normalize();
    _east.crossVectors(new Vector3(0, 1, 0), _up).normalize();
    if (_east.lengthSq() < 1e-6) _east.set(1, 0, 0);
    _north.crossVectors(_up, _east).normalize();
    const hdg = ac.hdgDeg * MathUtils.DEG2RAD;
    _fwd
      .copy(_north)
      .multiplyScalar(Math.cos(hdg))
      .addScaledVector(_east, Math.sin(hdg))
      .normalize();
    ref.current.position.copy(_pos);
    ref.current.up.copy(_up);
    ref.current.lookAt(_pos.clone().add(_fwd));
  });

  const s = METERS_TO_SCENE * (ac.category === "ga" ? 0.85 : 1.4);
  return (
    <group ref={ref} scale={s}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.6, 5.5, 4, 8]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[10, 0.12, 1.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

export function AiTrafficLayer() {
  const [list, setList] = useState<TrafficAircraft[]>([]);
  const acc = useRef(0);

  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.35) return;
    acc.current = 0;
    setList(worldTraffic.getRenderable(28));
  });

  return (
    <group name="ai-traffic">
      {list.map((ac) => (
        <AiCraft key={ac.id} ac={ac} />
      ))}
    </group>
  );
}
