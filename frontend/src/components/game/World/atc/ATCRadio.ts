import type { AtcClearance, AtcFacility, ClearanceType, PlayerAtcState } from "../types";
import { frequencyForFacility } from "./airspace/AirspaceService";

export class ATCRadio {
  private readonly messages: AtcClearance[] = [];

  constructor(private readonly state: PlayerAtcState) {}

  getState(): PlayerAtcState {
    return this.state;
  }

  setFacility(facility: AtcFacility): void {
    this.state.facility = facility;
    this.state.frequencyMhz = frequencyForFacility(facility);
  }

  setCallsign(callsign: string): void {
    this.state.callsign = callsign;
  }

  push(clearance: AtcClearance): void {
    this.state.lastClearance = clearance;
    this.state.pendingRequest = null;
    this.state.messages = [...this.state.messages.slice(-20), clearance];
    this.messages.push(clearance);
    if (this.messages.length > 80) this.messages.shift();
  }

  request(type: ClearanceType): void {
    this.state.pendingRequest = type;
  }

  getMessages(limit = 40): AtcClearance[] {
    return this.messages.slice(-limit);
  }

  clear(): void {
    this.messages.length = 0;
    this.state.pendingRequest = null;
    this.state.lastClearance = null;
    this.state.messages = [];
  }
}
