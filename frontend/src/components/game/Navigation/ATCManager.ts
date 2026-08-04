/**
 * ATCManager — Nepal Air Traffic Control simulation.
 * Manages ATC facilities, clearances, frequency handoffs,
 * separation monitoring, and AI traffic instructions.
 */

import type { ATCFacility, ATCFacilityType } from "./NavigationTypes";
import { airspaceManager } from "./AirspaceManager";
import { haversineNm } from "./greatCircle";

// ─── Nepal ATC Facilities ─────────────────────────────────────────────────────

const NEPAL_ATC_FACILITIES: ATCFacility[] = [
  // Kathmandu
  { id: "VNKT_TWR",  name: "Kathmandu Tower",         type: "TOWER",    icaoRegion: "VN", lat: 27.6966, lng: 85.3591, serviceRadiusNm: 15,  lowerLimitM: 0,    upperLimitM: 3050,  primaryFreqMhz: 118.10, secondaryFreqMhz: 121.90, active: true },
  { id: "VNKT_GND",  name: "Kathmandu Ground",         type: "GROUND",   icaoRegion: "VN", lat: 27.6966, lng: 85.3591, serviceRadiusNm: 2,   lowerLimitM: 0,    upperLimitM: 30,    primaryFreqMhz: 121.90, active: true },
  { id: "VNKT_DEL",  name: "Kathmandu Delivery",       type: "DELIVERY", icaoRegion: "VN", lat: 27.6966, lng: 85.3591, serviceRadiusNm: 2,   lowerLimitM: 0,    upperLimitM: 30,    primaryFreqMhz: 128.10, active: true },
  { id: "VNKT_APP",  name: "Kathmandu Approach",       type: "APPROACH", icaoRegion: "VN", lat: 27.6966, lng: 85.3591, serviceRadiusNm: 50,  lowerLimitM: 0,    upperLimitM: 7400,  primaryFreqMhz: 119.10, secondaryFreqMhz: 124.30, active: true },
  { id: "VNKT_CTR",  name: "Kathmandu Control",        type: "CENTER",   icaoRegion: "VN", lat: 27.6966, lng: 85.3591, serviceRadiusNm: 400, lowerLimitM: 0,    upperLimitM: 24400, primaryFreqMhz: 125.10, secondaryFreqMhz: 126.50, active: true },
  // Pokhara
  { id: "VNPK_TWR",  name: "Pokhara Tower",            type: "TOWER",    icaoRegion: "VN", lat: 28.1865, lng: 83.9820, serviceRadiusNm: 10,  lowerLimitM: 0,    upperLimitM: 2450,  primaryFreqMhz: 118.30, active: true },
  { id: "VNPK_APP",  name: "Pokhara Approach",         type: "APPROACH", icaoRegion: "VN", lat: 28.1865, lng: 83.9820, serviceRadiusNm: 40,  lowerLimitM: 0,    upperLimitM: 6100,  primaryFreqMhz: 119.90, active: true },
  // Bhairahawa
  { id: "VNBW_TWR",  name: "Bhairahawa Tower",         type: "TOWER",    icaoRegion: "VN", lat: 27.5057, lng: 83.4163, serviceRadiusNm: 10,  lowerLimitM: 0,    upperLimitM: 900,   primaryFreqMhz: 118.10, active: true },
  { id: "VNBW_APP",  name: "Bhairahawa Approach",      type: "APPROACH", icaoRegion: "VN", lat: 27.5057, lng: 83.4163, serviceRadiusNm: 30,  lowerLimitM: 0,    upperLimitM: 4600,  primaryFreqMhz: 120.50, active: true },
  // Biratnagar
  { id: "VNVT_TWR",  name: "Biratnagar Tower",         type: "TOWER",    icaoRegion: "VN", lat: 26.4814, lng: 87.2640, serviceRadiusNm: 10,  lowerLimitM: 0,    upperLimitM: 600,   primaryFreqMhz: 118.50, active: true },
  // Nepalgunj
  { id: "VNKL_TWR",  name: "Nepalgunj Tower",          type: "TOWER",    icaoRegion: "VN", lat: 28.1035, lng: 81.6672, serviceRadiusNm: 10,  lowerLimitM: 0,    upperLimitM: 700,   primaryFreqMhz: 118.10, active: true },
  // Dhangarhi
  { id: "VNDH_TWR",  name: "Dhangarhi Tower",          type: "TOWER",    icaoRegion: "VN", lat: 28.7533, lng: 80.5819, serviceRadiusNm: 8,   lowerLimitM: 0,    upperLimitM: 700,   primaryFreqMhz: 118.90, active: true },
];

// ─── ATC clearance types ──────────────────────────────────────────────────────

