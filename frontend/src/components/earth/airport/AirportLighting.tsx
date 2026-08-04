"use client";

import type { AirportLightingState } from "./types";

export function AirportLighting({ state }: { state: AirportLightingState }) {
  const accent = state.wetRunway ? "#9ad7ff" : "#ffe7aa";

  return (
    <group name="tia-lighting">
      <ambientLight intensity={state.night ? 0.12 : 0.42} color={state.night ? "#0b1730" : "#ffffff"} />
      <directionalLight position={[30, 80, 50]} intensity={state.night ? 0.28 : 0.9} color="#fff4d6" />
      <pointLight position={[0.1, 0.04, 0.1]} intensity={state.night ? 2.4 : 0.7} color={accent} distance={3} decay={2} />
      <spotLight position={[-0.08, 0.06, -0.02]} intensity={state.night ? 1.8 : 0.45} angle={0.4} penumbra={0.8} color="#ffe28f" distance={4} decay={2} />
    </group>
  );
}
