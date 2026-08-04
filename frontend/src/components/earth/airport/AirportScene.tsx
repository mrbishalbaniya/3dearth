"use client";

import { useEffect, useMemo, useState } from "react";
import { AirportManager } from "./AirportManager";
import { AirportLighting } from "./AirportLighting";
import { AirportObjects } from "./AirportObjects";
import { AirportNavigation } from "./AirportNavigation";
import { AirportCollision } from "./AirportCollision";
import { AirportLOD } from "./AirportLOD";
import { AirportNavaids } from "./AirportNavaids";
import { AirportGroundVehicles } from "./AirportGroundVehicles";
import { AirportPerimeter } from "./AirportPerimeter";
import { useEarthStore } from "../store/earthStore";
import { useGameStore } from "../../game/store/gameStore";
import type { AirportLayout } from "./types";
import { AirportWeather } from "./AirportWeather";

export function AirportDebugOverlay({
  navigation,
  collision,
}: {
  navigation: AirportNavigation;
  collision: AirportCollision;
}) {
  const debugMode = useEarthStore((s) => s.debugMode);
  if (!debugMode) return null;

  const nodes = navigation.getNodes();
  const graph = navigation.getTaxiGraph();
  return (
    <group name="airport-debug">
      {nodes.map((node) => (
        <mesh key={node.id} position={node.position}>
          <sphereGeometry args={[0.0015, 10, 10]} />
          <meshBasicMaterial color={node.kind === "runway" ? "#f97316" : node.kind === "hold-short" ? "#ef4444" : "#22c55e"} />
        </mesh>
      ))}
      {graph.map((edge, index) => {
        const from = navigation.getNode(edge.from)?.position;
        const to = navigation.getNode(edge.to)?.position;
        if (!from || !to) return null;
        return (
          <line key={`${edge.from}-${edge.to}-${index}`}>
            <bufferGeometry attach="geometry">
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([from.x, from.y, from.z, to.x, to.y, to.z])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#67e8f9" />
          </line>
        );
      })}
      <mesh position={navigation.getFrame().origin}>
        <sphereGeometry args={[0.0025, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={navigation.getFrame().origin.clone().add(collision.getFrame().up.clone().multiplyScalar(0.01))}>
        <sphereGeometry args={[0.0015, 10, 10]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>
    </group>
  );
}

export function AirportScene() {
  const weather = useEarthStore((s) => s.weather);
  const debugMode = useEarthStore((s) => s.debugMode);
  const cameraDistance = useEarthStore((s) => s.cameraDistance);
  const flightMode = useGameStore((s) => s.mode === "flight");
  const [layout, setLayout] = useState<AirportLayout | null>(null);

  const manager = useMemo(() => new AirportManager(), []);
  const lighting = useMemo(() => new AirportWeather().buildLighting(weather), [weather]);
  const lod = useMemo(() => new AirportLOD(), []);
  const navigation = useMemo(() => manager.getNavigation(), [manager]);
  const collision = useMemo(() => manager.getCollision(), [manager]);

  useEffect(() => {
    let alive = true;
    void manager.init(weather).then((result) => {
      if (!alive) return;
      setLayout(result);
    });
    return () => {
      alive = false;
    };
  }, [manager, weather]);

  if (!layout) return null;

  const decision = lod.decide(cameraDistance, flightMode);

  return (
    <group name="tia-airport-scene">
      <AirportLighting state={lighting} />
      <AirportPerimeter layout={layout} />
      <AirportObjects layout={layout} lighting={lighting} />
      <AirportNavaids layout={layout} />
      {decision.showGroundVehicles && <AirportGroundVehicles layout={layout} />}
      {decision.showDebug && debugMode && <AirportDebugOverlay navigation={navigation} collision={collision} />}
    </group>
  );
}
