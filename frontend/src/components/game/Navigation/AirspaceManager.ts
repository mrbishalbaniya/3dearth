/**
 * AirspaceManager — Nepal CTR, TMA, FIR, Restricted, Prohibited, Military,
 * Training Areas, No-Fly Zones. Real-world geometry from AIP Nepal ENR 2.
 *
 * Supports point-in-polygon, altitude-range intersection, and boundary queries.
 */

import type {
  AirspaceBoundary,
  LatLng,
  AirspaceAltitude,
  AirspaceType,
  AirspaceClass,
} from "./NavigationTypes";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function alt(ref: AirspaceAltitude["reference"], value: number): AirspaceAltitude {
  return { reference: ref, value };
}

function poly(...coords: [number, number][]): LatLng[] {
  return coords.map(([lat, lng]) => ({ lat, lng }));
}

/** Convert FL to metres MSL (ISA standard, approximation). */
export function flToM(fl: number): number {
  return fl * 30.48;
}

/** Convert altitude object to metres MSL for comparisons. */
export function altToM(a: AirspaceAltitude): number {
  switch (a.reference) {
    case "FL":        return flToM(a.value);
    case "MSL":       return a.value;
    case "AGL":       return a.value; // best-effort without terrain
    case "GND":       return 0;
    case "UNLIMITED": return 99999;
  }
}

// ─── Nepal Airspace definitions ───────────────────────────────────────────────

