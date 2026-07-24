"use client";

/**
 * One planet world — Surface + Atmosphere + Clouds + Rings + Moons
 * (mirrors EarthScene layer composition for a single body).
 */
import { useMemo } from "react";
import { Color, Vector3 } from "three";
import { useEarthStore } from "../../store/earthStore";
import { BodyLabel } from "../BodyLabel";
import type { PlanetDef } from "../catalog";
import { MoonBody } from "../Moon/MoonBody";
import { Atmosphere } from "./Atmosphere";
import { Clouds } from "./Clouds";
import { Rings } from "./Rings";
import { Surface } from "./Surface";

interface PlanetWorldProps {
  def: PlanetDef;
  sunDirection: Vector3;
  sunColor?: Color;
  segments: number;
  /** Dim non-focused bodies during planet tour */
  focused?: boolean;
  dimmed?: boolean;
}

export function PlanetWorld({
  def,
  sunDirection,
  sunColor,
  segments,
  focused = false,
  dimmed = false,
}: PlanetWorldProps) {
  const solarLayers = useEarthStore((s) => s.solarLayers);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const moonSegs = Math.max(12, Math.floor(segments / 2.5));

  const tiltRad = useMemo(
    () => (def.obliquityDeg * Math.PI) / 180,
    [def.obliquityDeg],
  );

  const scale = focused ? 1.45 : dimmed ? 0.42 : 1;

  return (
    <group
      name={`planet-world-${def.id}`}
      rotation={[tiltRad, 0, 0]}
      scale={scale}
    >
      <Surface
        def={def}
        sunDirection={sunDirection}
        sunColor={sunColor}
        segments={segments}
      />
      {def.atmosphere && solarLayers.atmosphere && (
        <Atmosphere
          radius={def.radius}
          atmosphere={def.atmosphere}
          sunDirection={sunDirection}
          segments={segments}
        />
      )}
      {def.clouds && solarLayers.clouds && (
        <Clouds
          radius={def.radius}
          clouds={def.clouds}
          sunDirection={sunDirection}
          rotation={def.rotation}
          segments={segments}
          reducedMotion={reducedMotion}
        />
      )}
      {def.rings && solarLayers.rings && (
        <Rings radius={def.radius} rings={def.rings} />
      )}
      {solarLayers.moons &&
        def.moons.map((moon) => (
          <MoonBody
            key={moon.id}
            moon={moon}
            sunDirection={sunDirection}
            sunColor={sunColor}
            segments={moonSegs}
          />
        ))}
      {solarLayers.labels && (
        <BodyLabel
          text={def.label}
          y={def.radius * (def.rings ? 2.4 : 1.85)}
        />
      )}
    </group>
  );
}
