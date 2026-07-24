"use client";

import { Html } from "@react-three/drei";

interface BodyLabelProps {
  text: string;
  y: number;
  distanceFactor?: number;
  color?: string;
}

export function BodyLabel({
  text,
  y,
  distanceFactor = 18,
  color = "rgba(230,240,255,0.88)",
}: BodyLabelProps) {
  return (
    <Html
      center
      distanceFactor={distanceFactor}
      style={{
        pointerEvents: "none",
        color,
        fontSize: "11px",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        letterSpacing: "0.04em",
        textShadow: "0 1px 4px rgba(0,0,0,0.85)",
        whiteSpace: "nowrap",
      }}
      position={[0, y, 0]}
    >
      {text}
    </Html>
  );
}