export type ClearanceType =
  | "startup"
  | "pushback"
  | "taxi"
  | "takeoff"
  | "departure"
  | "climb"
  | "cruise"
  | "descent"
  | "approach"
  | "land"
  | "go_around"
  | "hold"
  | "frequency_change";

export interface ATCClearance {
  id: string;
  callsign: string;
  type: ClearanceType;
  instruction: string;
  assignedAltM?: number;
  assignedHdgDeg?: number;
  assignedSpeedKt?: number;
  assignedFreqMhz?: number;
  holdFix?: string;
  runway?: string;
  squawk?: string;
  timestamp: number;
}

// ─── Traffic contact ──────────────────────────────────────────────────────────

export interface TrafficContact {
  callsign: string;
  lat: number;
  lng: number;
  altM: number;
  hdgDeg: number;
  speedKt: number;
  squawk: string;
  flightPhase: "ground" | "departure" | "enroute" | "approach" | "landed";
  controllingFacility: string | null;
}

// ─── ATCManager class ─────────────────────────────────────────────────────────

export class ATCManager {
  private static instance: ATCManager | null = null;

  private facilities: ATCFacility[] = [...NEPAL_ATC_FACILITIES];
  private byId = new Map<string, ATCFacility>();
  private clearanceQueue: ATCClearance[] = [];
  private clearanceCounter = 0;
  private traffic = new Map<string, TrafficContact>();
  private playerCallsign = "9N-ABC";
  private currentFacilityId: string | null = null;

  private constructor() {
    for (const f of this.facilities) this.byId.set(f.id, f);
  }

  public static getInstance(): ATCManager {
    if (!ATCManager.instance) ATCManager.instance = new ATCManager();
    return ATCManager.instance;
  }

  // ── Facility queries ──────────────────────────────────────────────────────────

  public getAllFacilities(): ATCFacility[] { return [...this.facilities]; }
  public getFacilityById(id: string): ATCFacility | undefined { return this.byId.get(id); }
  public getByType(type: ATCFacilityType): ATCFacility[] {
    return this.facilities.filter((f) => f.type === type && f.active);
  }

  /**
   * Returns the most appropriate controlling facility for a given position/altitude.
   * Priority: TOWER > APPROACH > CENTER
   */
  public getControllingFacility(lat: number, lng: number, altM: number): ATCFacility | null {
    const priority: ATCFacilityType[] = ["TOWER", "APPROACH", "CENTER"];
    for (const type of priority) {
      const facilities = this.facilities.filter((f) =>
        f.active && f.type === type &&
        altM >= f.lowerLimitM && altM <= f.upperLimitM,
      );
      const inRange = facilities.filter((f) => haversineNm(lat, lng, f.lat, f.lng) <= f.serviceRadiusNm);
      if (inRange.length > 0) {
        return inRange.sort((a, b) => haversineNm(lat, lng, a.lat, a.lng) - haversineNm(lat, lng, b.lat, b.lng))[0];
      }
    }
    return null;
  }

  /** Get the active frequency for a given position/altitude. */
  public getActiveFrequency(lat: number, lng: number, altM: number): number | null {
    const facility = this.getControllingFacility(lat, lng, altM);
    return facility?.primaryFreqMhz ?? null;
  }

  /** Detect frequency handoff required (new facility vs current). */
  public checkHandoff(lat: number, lng: number, altM: number): ATCFacility | null {
    const newFac = this.getControllingFacility(lat, lng, altM);
    if (newFac && newFac.id !== this.currentFacilityId) {
      this.currentFacilityId = newFac.id;
      return newFac;
    }
    return null;
  }

  // ── Clearance generation ──────────────────────────────────────────────────────

