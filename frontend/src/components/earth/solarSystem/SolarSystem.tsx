"use client";

/**
 * Solar System root — Sun, planet worlds, asteroid + Kuiper belts.
 * Earth-centered observatory; real-time UTC JPL/IAU ephemeris + spin.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, Group, Vector3 } from "three";
import { useEarthStore } from "../store/earthStore";
import { AsteroidBelt } from "./Asteroids/AsteroidBelt";
import { KuiperBelt } from "./Asteroids/KuiperBelt";
import { PLANET_DEFS, sunRadiusAtSceneDistance } from "./catalog";
import {
  auToSceneDistance,
  computePlanetStates,
  eclipticToSceneAligningSun,
} from "./ephemeris";
import { PlanetWorld } from "./Planet/PlanetWorld";
import { Sun } from "./Sun/Sun";
import { getSolarSystemDate } from "./time";
import { setSolarBodyWorldPos } from "./view";

interface SolarSystemProps {
  sunDirection: Vector3;
  sunColor?: Color;
}

export function SolarSystem({ sunDirection, sunColor }: SolarSystemProps) {
  const rootRef = useRef<Group>(null);
  const planetRefs = useRef<Record<string, Group | null>>({});
  const sunDistRef = useRef(auToSceneDistance(1));
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const starsOn = useEarthStore((s) => s.layers.stars);
  const qualityId = useEarthStore((s) => s.qualityId);
  const selected = useEarthStore((s) => s.selectedSolarBody);
  const showBelts = useEarthStore((s) => s.solarLayers.belts);

  const tmpScene = useMemo(() => new Vector3(), []);
  const tmpEarthHelio = useMemo(() => new Vector3(), []);

  const deepSpace = starsOn && zoomLevel <= 2 && altitudeM > 1_200_000;
  const segments =
    qualityId === "low" ? 32 : qualityId === "medium" ? 40 : 56;
  const sunSegs = qualityId === "low" ? 40 : 64;
  const focusing =
    selected !== "overview" && selected !== "earth" && selected != null;

  useFrame(() => {
    if (rootRef.current) rootRef.current.visible = deepSpace;
    if (!deepSpace) return;

    const date = getSolarSystemDate();
    const states = computePlanetStates(date);
    const earth = states.find((s) => s.id === "earth");
    if (!earth) return;
    tmpEarthHelio.copy(earth.heliocentric);

    sunDistRef.current = auToSceneDistance(
      Math.max(0.9, tmpEarthHelio.length()),
    );

    // Sun world position for tour camera
    const sunPos = tmpScene
      .copy(sunDirection)
      .multiplyScalar(sunDistRef.current);
    setSolarBodyWorldPos("sun", sunPos.x, sunPos.y, sunPos.z);
    setSolarBodyWorldPos("earth", 0, 0, 0);

    for (const def of PLANET_DEFS) {
      const st = states.find((s) => s.id === def.id);
      const g = planetRefs.current[def.id];
      if (!st || !g) continue;
      eclipticToSceneAligningSun(
        st.fromEarth,
        sunDirection,
        tmpEarthHelio,
        tmpScene,
      );
      const dist = auToSceneDistance(st.distanceAu);
      if (tmpScene.lengthSq() < 1e-12) {
        tmpScene.copy(sunDirection).multiplyScalar(dist * 0.92);
      } else {
        tmpScene.normalize().multiplyScalar(dist);
      }
      g.position.copy(tmpScene);
      g.visible = dist > 1.2;
      setSolarBodyWorldPos(def.id, tmpScene.x, tmpScene.y, tmpScene.z);
    }
  });

  return (
    <group ref={rootRef} name="solar-system" visible={false}>
      <Sun
        sunDirection={sunDirection}
        sunColor={sunColor}
        segments={sunSegs}
        sceneDistanceRef={sunDistRef}
        initialRadius={sunRadiusAtSceneDistance(auToSceneDistance(1))}
      />

      {PLANET_DEFS.map((def) => (
        <group
          key={def.id}
          ref={(node) => {
            planetRefs.current[def.id] = node;
          }}
          frustumCulled={false}
        >
          <PlanetWorld
            def={def}
            sunDirection={sunDirection}
            sunColor={sunColor}
            segments={segments}
            focused={focusing && selected === def.id}
            dimmed={focusing && selected !== def.id}
          />
        </group>
      ))}

      <AsteroidBelt
        sunDirection={sunDirection}
        visible={deepSpace && showBelts && !focusing}
      />
      <KuiperBelt
        sunDirection={sunDirection}
        visible={deepSpace && showBelts && !focusing}
      />
    </group>
  );
}