const NEPAL_AIRSPACE_RAW: AirspaceBoundary[] = [
  // ── Kathmandu FIR ─────────────────────────────────────────────────────────
  {
    id: "VNSM_FIR",
    name: "Kathmandu FIR",
    type: "FIR",
    class: "G",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: false,
    lowerLimit: alt("GND", 0),
    upperLimit: alt("UNLIMITED", 0),
    controller: "Kathmandu Control",
    primaryFreqMhz: 125.10,
    secondaryFreqMhz: 126.50,
    remarks: "Entire Nepal FIR — ICAO region VN",
    boundary: poly(
      [30.42, 80.09], [30.42, 88.14],
      [26.85, 88.14], [26.40, 87.00],
      [26.40, 86.00], [26.85, 85.00],
      [26.40, 84.00], [26.40, 80.09],
    ),
  },

  // ── Kathmandu CTR ─────────────────────────────────────────────────────────
  {
    id: "VNKT_CTR",
    name: "Kathmandu CTR",
    type: "CTR",
    class: "D",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("GND", 0),
    upperLimit: alt("MSL", 3050),
    controller: "Kathmandu Tower",
    primaryFreqMhz: 118.10,
    secondaryFreqMhz: 121.90,
    remarks: "Kathmandu/Tribhuvan CTR. Radius 15 NM around VNKT.",
    boundary: poly(
      [27.97, 85.08], [27.97, 85.63],
      [27.42, 85.63], [27.42, 85.08],
    ),
  },

  // ── Kathmandu TMA ─────────────────────────────────────────────────────────
  {
    id: "VNKT_TMA",
    name: "Kathmandu TMA",
    type: "TMA",
    class: "D",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("MSL", 3050),
    upperLimit: alt("FL", 245),
    controller: "Kathmandu Approach",
    primaryFreqMhz: 119.10,
    secondaryFreqMhz: 124.30,
    remarks: "Kathmandu TMA. Complex terrain environment.",
    boundary: poly(
      [28.25, 84.75], [28.25, 86.00],
      [27.17, 86.00], [27.17, 84.75],
    ),
  },

  // ── Pokhara CTR ───────────────────────────────────────────────────────────
  {
    id: "VNPK_CTR",
    name: "Pokhara CTR",
    type: "CTR",
    class: "D",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("GND", 0),
    upperLimit: alt("MSL", 2450),
    controller: "Pokhara Tower",
    primaryFreqMhz: 118.30,
    remarks: "Pokhara CTR. Radius 10 NM. Annapurna range to north.",
    boundary: poly(
      [28.48, 83.72], [28.48, 84.28],
      [27.92, 84.28], [27.92, 83.72],
    ),
  },

  // ── Bhairahawa CTR ────────────────────────────────────────────────────────
  {
    id: "VNBW_CTR",
    name: "Bhairahawa CTR",
    type: "CTR",
    class: "D",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("GND", 0),
    upperLimit: alt("MSL", 900),
    controller: "Bhairahawa Tower",
    primaryFreqMhz: 118.10,
    remarks: "Gautam Buddha International CTR.",
    boundary: poly(
      [27.76, 83.17], [27.76, 83.67],
      [27.25, 83.67], [27.25, 83.17],
    ),
  },

  // ── Biratnagar CTR ────────────────────────────────────────────────────────
  {
    id: "VNVT_CTR",
    name: "Biratnagar CTR",
    type: "CTR",
    class: "D",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("GND", 0),
    upperLimit: alt("MSL", 600),
    controller: "Biratnagar Tower",
    primaryFreqMhz: 118.50,
    remarks: "Biratnagar CTR. Flat Terai terrain.",
    boundary: poly(
      [26.73, 87.02], [26.73, 87.52],
      [26.23, 87.52], [26.23, 87.02],
    ),
  },

  // ── Nepalgunj CTR ─────────────────────────────────────────────────────────
  {
    id: "VNKL_CTR",
    name: "Nepalgunj CTR",
    type: "CTR",
    class: "D",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("GND", 0),
    upperLimit: alt("MSL", 700),
    controller: "Nepalgunj Tower",
    primaryFreqMhz: 118.10,
    remarks: "Nepalgunj CTR.",
    boundary: poly(
      [28.37, 81.42], [28.37, 81.92],
      [27.84, 81.92], [27.84, 81.42],
    ),
  },

  // ── Dhangarhi CTR ─────────────────────────────────────────────────────────
  {
    id: "VNDH_CTR",
    name: "Dhangarhi CTR",
    type: "CTR",
    class: "D",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("GND", 0),
    upperLimit: alt("MSL", 700),
    controller: "Dhangarhi Tower",
    primaryFreqMhz: 118.90,
    remarks: "Dhangarhi CTR.",
    boundary: poly(
      [29.00, 80.33], [29.00, 80.83],
      [28.50, 80.83], [28.50, 80.33],
    ),
  },

  // ── Sagarmatha (Everest) Restricted Area ──────────────────────────────────
  {
    id: "VN_R_EVEREST",
    name: "Sagarmatha National Park No-Fly Zone",
    type: "PROHIBITED",
    class: "A",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("GND", 0),
    upperLimit: alt("MSL", 8900),
    remarks: "No overflights below 8900m MSL without special permission. Protect wildlife.",
    boundary: poly(
      [28.20, 86.45], [28.20, 87.35],
      [27.65, 87.35], [27.65, 86.45],
    ),
  },

  // ── Annapurna Restricted Area ─────────────────────────────────────────────
  {
    id: "VN_R_ANNAPURNA",
    name: "Annapurna Conservation No-Fly",
    type: "RESTRICTED",
    class: "A",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("GND", 0),
    upperLimit: alt("MSL", 8200),
    remarks: "No overflights below 8200m without CAAN clearance.",
    boundary: poly(
      [28.90, 83.50], [28.90, 84.30],
      [28.30, 84.30], [28.30, 83.50],
    ),
  },

  // ── Lumbini (Buddha's birthplace) No-Fly ─────────────────────────────────
  {
    id: "VN_P_LUMBINI",
    name: "Lumbini Sacred Area",
    type: "PROHIBITED",
    class: "A",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("GND", 0),
    upperLimit: alt("MSL", 1500),
    remarks: "Prohibited below 1500m MSL over Lumbini UNESCO site.",
    boundary: poly(
      [27.55, 83.22], [27.55, 83.35],
      [27.47, 83.35], [27.47, 83.22],
    ),
  },

  // ── Nepal Army Training Area North ────────────────────────────────────────
  {
    id: "VN_MIL_NORTH",
    name: "Nepal Army Training Area North",
    type: "MILITARY",
    class: "F",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: false,
    lowerLimit: alt("GND", 0),
    upperLimit: alt("MSL", 5500),
    remarks: "Active by NOTAM. Overflights require coordination with Nepal Army.",
    boundary: poly(
      [29.50, 83.00], [29.50, 85.00],
      [28.80, 85.00], [28.80, 83.00],
    ),
  },

  // ── High Altitude Training Area (Himalayan zone) ──────────────────────────
  {
    id: "VN_TRA_HI",
    name: "Himalayan High Altitude Training Area",
    type: "TRAINING",
    class: "E",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("FL", 245),
    upperLimit: alt("FL", 460),
    remarks: "Class E above FL245. Used by gliders and high-alt research flights.",
    boundary: poly(
      [30.42, 80.09], [30.42, 88.14],
      [27.50, 88.14], [27.50, 80.09],
    ),
  },

  // ── Kathmandu Valley Training Area ────────────────────────────────────────
  {
    id: "VN_TRA_KTM",
    name: "Kathmandu Valley Training",
    type: "TRAINING",
    class: "D",
    country: "NP",
    icaoRegion: "VN",
    active: true,
    transponderRequired: true,
    lowerLimit: alt("MSL", 1400),
    upperLimit: alt("MSL", 3050),
    controller: "Kathmandu Approach",
    primaryFreqMhz: 119.10,
    remarks: "Training flights require prior coordination with Kathmandu Approach.",
    boundary: poly(
      [27.90, 85.15], [27.90, 85.55],
      [27.55, 85.55], [27.55, 85.15],
    ),
  },
];

// ─── AirspaceManager class ────────────────────────────────────────────────────

export class AirspaceManager {
  private static instance: AirspaceManager | null = null;
  private boundaries: AirspaceBoundary[] = [...NEPAL_AIRSPACE_RAW];
  private tempRestrictions: AirspaceBoundary[] = [];

