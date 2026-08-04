/**
 * AutopilotManager — Full autopilot with HDG / ALT / VS / FLC / LNAV / VNAV /
 * GS capture / localizer capture, autothrottle, and approach mode.
 * Wraps and extends the existing AutopilotController.
 */

import {
  type AutopilotState as LegacyApState,
  createAutopilot,
  stepAutopilot,
} from "./AutopilotController";
import type { AutopilotFullState, AutopilotLateralMode, AutopilotVerticalMode } from "./NavigationTypes";
import { navigationComputer } from "./NavigationComputer";
import { radioNav } from "./RadioNavigation";
import { haversineNm, initialBearingDeg } from "./greatCircle";

// ─── AutopilotManager ─────────────────────────────────────────────────────────

export class AutopilotManager {
  private static instance: AutopilotManager | null = null;

  private legacy: LegacyApState = createAutopilot(0, 1400);
  private full: AutopilotFullState = this.defaultFullState();

  // Capture arms
  private altCapturePending = false;
  private gsCapturePending = false;
  private locCapturePending = false;
  private altCaptureBandM = 120; // metres within which ALT capture triggers

  private constructor() {}

  public static getInstance(): AutopilotManager {
    if (!AutopilotManager.instance) AutopilotManager.instance = new AutopilotManager();
    return AutopilotManager.instance;
  }

  // ── Engage / disengage ────────────────────────────────────────────────────────

  public engageMaster(): void { this.full.masterEngage = true; this.legacy.master = true; }
  public disengageMaster(): void { this.full.masterEngage = false; this.legacy.master = false; }
  public toggleMaster(): void {
    if (this.full.masterEngage) this.disengageMaster(); else this.engageMaster();
  }

  public engageFlightDirector(): void { this.full.fdActive = true; }
  public disengageFlightDirector(): void { this.full.fdActive = false; }
  public toggleFlightDirector(): void { this.full.fdActive = !this.full.fdActive; }

  public engageAutothrottle(): void { this.full.atActive = true; }
  public disengageAutothrottle(): void { this.full.atActive = false; }

  // ── Mode selection ────────────────────────────────────────────────────────────

  public setLateralMode(mode: AutopilotLateralMode): void {
    this.full.lateral = mode;
    switch (mode) {
      case "HDG":  this.legacy.lateral = "hdg"; break;
      case "LNAV": this.legacy.lateral = "lnav"; break;
      case "LOC":  this.legacy.lateral = "loc"; break;
      default:     this.legacy.lateral = "off";
    }
  }

  public setVerticalMode(mode: AutopilotVerticalMode): void {
    this.full.vertical = mode;
    switch (mode) {
      case "ALT":  this.legacy.vertical = "alt"; break;
      case "VS":   this.legacy.vertical = "vs"; break;
      case "FLC":  this.legacy.vertical = "flc"; break;
      case "VNAV": this.legacy.vertical = "vnav"; break;
      case "GS":   this.legacy.vertical = "gs"; break;
      default:     this.legacy.vertical = "off";
    }
  }

  // ── Target setters ────────────────────────────────────────────────────────────

  public setTargetHeading(deg: number): void {
    const h = ((deg % 360) + 360) % 360;
    this.full.targetHdgDeg = h;
    this.legacy.targetHdgDeg = h;
  }

  public setTargetAltitude(altM: number): void {
    this.full.targetAltM = altM;
    this.legacy.targetAltM = altM;
    this.altCapturePending = true;
  }

  public setTargetVS(vsMs: number): void {
    this.full.targetVsMs = vsMs;
    this.legacy.targetVsMs = vsMs;
  }

  public setTargetSpeed(speedKt: number): void {
    this.full.targetSpeedKt = speedKt;
    this.legacy.targetSpeedMs = speedKt / 1.94384;
  }

  public setBankLimit(deg: number): void {
    this.full.bankLimitDeg = Math.max(5, Math.min(30, deg));
  }

  public armApproach(): void {
    this.full.approachMode = true;
    this.locCapturePending = true;
    this.gsCapturePending = true;
  }

  public disarmApproach(): void {
    this.full.approachMode = false;
    this.locCapturePending = false;
    this.gsCapturePending = false;
  }

  public activateTO(): void {
    this.full.togaEngaged = true;
    this.setVerticalMode("TO");
    this.setLateralMode("TRK");
    this.engageMaster();
  }

  public activateGA(): void {
    this.full.togaEngaged = true;
    this.setVerticalMode("GA");
    this.setLateralMode("TRK");
    this.setTargetVS(5.08); // ~1000 fpm
  }

  // ── Per-frame update ──────────────────────────────────────────────────────────

