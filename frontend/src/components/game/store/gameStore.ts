"use client";

import { create } from "zustand";
import { getAircraftSpec } from "../Aircraft/fleet";
import { createSpawnState } from "../Physics/FlightDynamics";
import {
  beginSystemsSession,
  endSystemsSession,
  getFlightSessionMeta,
} from "../Systems/session";
import type { AircraftSystemsState } from "../Systems/types";
import {
  appendLogbookEntry,
  createLogbookId,
} from "../Logbook/LogbookService";
import { haversineNm } from "../Navigation/greatCircle";
import {
  evaluateProgressAchievements,
  unlockAchievement,
} from "../Achievements/achievements";
import { saveProgress } from "../Save/SaveService";
import type {
  CameraMode,
  FlightState,
  GameMode,
  InputBindings,
  MissionId,
  NavRoute,
  PlayerProgress,
} from "../Types";

export const DEFAULT_BINDINGS: InputBindings = {
  pitchUp: "KeyW",
  pitchDown: "KeyS",
  rollLeft: "KeyA",
  rollRight: "KeyD",
  yawLeft: "KeyQ",
  yawRight: "KeyE",
  throttleUp: "ShiftLeft",
  throttleDown: "ControlLeft",
  flaps: "KeyF",
  gear: "KeyG",
  brakes: "KeyB",
  camera: "KeyC",
  pause: "Escape",
};

const emptyRoute = (): NavRoute => ({
  destIcao: null,
  waypoints: [],
  distanceNm: 0,
  etaSec: null,
  bearingDeg: 0,
});

interface GameStore {
  mode: GameMode;
  hangarOpen: boolean;
  paused: boolean;
  selectedAircraftId: string;
  spawnAirportIcao: string;
  flightState: FlightState | null;
  systemsState: AircraftSystemsState | null;
  cameraMode: CameraMode;
  route: NavRoute;
  missionId: MissionId;
  progress: PlayerProgress;
  bindings: InputBindings;
  muteAudio: boolean;
  showTouchControls: boolean;
  logbookOpen: boolean;

  setMode: (mode: GameMode) => void;
  setHangerOpen: (open: boolean) => void;
  setPaused: (paused: boolean) => void;
  setAircraft: (id: string) => void;
  setSpawnAirport: (icao: string) => void;
  setFlightState: (s: FlightState | null) => void;
  setSystemsState: (s: AircraftSystemsState | null) => void;
  patchFlightState: (partial: Partial<FlightState>) => void;
  setCameraMode: (mode: CameraMode) => void;
  cycleCamera: () => void;
  setRoute: (route: NavRoute) => void;
  setMission: (id: MissionId) => void;
  setProgress: (p: Partial<PlayerProgress>) => void;
  setBindings: (b: Partial<InputBindings>) => void;
  setMuteAudio: (m: boolean) => void;
  setLogbookOpen: (open: boolean) => void;
  beginFlight: (opts: {
    lat: number;
    lng: number;
    elevM: number;
    headingDeg: number;
  }) => void;
  endFlight: () => void;
}

const CAMERAS: CameraMode[] = [
  "chase",
  "cockpit",
  "cockpit_fo",
  "wing",
  "tower",
  "drone",
  "cinematic",
  "free",
];

