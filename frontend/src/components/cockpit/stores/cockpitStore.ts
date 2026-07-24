"use client";

import { create } from "zustand";
import {
  DEFAULT_OVERHEAD,
  type ChecklistItem,
  type ChecklistPhase,
  type CockpitSeat,
  type OverheadState,
  type WarningAnnunciation,
} from "../types";

const CHECKLISTS: Record<ChecklistPhase, ChecklistItem[]> = {
  cold_dark: [
    { id: "batt", label: "Battery — ON", done: false },
    { id: "avionics", label: "Avionics — ON", done: false },
    { id: "fuel", label: "Fuel pumps — ON", done: false },
  ],
  engine_start: [
    { id: "mix", label: "Mixture — RICH", done: false },
    { id: "start", label: "Engine start — COMPLETE", done: false },
    { id: "oil", label: "Oil pressure — GREEN", done: false },
  ],
  taxi: [
    { id: "taxi_l", label: "Taxi light — ON", done: false },
    { id: "brk", label: "Brakes — CHECK", done: false },
    { id: "inst", label: "Instruments — CHECK", done: false },
  ],
  before_takeoff: [
    { id: "flaps", label: "Flaps — SET", done: false },
    { id: "trim", label: "Trim — SET", done: false },
    { id: "trans", label: "Transponder — ALT", done: false },
    { id: "lights", label: "Landing light — ON", done: false },
  ],
  climb: [
    { id: "gear_up", label: "Gear — UP", done: false },
    { id: "flaps_up", label: "Flaps — UP", done: false },
  ],
  cruise: [
    { id: "power", label: "Power — CRUISE", done: false },
    { id: "fuel_bal", label: "Fuel balance — CHECK", done: false },
  ],
  descent: [
    { id: "atc", label: "ATC — BRIEF", done: false },
    { id: "wx", label: "Weather — REVIEW", done: false },
  ],
  approach: [
    { id: "gear_dn", label: "Gear — DOWN", done: false },
    { id: "flaps_app", label: "Flaps — APPROACH", done: false },
  ],
  landing: [
    { id: "full_flap", label: "Flaps — LANDING", done: false },
    { id: "spd", label: "Speed — VREF", done: false },
  ],
  shutdown: [
    { id: "idle", label: "Throttle — IDLE", done: false },
    { id: "mags", label: "Magnetos / Fuel — OFF", done: false },
    { id: "batt_off", label: "Battery — OFF", done: false },
  ],
};

interface CockpitStore {
  /** Glass deck visible when in any internal seat */
  deckOpen: boolean;
  seat: CockpitSeat;
  panelBrightness: number;
  floodLight: number;
  emergencyRed: boolean;
  hudEnabled: boolean;
  ndRangeNm: number;
  wxRadarOn: boolean;
  overhead: OverheadState;
  /** Absolute throttle 0..1 when set from quadrant; null = keyboard delta */
  throttleSetpoint: number | null;
  speedBrake: number;
  parkingBrake: boolean;
  trimElevator: number;
  checklistPhase: ChecklistPhase;
  checklist: ChecklistItem[];
  warnings: WarningAnnunciation[];
  radioCom1Mhz: number;
  transponderCode: string;
  showChecklist: boolean;
  showOverhead: boolean;
  gearToggleRequest: boolean;

  setDeckOpen: (v: boolean) => void;
  setSeat: (s: CockpitSeat) => void;
  setPanelBrightness: (v: number) => void;
  setFloodLight: (v: number) => void;
  setEmergencyRed: (v: boolean) => void;
  setHudEnabled: (v: boolean) => void;
  setNdRangeNm: (v: number) => void;
  setWxRadarOn: (v: boolean) => void;
  patchOverhead: (p: Partial<OverheadState>) => void;
  setThrottleSetpoint: (v: number | null) => void;
  setSpeedBrake: (v: number) => void;
  setParkingBrake: (v: boolean) => void;
  setTrimElevator: (v: number) => void;
  setChecklistPhase: (p: ChecklistPhase) => void;
  toggleChecklistItem: (id: string) => void;
  setWarnings: (w: WarningAnnunciation[]) => void;
  setRadioCom1: (mhz: number) => void;
  setTransponder: (code: string) => void;
  setShowChecklist: (v: boolean) => void;
  setShowOverhead: (v: boolean) => void;
  requestGearToggle: () => void;
  consumeGearToggle: () => boolean;
  resetForFlight: () => void;
}

export const useCockpitStore = create<CockpitStore>((set, get) => ({
  deckOpen: false,
  seat: "captain",
  panelBrightness: 0.85,
  floodLight: 0.35,
  emergencyRed: false,
  hudEnabled: false,
  ndRangeNm: 40,
  wxRadarOn: true,
  overhead: { ...DEFAULT_OVERHEAD },
  throttleSetpoint: null,
  speedBrake: 0,
  parkingBrake: false,
  trimElevator: 0,
  checklistPhase: "before_takeoff",
  checklist: CHECKLISTS.before_takeoff.map((c) => ({ ...c })),
  warnings: [],
  radioCom1Mhz: 118.7,
  transponderCode: "1200",
  showChecklist: false,
  showOverhead: false,
  gearToggleRequest: false,

  setDeckOpen: (deckOpen) => set({ deckOpen }),
  setSeat: (seat) => set({ seat, deckOpen: true }),
  setPanelBrightness: (panelBrightness) => set({ panelBrightness }),
  setFloodLight: (floodLight) => set({ floodLight }),
  setEmergencyRed: (emergencyRed) => set({ emergencyRed }),
  setHudEnabled: (hudEnabled) => set({ hudEnabled }),
  setNdRangeNm: (ndRangeNm) => set({ ndRangeNm }),
  setWxRadarOn: (wxRadarOn) => set({ wxRadarOn }),
  patchOverhead: (p) =>
    set((s) => ({ overhead: { ...s.overhead, ...p } })),
  setThrottleSetpoint: (throttleSetpoint) => set({ throttleSetpoint }),
  setSpeedBrake: (speedBrake) => set({ speedBrake }),
  setParkingBrake: (parkingBrake) => set({ parkingBrake }),
  setTrimElevator: (trimElevator) => set({ trimElevator }),
  setChecklistPhase: (checklistPhase) =>
    set({
      checklistPhase,
      checklist: CHECKLISTS[checklistPhase].map((c) => ({ ...c })),
    }),
  toggleChecklistItem: (id) =>
    set((s) => ({
      checklist: s.checklist.map((c) =>
        c.id === id ? { ...c, done: !c.done } : c,
      ),
    })),
  setWarnings: (warnings) => set({ warnings }),
  setRadioCom1: (radioCom1Mhz) => set({ radioCom1Mhz }),
  setTransponder: (transponderCode) => set({ transponderCode }),
  setShowChecklist: (showChecklist) => set({ showChecklist }),
  setShowOverhead: (showOverhead) => set({ showOverhead }),
  requestGearToggle: () => set({ gearToggleRequest: true }),
  consumeGearToggle: () => {
    if (!get().gearToggleRequest) return false;
    set({ gearToggleRequest: false });
    return true;
  },
  resetForFlight: () =>
    set({
      deckOpen: false,
      seat: "captain",
      throttleSetpoint: null,
      speedBrake: 0,
      parkingBrake: false,
      warnings: [],
      gearToggleRequest: false,
      checklist: CHECKLISTS.before_takeoff.map((c) => ({ ...c })),
      checklistPhase: "before_takeoff",
      overhead: { ...DEFAULT_OVERHEAD },
    }),
}));

export function getChecklistTemplate(phase: ChecklistPhase) {
  return CHECKLISTS[phase];
}