  public update(
    sensors: {
      lat: number; lng: number; altM: number;
      hdgDeg: number; vsMs: number; tasMs: number;
      pitchDeg: number; rollDeg: number;
    },
    dt: number,
  ): { pitch: number; roll: number; yaw: number; throttle: number } {
    if (!this.full.masterEngage) {
      return { pitch: 0, roll: 0, yaw: 0, throttle: 0 };
    }

    // ── LNAV: steer toward active navigation waypoint ───────────────────────
    if (this.full.lateral === "LNAV") {
      const navState = navigationComputer.getState();
      if (navState.activeWaypoint) {
        const bearingToWpt = initialBearingDeg(
          sensors.lat, sensors.lng,
          navState.activeWaypoint.lat, navState.activeWaypoint.lng,
        );
        this.legacy.targetHdgDeg = bearingToWpt;
        this.full.targetHdgDeg = bearingToWpt;
      }
    }

    // ── LOC capture ─────────────────────────────────────────────────────────
    if (this.locCapturePending && radioNav.ils.tuned) {
      if (Math.abs(radioNav.ils.locDeflection) < 0.5) {
        this.setLateralMode("LOC");
        this.locCapturePending = false;
        this.full.hdgCapture = true;
      }
    }
    if (this.full.lateral === "LOC" && radioNav.ils.tuned) {
      // Steer to null localizer
      const locErrDeg = radioNav.ils.locDeflection * 2.5;
      const courseCmd = radioNav.ils.ils ? radioNav.ils.ils.locCourseDeg + 180 : sensors.hdgDeg;
      this.legacy.targetHdgDeg = courseCmd - locErrDeg * 3;
      this.full.targetHdgDeg = this.legacy.targetHdgDeg;
    }

    // ── GS capture ──────────────────────────────────────────────────────────
    if (this.gsCapturePending && radioNav.ils.tuned) {
      if (Math.abs(radioNav.ils.gsDeflection) < 0.15 && sensors.altM < this.full.targetAltM) {
        this.setVerticalMode("GS");
        this.gsCapturePending = false;
        this.full.gsCapture = true;
      }
    }
    if (this.full.vertical === "GS" && radioNav.ils.tuned) {
      const gsErrDot = radioNav.ils.gsDeflection;
      const vsCmd = -gsErrDot * 3; // m/s target VS
      this.full.targetVsMs = vsCmd;
      this.legacy.targetVsMs = vsCmd;
      this.legacy.vertical = "vs";
    }

    // ── ALT capture ─────────────────────────────────────────────────────────
    if (this.full.vertical === "VS" || this.full.vertical === "FLC") {
      const altErr = this.full.targetAltM - sensors.altM;
      if (Math.abs(altErr) < this.altCaptureBandM) {
        this.setVerticalMode("ALT");
        this.altCapturePending = false;
        this.full.altCapture = true;
      }
    }

    // ── VNAV altitude targeting ──────────────────────────────────────────────
    if (this.full.vertical === "VNAV") {
      const navState = navigationComputer.getState();
      if (navState.activeWaypoint?.altitudeRestriction) {
        const ar = navState.activeWaypoint.altitudeRestriction;
        const target = ar.altM ?? ar.minAltM ?? ar.maxAltM;
        if (target != null) {
          this.legacy.targetAltM = target;
          this.full.targetAltM = target;
        }
      }
    }

    // ── Run legacy step ──────────────────────────────────────────────────────
    const { ap, cmd } = stepAutopilot(
      this.legacy,
      { hdgDeg: sensors.hdgDeg, altM: sensors.altM, vsMs: sensors.vsMs, tasMs: sensors.tasMs },
      dt,
    );
    this.legacy = ap;

    // Apply bank limit
    const rollLimit = Math.sin((this.full.bankLimitDeg * Math.PI) / 180);
    const roll = Math.max(-rollLimit, Math.min(rollLimit, cmd.roll));

    // Store final commands in full state
    this.full.rollCmd = roll;
    this.full.pitchCmd = cmd.pitch;
    this.full.throttleCmd = this.full.atActive ? cmd.throttle : 0;

    return {
      pitch: cmd.pitch,
      roll,
      yaw: cmd.yaw,
      throttle: this.full.atActive ? cmd.throttle : 0,
    };
  }

  // ── State ─────────────────────────────────────────────────────────────────────

  public getState(): AutopilotFullState { return { ...this.full }; }
  public isEngaged(): boolean { return this.full.masterEngage; }
  public getLateralMode(): AutopilotLateralMode { return this.full.lateral; }
  public getVerticalMode(): AutopilotVerticalMode { return this.full.vertical; }

  // ── Preset helpers ────────────────────────────────────────────────────────────

  /** Arm a standard ILS approach: LOC + GS capture, approach mode on. */
  public armILSApproach(locFreqMhz: number): void {
    radioNav.tuneNav1(locFreqMhz);
    this.armApproach();
    this.setLateralMode("HDG");   // HDG until LOC capture
    this.setVerticalMode("ALT");  // ALT until GS capture
    this.engageMaster();
  }

  /** Set up for initial climb after takeoff. */
  public setClimbMode(targetAltM: number, headingDeg: number): void {
    this.setTargetAltitude(targetAltM);
    this.setTargetHeading(headingDeg);
    this.setTargetVS(7.62); // ~1500 fpm initial
    this.setVerticalMode("VS");
    this.setLateralMode("HDG");
    this.engageMaster();
  }

  /** Set up for cruise flight on a heading/altitude. */
  public setCruiseMode(altM: number, headingDeg: number, speedKt: number): void {
    this.setTargetAltitude(altM);
    this.setTargetHeading(headingDeg);
    this.setTargetSpeed(speedKt);
    this.setVerticalMode("ALT");
    this.setLateralMode("HDG");
    this.engageAutothrottle();
    this.engageMaster();
  }

  /** Engage LNAV/VNAV for FMS route tracking. */
  public setLNAV_VNAV(): void {
    this.setLateralMode("LNAV");
    this.setVerticalMode("VNAV");
    this.engageMaster();
  }

  private defaultFullState(): AutopilotFullState {
    return {
      masterEngage: false, fdActive: false, atActive: false,
      lateral: "OFF", vertical: "OFF", speed: "OFF",
      targetHdgDeg: 0, targetTrkDeg: 0,
      targetAltM: 1400, targetVsMs: 0,
      targetSpeedKt: 120, targetMach: 0.4,
      bankLimitDeg: 25,
      approachMode: false, togaEngaged: false,
      rollCmd: 0, pitchCmd: 0, throttleCmd: 0,
      hdgCapture: false, altCapture: false, gsCapture: false,
    };
  }
}

export const autopilotManager = AutopilotManager.getInstance();
