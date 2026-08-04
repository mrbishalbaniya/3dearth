import type { TrafficAircraft } from "../types";

export interface ConflictWarning {
  kind: "airborne" | "ground" | "runway" | "weather";
  aircraftA: string;
  aircraftB?: string;
  severity: "low" | "medium" | "high";
  message: string;
}

export class ConflictDetection {
  detect(aircraft: TrafficAircraft[], runwayBusy: Set<string> = new Set()): ConflictWarning[] {
    const warnings: ConflictWarning[] = [];
    for (let i = 0; i < aircraft.length; i++) {
      const a = aircraft[i];
      if (runwayBusy.has(a.runwayId ?? "")) {
        warnings.push({
          kind: "runway",
          aircraftA: a.id,
          severity: "high",
          message: `${a.callsign} conflicts with occupied runway ${a.runwayId ?? "unknown"}`,
        });
      }
      for (let j = i + 1; j < aircraft.length; j++) {
        const b = aircraft[j];
        const dNm = Math.hypot(a.lat - b.lat, a.lng - b.lng) * 60;
        const dAlt = Math.abs(a.altM - b.altM);
        if (dNm < 2.5 && dAlt < 300) {
          warnings.push({
            kind: a.onGround || b.onGround ? "ground" : "airborne",
            aircraftA: a.id,
            aircraftB: b.id,
            severity: dNm < 1 ? "high" : "medium",
            message: `${a.callsign} and ${b.callsign} separation below minimum`,
          });
        }
      }
    }
    return warnings;
  }
}
