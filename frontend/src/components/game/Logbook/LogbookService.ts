/**
 * Pilot logbook — persists completed flights locally (cloud-ready schema).
 */

export interface LogbookEntry {
  id: string;
  dateIso: string;
  departureIcao: string;
  arrivalIcao: string | null;
  aircraftId: string;
  durationSec: number;
  distanceNm: number;
  fuelUsedKg: number;
  avgSpeedKt: number;
  maxAltM: number;
  landingFpm: number | null;
  night: boolean;
  remarks?: string;
}

const KEY = "orbit-pilot-logbook-v1";

export function loadLogbook(): LogbookEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LogbookEntry[];
  } catch {
    return [];
  }
}

export function saveLogbook(entries: LogbookEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 200)));
  } catch {
    /* quota */
  }
}

export function appendLogbookEntry(entry: LogbookEntry): LogbookEntry[] {
  const all = [entry, ...loadLogbook()];
  saveLogbook(all);
  return all;
}

export function createLogbookId(): string {
  return `leg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