  public issueClearance(opts: {
    callsign?: string;
    type: ClearanceType;
    departureIcao?: string;
    destinationIcao?: string;
    cruiseAltM?: number;
    squawk?: string;
    runway?: string;
  }): ATCClearance {
    const callsign = opts.callsign ?? this.playerCallsign;
    const squawk = opts.squawk ?? this.generateSquawk();
    let instruction = "";

    switch (opts.type) {
      case "startup":
        instruction = `${callsign}, startup approved, information current, QNH ${this.qnh()}.`;
        break;
      case "pushback":
        instruction = `${callsign}, push and start approved, face ${opts.runway ?? "north"}.`;
        break;
      case "taxi":
        instruction = `${callsign}, taxi to holding point runway ${opts.runway ?? "02"}, via taxiway Alpha.`;
        break;
      case "takeoff":
        instruction = `${callsign}, runway ${opts.runway ?? "02"}, wind calm, cleared for takeoff.`;
        break;
      case "departure":
        instruction = `${callsign}, cleared to ${opts.destinationIcao ?? "destination"} via flight planned route, climb FL${this.mToFL(opts.cruiseAltM ?? 5500)}, squawk ${squawk}.`;
        break;
      case "climb":
        instruction = `${callsign}, climb and maintain FL${this.mToFL(opts.cruiseAltM ?? 5500)}.`;
        break;
      case "cruise":
        instruction = `${callsign}, cruise FL${this.mToFL(opts.cruiseAltM ?? 5500)}, report reaching.`;
        break;
      case "descent":
        instruction = `${callsign}, descend to FL${this.mToFL(opts.cruiseAltM ?? 1500)}, expect ILS approach.`;
        break;
      case "approach":
        instruction = `${callsign}, cleared ILS approach runway ${opts.runway ?? "02"}, contact tower ${this.towerFreq(opts.destinationIcao)} passing outer marker.`;
        break;
      case "land":
        instruction = `${callsign}, runway ${opts.runway ?? "02"}, wind 020/08, cleared to land.`;
        break;
      case "go_around":
        instruction = `${callsign}, go around, climb straight ahead to 3000m, contact approach on ${this.approachFreq(opts.destinationIcao)}.`;
        break;
      case "hold":
        instruction = `${callsign}, hold at KINDA, inbound course 225, right turns, expect further clearance in 10 minutes.`;
        break;
      case "frequency_change":
        instruction = `${callsign}, contact ${this.facilityName(opts.destinationIcao)} on ${opts.cruiseAltM ?? 119.10}.`;
        break;
    }

    const clearance: ATCClearance = {
      id: `CLR${++this.clearanceCounter}`,
      callsign,
      type: opts.type,
      instruction,
      assignedAltM: opts.cruiseAltM,
      squawk,
      runway: opts.runway,
      timestamp: Date.now(),
    };

    this.clearanceQueue.push(clearance);
    if (this.clearanceQueue.length > 50) this.clearanceQueue.shift();
    return clearance;
  }

  // ── Traffic management ────────────────────────────────────────────────────────

  public updateTraffic(contact: TrafficContact): void {
    this.traffic.set(contact.callsign, { ...contact });
    // Auto-assign facility
    const fac = this.getControllingFacility(contact.lat, contact.lng, contact.altM);
    if (fac) this.traffic.get(contact.callsign)!.controllingFacility = fac.id;
  }

  public removeTraffic(callsign: string): void {
    this.traffic.delete(callsign);
  }

  public getAllTraffic(): TrafficContact[] {
    return [...this.traffic.values()];
  }

  public getTrafficNear(lat: number, lng: number, radiusNm: number): TrafficContact[] {
    return [...this.traffic.values()].filter(
      (c) => haversineNm(lat, lng, c.lat, c.lng) <= radiusNm,
    );
  }

  /** TCAS-style: returns traffic contacts that are potential conflicts (within 5nm and 300m). */
  public getTCASContacts(
    lat: number, lng: number, altM: number,
    radiusNm = 5, altBandM = 300,
  ): TrafficContact[] {
    return this.getTrafficNear(lat, lng, radiusNm).filter(
      (c) => Math.abs(c.altM - altM) <= altBandM,
    );
  }

  // ── Clearance history ─────────────────────────────────────────────────────────

  public getClearanceHistory(limit = 20): ATCClearance[] {
    return this.clearanceQueue.slice(-limit);
  }

  public getLastClearance(): ATCClearance | null {
    return this.clearanceQueue[this.clearanceQueue.length - 1] ?? null;
  }

  // ── Player callsign ───────────────────────────────────────────────────────────

  public setPlayerCallsign(cs: string): void { this.playerCallsign = cs; }
  public getPlayerCallsign(): string { return this.playerCallsign; }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private generateSquawk(): string {
    // Nepal domestic transponder codes 0100–0177
    const code = 0o100 + Math.floor(Math.random() * 0o77);
    return code.toString(8).padStart(4, "0");
  }

  private qnh(): string {
    return `${(1013 + Math.round((Math.random() - 0.5) * 10))} hPa`;
  }

  private mToFL(altM: number): number {
    return Math.round(altM / 30.48 / 10) * 10;
  }

  private towerFreq(icao?: string): string {
    const map: Record<string, string> = {
      VNKT: "118.1", VNPK: "118.3", VNBW: "118.1", VNVT: "118.5",
    };
    return map[icao ?? ""] ?? "118.1";
  }

  private approachFreq(icao?: string): string {
    const map: Record<string, string> = {
      VNKT: "119.1", VNPK: "119.9", VNBW: "120.5",
    };
    return map[icao ?? ""] ?? "119.1";
  }

  private facilityName(icao?: string): string {
    const map: Record<string, string> = {
      VNKT: "Kathmandu Approach", VNPK: "Pokhara Approach",
    };
    return map[icao ?? ""] ?? "Kathmandu Control";
  }
}

export const atcManager = ATCManager.getInstance();
