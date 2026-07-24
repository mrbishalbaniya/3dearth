"use client";

import { useEffect, useMemo, useRef } from "react";
import type { FlightControlsInput } from "../Types";
import { useGameStore } from "../store/gameStore";

const empty = (): FlightControlsInput => ({
  pitch: 0,
  roll: 0,
  yaw: 0,
  throttle: 0,
  flapsDelta: 0,
  toggleGear: false,
  toggleFlaps: false,
  brakes: false,
});

/**
 * Keyboard + gamepad flight input. Edge-triggered toggles cleared each frame
 * by the consumer via consumeEdge().
 */
export function useFlightInput() {
  const keys = useRef(new Set<string>());
  const edge = useRef({ gear: false, flaps: false, camera: false, pause: false });
  const touch = useRef({ pitch: 0, roll: 0, throttle: 0 });
  const bindings = useGameStore((s) => s.bindings);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (e.code === bindings.gear) edge.current.gear = true;
      if (e.code === bindings.flaps) edge.current.flaps = true;
      if (e.code === bindings.camera) edge.current.camera = true;
      if (e.code === bindings.pause) edge.current.pause = true;
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [bindings]);

  return useMemo(
    () => ({
      sample(): FlightControlsInput {
        const k = keys.current;
        const b = useGameStore.getState().bindings;
        let pitch = 0;
        let roll = 0;
        let yaw = 0;
        let throttle = 0;
        if (k.has(b.pitchUp) || k.has("ArrowUp")) pitch += 1;
        if (k.has(b.pitchDown) || k.has("ArrowDown")) pitch -= 1;
        if (k.has(b.rollLeft) || k.has("ArrowLeft")) roll -= 1;
        if (k.has(b.rollRight) || k.has("ArrowRight")) roll += 1;
        if (k.has(b.yawLeft)) yaw -= 1;
        if (k.has(b.yawRight)) yaw += 1;
        if (k.has(b.throttleUp)) throttle += 1;
        if (k.has(b.throttleDown)) throttle -= 1;

        // Gamepad
        const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : null;
        const gp = pads?.[0];
        if (gp) {
          roll += gp.axes[0] ?? 0;
          pitch -= gp.axes[1] ?? 0;
          yaw += gp.axes[2] ?? 0;
          const rt = gp.buttons[7]?.value ?? 0;
          const lt = gp.buttons[6]?.value ?? 0;
          throttle += rt - lt;
          if (gp.buttons[0]?.pressed) edge.current.gear = true;
          if (gp.buttons[1]?.pressed) edge.current.flaps = true;
        }

        pitch += touch.current.pitch;
        roll += touch.current.roll;
        throttle += touch.current.throttle;

        const out: FlightControlsInput = {
          pitch: Math.max(-1, Math.min(1, pitch)),
          roll: Math.max(-1, Math.min(1, roll)),
          yaw: Math.max(-1, Math.min(1, yaw)),
          throttle: Math.max(-1, Math.min(1, throttle)),
          flapsDelta: 0,
          toggleGear: edge.current.gear,
          toggleFlaps: edge.current.flaps,
          brakes: k.has(b.brakes),
        };
        edge.current.gear = false;
        edge.current.flaps = false;
        return out;
      },
      consumeMeta() {
        const cam = edge.current.camera;
        const pause = edge.current.pause;
        edge.current.camera = false;
        edge.current.pause = false;
        return { camera: cam, pause };
      },
      setTouch( partial: Partial<{ pitch: number; roll: number; throttle: number }>) {
        Object.assign(touch.current, partial);
      },
      idle: empty,
    }),
    [],
  );
}
