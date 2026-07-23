"use client";

import { useMemo } from "react";
import { Color, BufferGeometry, Float32BufferAttribute, LineBasicMaterial } from "three";
import { useEarthStore } from "../../store/earthStore";
import { latLngToVector3 } from "../../utils/geo";
import { EARTH_RADIUS } from "../../utils/constants";

/** Approximate major plate boundary polylines (simplified for globe overlay). */
const PLATE_ARCS: Array<Array<[number, number]>> = [
  // Pacific Ring / Ring of Fire (simplified)
  [
    [60, -150],
    [50, -130],
    [40, -125],
    [20, -110],
    [0, -90],
    [-20, -75],
    [-40, -75],
    [-55, -70],
  ],
  [
    [50, 160],
    [40, 145],
    [30, 140],
    [15, 145],
    [0, 150],
    [-10, 160],
    [-20, 175],
    [-30, -175],
  ],
  // Mid-Atlantic
  [
    [70, -20],
    [50, -30],
    [30, -40],
    [10, -35],
    [-10, -20],
    [-30, -15],
    [-50, -5],
    [-60, 0],
  ],
];

const TRENCH_ARCS: Array<Array<[number, number]>> = [
  [
    [12, 141],
    [11, 142],
    [10, 143],
    [13, 144],
  ],
  [
    [20, -67],
    [19, -66],
    [18, -65],
  ],
  [
    [-9, 108],
    [-10, 110],
    [-11, 112],
  ],
  [
    [-20, -175],
    [-22, -174],
    [-24, -173],
  ],
];

function buildLineGeo(arcs: Array<Array<[number, number]>>, radius: number) {
  const positions: number[] = [];
  for (const arc of arcs) {
    for (let i = 0; i < arc.length - 1; i++) {
      const a = latLngToVector3(arc[i][0], arc[i][1], radius);
      const b = latLngToVector3(arc[i + 1][0], arc[i + 1][1], radius);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geo;
}

/**
 * Optional geological overlays — plate boundaries, trenches, etc.
 * Designed for future GeoJSON / USGS feed swaps without API changes.
 */
export function GeologicalLayers() {
  const enabled = useEarthStore((s) => s.dryEarth.enabled);
  const geo = useEarthStore((s) => s.dryEarth.geological);

  const plateGeo = useMemo(
    () => buildLineGeo(PLATE_ARCS, EARTH_RADIUS * 1.0025),
    [],
  );
  const trenchGeo = useMemo(
    () => buildLineGeo(TRENCH_ARCS, EARTH_RADIUS * 1.0022),
    [],
  );

  const plateMat = useMemo(
    () =>
      new LineBasicMaterial({
        color: new Color("#f59e0b"),
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    [],
  );
  const trenchMat = useMemo(
    () =>
      new LineBasicMaterial({
        color: new Color("#38bdf8"),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    [],
  );

  if (!enabled) return null;

  return (
    <group name="geological-layers">
      {geo.tectonicPlates && (
        <lineSegments geometry={plateGeo} material={plateMat} renderOrder={8} />
      )}
      {geo.oceanTrenches && (
        <lineSegments
          geometry={trenchGeo}
          material={trenchMat}
          renderOrder={8}
        />
      )}
      {geo.faultLines && (
        <lineSegments geometry={plateGeo} material={plateMat} renderOrder={7} />
      )}
    </group>
  );
}