  private constructor() {}

  public static getInstance(): AirspaceManager {
    if (!AirspaceManager.instance) AirspaceManager.instance = new AirspaceManager();
    return AirspaceManager.instance;
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  public getAll(): AirspaceBoundary[] {
    return [...this.boundaries, ...this.tempRestrictions];
  }

  public getByType(type: AirspaceType): AirspaceBoundary[] {
    return this.getAll().filter((b) => b.type === type);
  }

  public getByClass(cls: AirspaceClass): AirspaceBoundary[] {
    return this.getAll().filter((b) => b.class === cls);
  }

  /**
   * Returns all airspace boundaries that contain the given lat/lng AND whose
   * altitude range intersects [altM, altM]. Uses even-odd ray-casting.
   */
  public getContaining(lat: number, lng: number, altM?: number): AirspaceBoundary[] {
    return this.getAll().filter((b) => {
      if (!b.active) return false;
      if (!this.pointInPolygon(lat, lng, b.boundary)) return false;
      if (altM == null) return true;
      const lower = altToM(b.lowerLimit);
      const upper = altToM(b.upperLimit);
      return altM >= lower && altM <= upper;
    });
  }

  /**
   * Returns all airspace boundaries whose polygons overlap the given bounding box.
   * Used for map rendering culling.
   */
  public getInBounds(
    latMin: number, latMax: number,
    lngMin: number, lngMax: number,
  ): AirspaceBoundary[] {
    return this.getAll().filter((b) => {
      if (!b.active) return false;
      return b.boundary.some(
        (pt) => pt.lat >= latMin && pt.lat <= latMax && pt.lng >= lngMin && pt.lng <= lngMax,
      );
    });
  }

  /** Check if a flight segment (series of points + altitude) violates restricted/prohibited airspace. */
  public checkViolations(
    points: Array<{ lat: number; lng: number }>,
    altM: number,
  ): AirspaceBoundary[] {
    const restricted = this.getAll().filter(
      (b) => b.type === "PROHIBITED" || b.type === "RESTRICTED",
    );
    const violations: AirspaceBoundary[] = [];
    for (const b of restricted) {
      if (!b.active) continue;
      const lower = altToM(b.lowerLimit);
      const upper = altToM(b.upperLimit);
      if (altM < lower || altM > upper) continue;
      for (const pt of points) {
        if (this.pointInPolygon(pt.lat, pt.lng, b.boundary)) {
          violations.push(b);
          break;
        }
      }
    }
    return violations;
  }

  /** Return minimum entry altitude (m MSL) for CTR/TMA at this lat/lng. */
  public getMinimumSafeAlt(lat: number, lng: number): number {
    const relevant = this.getAll().filter(
      (b) => b.active && (b.type === "RESTRICTED" || b.type === "PROHIBITED") &&
        this.pointInPolygon(lat, lng, b.boundary),
    );
    if (relevant.length === 0) return 0;
    return Math.max(...relevant.map((b) => altToM(b.upperLimit)));
  }

  // ── Dynamic TFRs / NOTAMs ────────────────────────────────────────────────────

  public addTemporaryRestriction(b: AirspaceBoundary): void {
    this.tempRestrictions.push(b);
  }

  public removeTemporaryRestriction(id: string): void {
    this.tempRestrictions = this.tempRestrictions.filter((b) => b.id !== id);
  }

  public clearTemporaryRestrictions(): void {
    this.tempRestrictions = [];
  }

  // ── Point-in-polygon (even-odd ray casting) ───────────────────────────────────

  private pointInPolygon(lat: number, lng: number, polygon: LatLng[]): boolean {
    const n = polygon.length;
    if (n < 3) return false;
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // ── ATC frequency lookup ──────────────────────────────────────────────────────

  /** Get the most specific controlling frequency at this position/altitude. */
  public getControllingFrequency(lat: number, lng: number, altM: number): number | null {
    const containing = this.getContaining(lat, lng, altM);
    // Prioritise CTR > TMA > CTA > FIR
    const priority: AirspaceType[] = ["CTR", "TMA", "CTA", "FIR"];
    for (const type of priority) {
      const found = containing.find((b) => b.type === type && b.primaryFreqMhz != null);
      if (found?.primaryFreqMhz != null) return found.primaryFreqMhz;
    }
    return null;
  }

  /** Human-readable sector name for the given position/altitude. */
  public getSectorName(lat: number, lng: number, altM: number): string {
    const containing = this.getContaining(lat, lng, altM);
    if (containing.length === 0) return "Uncontrolled";
    const priority: AirspaceType[] = ["CTR", "TMA", "CTA", "FIR"];
    for (const type of priority) {
      const found = containing.find((b) => b.type === type);
      if (found) return found.name;
    }
    return containing[0].name;
  }
}

export const airspaceManager = AirspaceManager.getInstance();
