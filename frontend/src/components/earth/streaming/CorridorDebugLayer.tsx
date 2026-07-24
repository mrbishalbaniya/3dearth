"use client";

/**
 * Debug visualization of the flight corridor centerline + sample points.
 * Visible when earth debugMode is on.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Line,
  LineBasicMaterial,
  Points,
  PointsMaterial,
} from "three";
import { useEarthStore } from "../store/earthStore";
import { latLngToVector3 } from "../utils/geo";
import { EARTH_RADIUS_M } from "../utils/zoomLevels";
import { CorridorStreamer } from "./CorridorStreamer";

function shellR() {
  return 1 + 180 / EARTH_RADIUS_M;
}

export function CorridorDebugLayer() {
  const debug = useEarthStore((s) => s.debugMode);
  const [tick, setTick] = useState(0);
  const acc = useRef(0);

  useFrame((_, dt) => {
    if (!debug) return;
    acc.current += dt;
    if (acc.current > 0.5) {
      acc.current = 0;
      setTick((t) => t + 1);
    }
  });

  const snap = CorridorStreamer.getSnapshot();
  void tick;

  const lineObj = useMemo(() => {
    const geo = new BufferGeometry();
    const mat = new LineBasicMaterial({
      color: new Color("#3dd6c6"),
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    if (snap.active && snap.centerline.length >= 2) {
      const r = shellR();
      const pos = new Float32Array(snap.centerline.length * 3);
      snap.centerline.forEach((p, i) => {
        const v = latLngToVector3(p.lat, p.lng, r);
        pos[i * 3] = v.x;
        pos[i * 3 + 1] = v.y;
        pos[i * 3 + 2] = v.z;
      });
      geo.setAttribute("position", new BufferAttribute(pos, 3));
    } else {
      geo.setAttribute("position", new BufferAttribute(new Float32Array(0), 3));
    }
    const line = new Line(geo, mat);
    line.frustumCulled = false;
    line.renderOrder = 40;
    return line;
  }, [snap.active, snap.centerline]);

  const pointsObj = useMemo(() => {
    const geo = new BufferGeometry();
    const mat = new PointsMaterial({
      color: new Color("#f0c040"),
      size: 8,
      sizeAttenuation: false,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });
    if (snap.active && snap.samples.length) {
      const r = shellR();
      const pos = new Float32Array(snap.samples.length * 3);
      snap.samples.forEach((p, i) => {
        const v = latLngToVector3(p.lat, p.lng, r);
        pos[i * 3] = v.x;
        pos[i * 3 + 1] = v.y;
        pos[i * 3 + 2] = v.z;
      });
      geo.setAttribute("position", new BufferAttribute(pos, 3));
    } else {
      geo.setAttribute("position", new BufferAttribute(new Float32Array(0), 3));
    }
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 41;
    return pts;
  }, [snap.active, snap.samples]);

  if (!debug || !snap.active) return null;

  return (
    <group name="flight-corridor-debug">
      <primitive object={lineObj} />
      <primitive object={pointsObj} />
    </group>
  );
}
