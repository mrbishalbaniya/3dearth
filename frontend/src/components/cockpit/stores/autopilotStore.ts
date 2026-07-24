"use client";

import { create } from "zustand";
import {
  createAutopilot,
  stepAutopilot,
  type AutopilotState,
} from "../../game/Autopilot/AutopilotController";

interface ApStore {
  ap: AutopilotState;
  syncFromFlight: (hdg: number, altM: number, tasMs: number) => void;
  setMaster: (on: boolean) => void;
  setLateral: (m: AutopilotState["lateral"]) => void;
  setVertical: (m: AutopilotState["vertical"]) => void;
  setSpeed: (m: AutopilotState["speed"]) => void;
  setTargetHdg: (d: number) => void;
  setTargetAlt: (m: number) => void;
  setTargetVs: (ms: number) => void;
  setTargetSpeed: (ms: number) => void;
  step: (sensors: {
    hdgDeg: number;
    altM: number;
    vsMs: number;
    tasMs: number;
  }, dt: number) => { pitch: number; roll: number; yaw: number; throttle: number };
}

export const useAutopilotStore = create<ApStore>((set, get) => ({
  ap: createAutopilot(),

  syncFromFlight: (hdg, altM, tasMs) =>
    set((s) => ({
      ap: {
        ...s.ap,
        targetHdgDeg: Math.round(hdg),
        targetAltM: Math.round(altM / 50) * 50,
        targetSpeedMs: tasMs,
      },
    })),

  setMaster: (master) =>
    set((s) => ({
      ap: {
        ...s.ap,
        master,
        lateral: master && s.ap.lateral === "off" ? "hdg" : s.ap.lateral,
        vertical: master && s.ap.vertical === "off" ? "alt" : s.ap.vertical,
      },
    })),

  setLateral: (lateral) =>
    set((s) => ({
      ap: {
        ...s.ap,
        lateral,
        master: lateral !== "off" ? true : s.ap.master,
      },
    })),

  setVertical: (vertical) =>
    set((s) => ({
      ap: {
        ...s.ap,
        vertical,
        master: vertical !== "off" ? true : s.ap.master,
      },
    })),

  setSpeed: (speed) => set((s) => ({ ap: { ...s.ap, speed } })),

  setTargetHdg: (targetHdgDeg) =>
    set((s) => ({
      ap: { ...s.ap, targetHdgDeg: ((targetHdgDeg % 360) + 360) % 360 },
    })),

  setTargetAlt: (targetAltM) =>
    set((s) => ({ ap: { ...s.ap, targetAltM } })),

  setTargetVs: (targetVsMs) =>
    set((s) => ({ ap: { ...s.ap, targetVsMs } })),

  setTargetSpeed: (targetSpeedMs) =>
    set((s) => ({ ap: { ...s.ap, targetSpeedMs } })),

  step: (sensors, dt) => {
    const { ap, cmd } = stepAutopilot(get().ap, sensors, dt);
    set({ ap });
    return cmd;
  },
}));
