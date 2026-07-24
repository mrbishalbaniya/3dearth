"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  DoubleSide,
  LineBasicMaterial,
  MeshBasicMaterial,
  ShaderMaterial,
} from "three";
import { useEarthStore } from "../../store/earthStore";
import { EARTH_RADIUS } from "../../utils/constants";
import {
  bboxAround,
  fetchWaterways,
  quantizeFocus,
} from "../overpass";
import {
  createLineGeometry,
  lineStringToSpherePositions,
  polygonToSphereGeometry,
  applyVertexColor,
} from "../geoProject";
import type { OsmPolygonFeature, OsmWayFeature } from "../types";

/** Subtle animated specular water overlay for ocean shell. */
function OceanShell({ opacity }: { opacity: number }) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: opacity },
          uColor: { value: new Color("#0a3d66") },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vWorld;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uOpacity;
          uniform vec3 uColor;
          varying vec3 vNormal;
          varying vec3 vWorld;
          void main() {
            float wave = sin(vWorld.x * 40.0 + uTime * 0.6) *
                         cos(vWorld.z * 36.0 - uTime * 0.45) * 0.04;
            float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0,0.0,1.0))), 2.0);
            vec3 col = uColor + vec3(0.05, 0.12, 0.18) * wave + vec3(0.15) * fresnel;
            gl_FragColor = vec4(col, uOpacity * (0.22 + fresnel * 0.25));
          }
        `,
      }),
    [],
  );

  useFrame((_, delta) => {
    mat.uniforms.uTime.value += delta;
    mat.uniforms.uOpacity.value = opacity;
  });

  useEffect(() => () => mat.dispose(), [mat]);

  if (opacity < 0.01) return null;

  return (
    <mesh renderOrder={2}>
      <sphereGeometry args={[EARTH_RADIUS * 1.0008, 64, 64]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export function WaterLayer() {
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const focusLat = useEarthStore((s) => s.focusLat);
  const focusLng = useEarthStore((s) => s.focusLng);
  const waterOn = useEarthStore((s) => s.gisLayers.water);
  const riversOn = useEarthStore((s) => s.gisLayers.rivers);
  const dryEarthOn = useEarthStore((s) => s.dryEarth.enabled);
  // Dry Earth: no oceans, rivers, or lakes
  const enabled = !dryEarthOn && (waterOn || riversOn);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);

  const [ways, setWays] = useState<OsmWayFeature[]>([]);
  const [polys, setPolys] = useState<OsmPolygonFeature[]>([]);
  const q = quantizeFocus(focusLat, focusLng, zoomLevel >= 6 ? 0.015 : 0.04);

  useEffect(() => {
    if (!enabled || altitudeM > 400_000 || altitudeM < 100) {
      setWays([]);
      setPolys([]);
      return;
    }
    const ctrl = new AbortController();
    const delta = altitudeM > 50_000 ? 0.35 : altitudeM > 10_000 ? 0.12 : 0.05;
    fetchWaterways(bboxAround(q.lat, q.lng, delta), ctrl.signal)
      .then((res) => {
        setWays(res.ways.slice(0, 800));
        setPolys(res.polygons.slice(0, 200));
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [enabled, q.lat, q.lng, altitudeM]);

  // Global lakes / rivers from Natural Earth at planet/continent scale
  const [globalLines, setGlobalLines] = useState<Float32Array[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.all([
      fetch("/data/rivers.geojson").then((r) => r.json()),
      fetch("/data/lakes.geojson").then((r) => r.json()),
    ]).then(([rivers, lakes]) => {
      if (cancelled) return;
      const segs: Float32Array[] = [];
      for (const f of rivers.features || []) {
        const g = f.geometry;
        if (!g) continue;
        if (g.type === "LineString") {
          segs.push(lineStringToSpherePositions(g.coordinates, EARTH_RADIUS * 1.002, 1.2));
        } else if (g.type === "MultiLineString") {
          for (const line of g.coordinates) {
            segs.push(lineStringToSpherePositions(line, EARTH_RADIUS * 1.002, 1.2));
          }
        }
      }
      for (const f of lakes.features || []) {
        const g = f.geometry;
        if (!g) continue;
        const rings =
          g.type === "Polygon"
            ? [g.coordinates[0]]
            : g.type === "MultiPolygon"
              ? g.coordinates.map((p: number[][][]) => p[0])
              : [];
        for (const ring of rings) {
          segs.push(
            lineStringToSpherePositions(
              ring.map((c: number[]) => [c[0], c[1]] as [number, number]),
              EARTH_RADIUS * 1.0016,
              1.5,
            ),
          );
        }
      }
      setGlobalLines(segs);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const localLineGeo = useMemo(() => {
    if (!ways.length) return null;
    const segs = ways.map((w) =>
      lineStringToSpherePositions(w.coords, EARTH_RADIUS * 1.0022, 0.08),
    );
    return createLineGeometry(segs);
  }, [ways]);

  const globalLineGeo = useMemo(() => {
    if (!globalLines.length) return null;
    return createLineGeometry(globalLines);
  }, [globalLines]);

  const polyMeshes = useMemo(() => {
    return polys.map((p) => {
      const geo = polygonToSphereGeometry(p.rings[0], EARTH_RADIUS * 1.0017);
      applyVertexColor(geo, "#1a6a9a");
      return { id: p.id, geo };
    });
  }, [polys]);

  useEffect(() => {
    return () => {
      localLineGeo?.dispose();
      globalLineGeo?.dispose();
      for (const p of polyMeshes) p.geo.dispose();
    };
  }, [localLineGeo, globalLineGeo, polyMeshes]);

  if (!enabled) return null;

  const oceanOpacity =
    waterOn && !dryEarthOn
      ? altitudeM < 500_000 && zoomLevel >= 3
        ? zoomLevel <= 4
          ? 0.1
          : 0.06
        : 0
      : 0;

  return (
    <group>
      {waterOn && <OceanShell opacity={oceanOpacity} />}

      {riversOn && globalLineGeo && zoomLevel <= 4 && (
        <lineSegments geometry={globalLineGeo} renderOrder={6}>
          <lineBasicMaterial
            color="#4db8e8"
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {riversOn && localLineGeo && (
        <lineSegments geometry={localLineGeo} renderOrder={7}>
          <lineBasicMaterial
            color="#5ec8f0"
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {waterOn &&
        polyMeshes.map(({ id, geo }) => (
          <mesh key={id} geometry={geo} renderOrder={6} frustumCulled>
            <meshBasicMaterial
              color="#1a6a9a"
              transparent
              opacity={0.55}
              depthWrite={false}
              side={DoubleSide}
              toneMapped={false}
            />
          </mesh>
        ))}
    </group>
  );
}

void Color;
void LineBasicMaterial;
void MeshBasicMaterial;
