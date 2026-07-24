"use client";

/**
 * Raycasts against named control meshes from the GLB (or tagged placeholders).
 * No procedural switch boxes — only existing scene nodes.
 */
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Raycaster, Vector2, type Object3D } from "three";
import {
  CONTROL_NODE_ACTIONS,
  type CockpitControlAction,
} from "../models/nodeContract";
import { useCockpitStore } from "../stores/cockpitStore";
import { useAutopilotStore } from "../stores/autopilotStore";
import { useGameStore } from "../../game/store/gameStore";

export function NamedControlRaycast({
  nodeIndex,
  root,
}: {
  nodeIndex: Map<string, Object3D> | null;
  root: Object3D | null;
}) {
  const { camera, gl } = useThree();
  const ray = useRef(new Raycaster());
  const pointer = useRef(new Vector2());

  useEffect(() => {
    if (!root && !nodeIndex) return;
    const el = gl.domElement;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.current.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };

    const onClick = () => {
      const targets: Object3D[] = [];
      if (nodeIndex) {
        for (const [name, obj] of nodeIndex) {
          if (CONTROL_NODE_ACTIONS[name as keyof typeof CONTROL_NODE_ACTIONS]) {
            targets.push(obj);
          }
        }
      }
      if (root) {
        root.traverse((o) => {
          if (
            o.name &&
            CONTROL_NODE_ACTIONS[o.name as keyof typeof CONTROL_NODE_ACTIONS]
          ) {
            targets.push(o);
          }
        });
      }
      if (!targets.length) return;

      ray.current.setFromCamera(pointer.current, camera);
      const hits = ray.current.intersectObjects(targets, true);
      const hit = hits[0];
      if (!hit) return;

      let obj: Object3D | null = hit.object;
      let action: CockpitControlAction | undefined;
      while (obj) {
        action =
          CONTROL_NODE_ACTIONS[obj.name as keyof typeof CONTROL_NODE_ACTIONS];
        if (action) break;
        obj = obj.parent;
      }
      if (action) {
        applyControlAction(action);
        playClick();
      }
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("click", onClick);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("click", onClick);
    };
  }, [camera, gl, nodeIndex, root]);

  return null;
}

function applyControlAction(action: CockpitControlAction) {
  const ck = useCockpitStore.getState();
  const ap = useAutopilotStore.getState();
  switch (action) {
    case "throttle_up": {
      const cur =
        ck.throttleSetpoint ??
        useGameStore.getState().flightState?.throttle ??
        0;
      ck.setThrottleSetpoint(Math.min(1, cur + 0.08));
      break;
    }
    case "throttle_down": {
      const cur =
        ck.throttleSetpoint ??
        useGameStore.getState().flightState?.throttle ??
        0;
      ck.setThrottleSetpoint(Math.max(0, cur - 0.08));
      break;
    }
    case "flaps": {
      const f = useGameStore.getState().flightState?.flaps ?? 0;
      const next = f < 0.25 ? 0.5 : f < 0.75 ? 1 : 0;
      useGameStore.getState().patchFlightState({ flaps: next });
      break;
    }
    case "gear":
      ck.requestGearToggle();
      break;
    case "park_brake":
      ck.setParkingBrake(!ck.parkingBrake);
      break;
    case "battery":
      ck.patchOverhead({ battery: !ck.overhead.battery });
      break;
    case "avionics":
      ck.patchOverhead({ avionics: !ck.overhead.avionics });
      break;
    case "ap":
      ap.setMaster(!ap.ap.master);
      break;
    case "landing_light":
      ck.patchOverhead({ landingLight: !ck.overhead.landingLight });
      break;
  }
}

function playClick() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 520;
    o.type = "square";
    g.gain.value = 0.025;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
    o.stop(ctx.currentTime + 0.04);
    window.setTimeout(() => void ctx.close(), 80);
  } catch {
    /* ignore */
  }
}
