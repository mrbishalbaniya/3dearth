"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { AdditiveBlending, DoubleSide, Group, Mesh, MeshBasicMaterial } from "three";
import { useEarthStore } from "./store/earthStore";
import {
  EARTH_RADIUS,
  MARKER_ALTITUDE,
  MARKER_BASE_RADIUS,
  MARKER_HOVER_SCALE,
  MARKER_SELECTED_SCALE,
  STATUS_COLORS,
} from "./utils/constants";
import { latLngToVector3 } from "./utils/geo";
import { EARTH_RADIUS_M } from "./utils/zoomLevels";
import type { EarthMarker } from "./types";

interface MarkerMeshProps {
  marker: EarthMarker;
}

function MarkerMesh({ marker }: MarkerMeshProps) {
  const groupRef = useRef<Group>(null);
  const pulseRef = useRef<Mesh>(null);
  const coreRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const selectedMarkerId = useEarthStore((s) => s.selectedMarkerId);
  const selectMarker = useEarthStore((s) => s.selectMarker);
  const hoverMarker = useEarthStore((s) => s.hoverMarker);
  const requestFlyTo = useEarthStore((s) => s.requestFlyTo);
  const reducedMotion = useEarthStore((s) => s.reducedMotion);
  const altitudeM = useEarthStore((s) => s.altitudeM);
  const zoomLevel = useEarthStore((s) => s.zoomLevel);

  const selected = selectedMarkerId === marker.id;
  const color =
    marker.color || STATUS_COLORS[marker.status || "active"] || "#5eead4";
  const statusColor = STATUS_COLORS[marker.status || "active"];

  const localPos = useMemo(() => {
    const altitude = EARTH_RADIUS + (marker.altitude ?? MARKER_ALTITUDE);
    return latLngToVector3(marker.lat, marker.lng, altitude);
  }, [marker.lat, marker.lng, marker.altitude]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const radiusScale =
      altitudeM > 1_000_000
        ? 1
        : altitudeM > 100_000
          ? 0.55
          : altitudeM > 10_000
            ? 0.22
            : altitudeM > 1_000
              ? 0.08
              : Math.max(
                  0.02,
                  (altitudeM * 0.5) / EARTH_RADIUS_M / MARKER_BASE_RADIUS,
                );

    groupRef.current.visible = zoomLevel < 6 || selected || hovered;
    groupRef.current.position.copy(localPos);
    groupRef.current.lookAt(0, 0, 0);
    groupRef.current.rotateX(Math.PI / 2);
    groupRef.current.scale.setScalar(radiusScale);

    const t = clock.elapsedTime;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(t * 3 + marker.lat) * 0.12;
    const scaleBase = selected
      ? MARKER_SELECTED_SCALE
      : hovered
        ? MARKER_HOVER_SCALE
        : 1;

    if (coreRef.current) {
      coreRef.current.scale.setScalar(scaleBase * pulse);
    }

    if (pulseRef.current) {
      const p = reducedMotion ? 0.5 : (Math.sin(t * 2.2) + 1) / 2;
      pulseRef.current.scale.setScalar(1.4 + p * 1.8);
      const mat = pulseRef.current.material as MeshBasicMaterial;
      mat.opacity = selected ? 0.45 * (1 - p) : 0.28 * (1 - p);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, -0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[MARKER_BASE_RADIUS * 2.2, 24]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry
          args={[MARKER_BASE_RADIUS * 1.1, MARKER_BASE_RADIUS * 1.6, 48]}
        />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>

      <mesh
        ref={coreRef}
        onClick={(e) => {
          e.stopPropagation();
          selectMarker(marker.id);
          requestFlyTo({
            lat: marker.lat,
            lng: marker.lng,
            altitudeM: 12_000,
            duration: 1.6,
          });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          hoverMarker(marker.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          hoverMarker(null);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[MARKER_BASE_RADIUS, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected || hovered ? 1.4 : 0.75}
          roughness={0.25}
          metalness={0.35}
        />
      </mesh>

      <mesh position={[MARKER_BASE_RADIUS * 0.7, MARKER_BASE_RADIUS * 0.7, 0]}>
        <sphereGeometry args={[MARKER_BASE_RADIUS * 0.28, 12, 12]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      <mesh scale={2.4}>
        <sphereGeometry args={[MARKER_BASE_RADIUS, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered || selected ? 0.22 : 0.1}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {(hovered || selected) && (
        <Html
          distanceFactor={2.4}
          position={[0, MARKER_BASE_RADIUS * 4, 0]}
          style={{ pointerEvents: "none" }}
          center
        >
          <div className="earth-marker-tooltip">
            <div className="earth-marker-tooltip__row">
              {marker.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={marker.avatarUrl}
                  alt=""
                  className="earth-marker-tooltip__avatar"
                />
              ) : (
                <span
                  className="earth-marker-tooltip__dot"
                  style={{ background: color }}
                />
              )}
              <div>
                <div className="earth-marker-tooltip__name">{marker.name}</div>
                {marker.description && (
                  <div className="earth-marker-tooltip__desc">
                    {marker.description}
                  </div>
                )}
              </div>
            </div>
            <div className="earth-marker-tooltip__meta">
              <span
                className="earth-marker-tooltip__status"
                style={{ color: statusColor }}
              >
                {marker.status || "active"}
              </span>
              <span>
                {marker.lat.toFixed(2)}°, {marker.lng.toFixed(2)}°
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function Markers() {
  const markers = useEarthStore((s) => s.markers);
  const visible = useEarthStore((s) => s.layers.markers);

  if (!visible) return null;

  return (
    <group>
      {markers.map((marker) => (
        <MarkerMesh key={marker.id} marker={marker} />
      ))}
    </group>
  );
}
