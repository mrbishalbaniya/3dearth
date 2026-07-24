"use client";

/**
 * OLED/LCD instrument surface — attaches under a named socket.
 * Plane is the display glass only (avionics), not cockpit structure.
 */
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  LinearFilter,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";
import {
  paintEicas,
  paintNd,
  paintPfd,
} from "../displays/paintInstruments";

export type DisplayKind = "pfd" | "nd" | "eicas";

const PAINTERS: Record<
  DisplayKind,
  (ctx: CanvasRenderingContext2D, w: number, h: number) => void
> = {
  pfd: paintPfd,
  nd: paintNd,
  eicas: paintEicas,
};

export function CockpitDisplayScreen({
  kind,
  width = 512,
  height = 512,
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  size = [0.28, 0.24] as [number, number],
}: {
  kind: DisplayKind;
  width?: number;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
}) {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    return c;
  }, [width, height]);

  const texture = useMemo(() => {
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearFilter;
    t.magFilter = LinearFilter;
    t.generateMipmaps = false;
    return t;
  }, [canvas]);

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: "#ffffff",
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.1,
        toneMapped: false,
      }),
    [texture],
  );

  useLayoutEffect(() => {
    return () => {
      texture.dispose();
      material.dispose();
    };
  }, [texture, material]);

  useFrame(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    PAINTERS[kind](ctx, width, height);
    texture.needsUpdate = true;
  });

  return (
    <mesh
      position={position}
      rotation={rotation}
      material={material}
      name={`display_${kind}`}
    >
      {/* Instrument bezel glass only — not cabin geometry */}
      <planeGeometry args={[size[0], size[1]]} />
    </mesh>
  );
}
