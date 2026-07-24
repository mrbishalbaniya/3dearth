/**
 * Named-node contract for imported cockpit GLBs.
 * Artists must name empties / meshes exactly as below (case-sensitive).
 *
 * Units: meters, Y-up, nose toward −Z (Three.js / glTF common after convert).
 */

export const COCKPIT_NODES = {
  /** Display sockets (empties / bones — instruments parent here) */
  socketPfd: "socket_pfd",
  socketNd: "socket_nd",
  socketEicas: "socket_eicas",
  socketStandby: "socket_standby",
  socketFmc: "socket_fmc",

  /** Camera / seat reference empties */
  seatCaptain: "seat_captain",
  seatFirstOfficer: "seat_fo",
  seatJump: "seat_jump",
  cameraCaptain: "camera_captain",
  cameraFo: "camera_fo",
  cameraPedestal: "camera_pedestal",
  cameraOverhead: "camera_overhead",
  cameraInstrument: "camera_instrument",

  /** Interactive controls (meshes preferred for raycast) */
  ctrlThrottleL: "ctrl_throttle_l",
  ctrlThrottleR: "ctrl_throttle_r",
  ctrlFlaps: "ctrl_flaps",
  ctrlGear: "ctrl_gear",
  ctrlParkBrake: "ctrl_park_brake",
  ctrlYokeCapt: "ctrl_yoke_capt",

  /** Switches */
  swBattery: "sw_battery",
  swAvionics: "sw_avionics",
  swAp: "sw_ap",
  swLandingLight: "sw_landing_light",

  /** Lighting helpers */
  lightCabin: "light_cabin",
} as const;

export type CockpitNodeId = (typeof COCKPIT_NODES)[keyof typeof COCKPIT_NODES];

export type CockpitControlAction =
  | "throttle_up"
  | "throttle_down"
  | "flaps"
  | "gear"
  | "park_brake"
  | "battery"
  | "avionics"
  | "ap"
  | "landing_light";

/** Map GLB node name → simulation action */
export const CONTROL_NODE_ACTIONS: Partial<
  Record<CockpitNodeId, CockpitControlAction>
> = {
  [COCKPIT_NODES.ctrlThrottleL]: "throttle_up",
  [COCKPIT_NODES.ctrlThrottleR]: "throttle_up",
  [COCKPIT_NODES.ctrlFlaps]: "flaps",
  [COCKPIT_NODES.ctrlGear]: "gear",
  [COCKPIT_NODES.ctrlParkBrake]: "park_brake",
  [COCKPIT_NODES.swBattery]: "battery",
  [COCKPIT_NODES.swAvionics]: "avionics",
  [COCKPIT_NODES.swAp]: "ap",
  [COCKPIT_NODES.swLandingLight]: "landing_light",
};

/**
 * Default local transforms for placeholder sockets (meters).
 * Used only when a GLB is missing or a named node is absent.
 * These are Object3D empties — never meshes.
 */
export const PLACEHOLDER_SOCKET_TRANSFORMS: Record<
  string,
  { position: [number, number, number]; rotation: [number, number, number] }
> = {
  [COCKPIT_NODES.socketPfd]: {
    position: [-0.42, 1.02, -0.78],
    rotation: [-0.35, 0, 0],
  },
  [COCKPIT_NODES.socketNd]: {
    position: [0, 1.02, -0.78],
    rotation: [-0.35, 0, 0],
  },
  [COCKPIT_NODES.socketEicas]: {
    position: [0.42, 1.02, -0.78],
    rotation: [-0.35, 0, 0],
  },
  [COCKPIT_NODES.socketStandby]: {
    position: [-0.15, 1.15, -0.72],
    rotation: [-0.35, 0, 0],
  },
  [COCKPIT_NODES.socketFmc]: {
    position: [0, 0.72, -0.35],
    rotation: [-1.1, 0, 0],
  },
  [COCKPIT_NODES.seatCaptain]: {
    position: [-0.4, 1.18, 0.15],
    rotation: [0, 0, 0],
  },
  [COCKPIT_NODES.seatFirstOfficer]: {
    position: [0.4, 1.18, 0.15],
    rotation: [0, 0, 0],
  },
  [COCKPIT_NODES.cameraCaptain]: {
    position: [-0.4, 1.18, 0.15],
    rotation: [0, 0, 0],
  },
  [COCKPIT_NODES.cameraFo]: {
    position: [0.4, 1.18, 0.15],
    rotation: [0, 0, 0],
  },
  [COCKPIT_NODES.lightCabin]: {
    position: [0, 1.45, 0.1],
    rotation: [0, 0, 0],
  },
};