export const useGameStore = create<GameStore>((set, get) => ({
  mode: "explore",
  hangarOpen: false,
  paused: false,
  selectedAircraftId: "cirrus_sr22",
  spawnAirportIcao: "VNKT",
  flightState: null,
  systemsState: null,
  cameraMode: "chase",
  route: emptyRoute(),
  missionId: "free_flight",
  progress: {
    flightHours: 0,
    unlocks: ["cirrus_sr22", "baron_b58", "citation_cj"],
    achievements: [],
    airportsVisited: [],
    bindings: {},
  },
  bindings: { ...DEFAULT_BINDINGS },
  muteAudio: false,
  showTouchControls: false,
  logbookOpen: false,

  setMode: (mode) => set({ mode }),
  setHangerOpen: (hangarOpen) => set({ hangarOpen }),
  setPaused: (paused) => set({ paused }),
  setAircraft: (selectedAircraftId) => set({ selectedAircraftId }),
  setSpawnAirport: (spawnAirportIcao) => set({ spawnAirportIcao }),
  setFlightState: (flightState) => set({ flightState }),
  setSystemsState: (systemsState) => set({ systemsState }),
  patchFlightState: (partial) => {
    const cur = get().flightState;
    if (!cur) return;
    set({ flightState: { ...cur, ...partial } });
  },
  setCameraMode: (cameraMode) => set({ cameraMode }),
  cycleCamera: () => {
    const i = CAMERAS.indexOf(get().cameraMode);
    const next = CAMERAS[((i < 0 ? 0 : i) + 1) % CAMERAS.length];
    set({ cameraMode: next });
  },
  setRoute: (route) => set({ route }),
  setMission: (missionId) => set({ missionId }),
  setProgress: (partial) =>
    set((s) => ({ progress: { ...s.progress, ...partial } })),
  setBindings: (partial) =>
    set((s) => ({ bindings: { ...s.bindings, ...partial } })),
  setMuteAudio: (muteAudio) => set({ muteAudio }),
  setLogbookOpen: (logbookOpen) => set({ logbookOpen }),

  beginFlight: ({ lat, lng, elevM, headingDeg }) => {
    const spec = getAircraftSpec(get().selectedAircraftId);
    const systemsState = beginSystemsSession(spec, {
      departureIcao: get().spawnAirportIcao,
      aircraftId: spec.id,
      lat,
      lng,
    });
    const flightState = createSpawnState(lat, lng, elevM, headingDeg, spec);
    flightState.fuelKg = systemsState.fuel.totalKg;
    set({
      mode: "flight",
      hangarOpen: false,
      paused: false,
      flightState,
      systemsState,
      // Chase until cockpit GLBs ship — empty cabin + missing windshield was blank sky
      cameraMode: "chase",
    });
  },

  endFlight: () => {
    const st = get().flightState;
    const sys = get().systemsState;
    const route = get().route;
    const session = endSystemsSession() ?? getFlightSessionMeta();
    let progress = get().progress;

    if (st && session) {
      const durationSec = (Date.now() - session.startMs) / 1000;
      const distanceNm =
        session.distanceM / 1852 ||
        haversineNm(session.startLat, session.startLng, st.lat, st.lng);
      const fuelUsed = Math.max(
        0,
        session.startFuelKg - (sys?.fuel.totalKg ?? st.fuelKg),
      );
      const avgMs =
        durationSec > 1 ? (session.distanceM || distanceNm * 1852) / durationSec : 0;

      appendLogbookEntry({
        id: createLogbookId(),
        dateIso: new Date().toISOString(),
        departureIcao: session.departureIcao,
        arrivalIcao: route.destIcao,
        aircraftId: session.aircraftId,
        durationSec,
        distanceNm,
        fuelUsedKg: fuelUsed,
        avgSpeedKt: avgMs * 1.94384,
        maxAltM: Math.max(session.maxAltM, st.altM),
        landingFpm: session.landingFpm,
        night: new Date().getHours() < 6 || new Date().getHours() >= 20,
      });

      const hrs = durationSec / 3600;
      progress = {
        ...progress,
        flightHours: progress.flightHours + hrs,
      };
      if (session.wasAirborne) {
        progress = unlockAchievement(progress, "first_takeoff");
      }
      if (session.landingFpm != null) {
        progress = unlockAchievement(progress, "first_landing");
        if (Math.abs(session.landingFpm) < 200) {
          progress = unlockAchievement(progress, "smooth_landing");
        }
      }
      if (distanceNm >= 500) {
        progress = unlockAchievement(progress, "long_haul");
      }
      progress = evaluateProgressAchievements(progress);
      saveProgress(progress);
    }

    set({
      mode: "explore",
      paused: false,
      flightState: null,
      systemsState: null,
      hangarOpen: false,
      route: emptyRoute(),
      progress,
    });
  },
}));
