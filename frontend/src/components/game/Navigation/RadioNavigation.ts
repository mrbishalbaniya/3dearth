/**
 * RadioNavigation — Nepal VOR, DME, NDB, ILS, Marker Beacon database + tuner.
 * Frequency reception, bearing-to/from, DME slant range, ILS deviation.
 * Ref: AIP Nepal ENR 4.1 / AD 2 – radio navaid data.
 */

import type { Navaid, ILSSystem, MarkerBeacon } from "./NavigationTypes";
import { haversineNm, initialBearingDeg } from "./greatCircle";
import { DEG2RAD, EARTH_RADIUS_M } from "../Physics/Math/constants";

// ─── Nepal Navaid Records ────────────────────────────────────────────────────

const NEPAL_NAVAIDS_RAW: Navaid[] = [
  // ── VORs ────────────────────────────────────────────────────────────────
  {
    id: "KTM",   name: "Kathmandu VOR/DME",   type: "VORDME",
    lat: 27.6966, lng: 85.3591, elevM: 1338,
    frequencyMhz: 113.40, rangeNm: 150, magVarDeg: 0.2,
    airportIcao: "VNKT", country: "NP", active: true,
  },
  {
    id: "PKR",   name: "Pokhara VOR/DME",     type: "VORDME",
    lat: 28.1865, lng: 83.9820, elevM: 823,
    frequencyMhz: 112.60, rangeNm: 120, magVarDeg: 0.1,
    airportIcao: "VNPK", country: "NP", active: true,
  },
  {
    id: "BHR",   name: "Bhairahawa VOR/DME",  type: "VORDME",
    lat: 27.5057, lng: 83.4163, elevM: 109,
    frequencyMhz: 115.20, rangeNm: 100, magVarDeg: 0.0,
    airportIcao: "VNBW", country: "NP", active: true,
  },
  {
    id: "BIR",   name: "Biratnagar NDB",       type: "NDB",
    lat: 26.4814, lng: 87.2640, elevM: 72,
    frequencyMhz: 0.356,  rangeNm: 75,  magVarDeg: 0.3,
    airportIcao: "VNVT", country: "NP", active: true,
  },
  {
    id: "KEP",   name: "Nepalgunj VOR/DME",   type: "VORDME",
    lat: 28.1035, lng: 81.6672, elevM: 155,
    frequencyMhz: 114.30, rangeNm: 100, magVarDeg: 0.0,
    airportIcao: "VNKL", country: "NP", active: true,
  },
  {
    id: "DHI",   name: "Dhangarhi NDB",        type: "NDB",
    lat: 28.7533, lng: 80.5819, elevM: 178,
    frequencyMhz: 0.414,  rangeNm: 50,  magVarDeg: 0.0,
    airportIcao: "VNDH", country: "NP", active: true,
  },
  {
    id: "SIF",   name: "Simara NDB",            type: "NDB",
    lat: 27.1595, lng: 84.9801, elevM: 138,
    frequencyMhz: 0.285,  rangeNm: 50,  magVarDeg: 0.1,
    airportIcao: "VNSM", country: "NP", active: true,
  },
  {
    id: "JKR",   name: "Janakpur NDB",          type: "NDB",
    lat: 26.7088, lng: 85.9223, elevM: 78,
    frequencyMhz: 0.366,  rangeNm: 50,  magVarDeg: 0.2,
    airportIcao: "VNJP", country: "NP", active: true,
  },
  {
    id: "TMI",   name: "Tumlingtar NDB",         type: "NDB",
    lat: 27.3150, lng: 87.1933, elevM: 405,
    frequencyMhz: 0.397,  rangeNm: 50,  magVarDeg: 0.2,
    airportIcao: "VNTK", country: "NP", active: true,
  },
  {
    id: "SKH",   name: "Surkhet NDB",            type: "NDB",
    lat: 28.5858, lng: 81.6361, elevM: 724,
    frequencyMhz: 0.310,  rangeNm: 50,  magVarDeg: 0.0,
    airportIcao: "VNSB", country: "NP", active: true,
  },
  // Nearby India navaids useful in Nepal operations
  {
    id: "DNK",   name: "Dibrugarh VOR/DME",   type: "VORDME",
    lat: 27.4839, lng: 94.9122, elevM: 111,
    frequencyMhz: 116.80, rangeNm: 150, magVarDeg: 0.5,
    country: "IN", active: true,
  },
  {
    id: "PNB",   name: "Patna VOR/DME",        type: "VORDME",
    lat: 25.5913, lng: 85.0877, elevM: 55,
    frequencyMhz: 112.30, rangeNm: 150, magVarDeg: 0.3,
    country: "IN", active: true,
  },
];

// ─── Nepal ILS Systems ────────────────────────────────────────────────────────

const NEPAL_ILS_RAW: ILSSystem[] = [
  {
    airportIcao: "VNKT",
    runwayId: "02",
    locIdent: "IKTM",
    locFreqMhz: 111.90,
    locCourseDeg: 22,
    gsFreqMhz: 335.00,
    gsAngleDeg: 3.0,
    locLat: 27.7130, locLng: 85.3510,
    gsLat: 27.6910,  gsLng: 85.3610,
    daAltM: 1448,
    dhAgl: 110,
    category: "CAT_I",
  },
];

// ─── Marker beacons ───────────────────────────────────────────────────────────

const NEPAL_MARKERS_RAW: MarkerBeacon[] = [
  {
    type: "outer",
    lat: 27.7380, lng: 85.3450,
    distanceFromThresholdM: 7400,
    airportIcao: "VNKT",
    runwayId: "02",
  },
  {
    type: "middle",
    lat: 27.7060, lng: 85.3540,
    distanceFromThresholdM: 1050,
    airportIcao: "VNKT",
    runwayId: "02",
  },
];

// ─── Receiver state ───────────────────────────────────────────────────────────

export interface NavReceiverState {
  tuned: boolean;
  navaid: Navaid | null;
  /** Magnetic bearing FROM the navaid TO the aircraft */
  bearingFromDeg: number;
  /** Magnetic bearing TO the navaid FROM the aircraft */
  bearingToDeg: number;
  /** DME slant range (nm) — null if no DME */
  dmeNm: number | null;
  /** OBS / selected course (degrees) */
  obsDeg: number;
  /** CDI deflection -1 (full left) .. +1 (full right) — positive = fly right */
  cdiDeflection: number;
  /** Flag: out of range or no signal */
  flagged: boolean;
  /** TO/FROM — TO when bearing to navaid is within ±90° of OBS course */
  toFrom: "TO" | "FROM" | "OFF";
  /** Signal quality 0..1 */
  signalStrength: number;
}

export interface ILSReceiverState {
  tuned: boolean;
  ils: ILSSystem | null;
  /** Localizer deviation -1..+1 */
  locDeflection: number;
  /** Glideslope deviation -1..+1 (positive = fly up) */
  gsDeflection: number;
  /** Outer marker passing */
  outerMarker: boolean;
  /** Middle marker passing */
  middleMarker: boolean;
  /** Inner marker passing */
  innerMarker: boolean;
  flagged: boolean;
  signalStrength: number;
}

// ─── RadioNavigation class ────────────────────────────────────────────────────

export class RadioNavigation {
  private static instance: RadioNavigation | null = null;

  private navaids: Navaid[] = [...NEPAL_NAVAIDS_RAW];
  private ilsSystems: ILSSystem[] = [...NEPAL_ILS_RAW];
  private markers: MarkerBeacon[] = [...NEPAL_MARKERS_RAW];

  private byId = new Map<string, Navaid>();

  // Current receiver states
  public nav1: NavReceiverState = this.emptyReceiver();
  public nav2: NavReceiverState = this.emptyReceiver();
  public adf1: NavReceiverState = this.emptyReceiver();
  public ils: ILSReceiverState = this.emptyILS();

  private nav1FreqMhz = 113.40;
  private nav2FreqMhz = 112.60;
  private adf1FreqKhz = 356;

  private nav1ObsDeg = 0;
  private nav2ObsDeg = 0;

  private constructor() {
    for (const n of this.navaids) this.byId.set(n.id.toUpperCase(), n);
  }

  public static getInstance(): RadioNavigation {
    if (!RadioNavigation.instance) RadioNavigation.instance = new RadioNavigation();
    return RadioNavigation.instance;
  }

  // ── Tuning ───────────────────────────────────────────────────────────────────

  public tuneNav1(freqMhz: number, obs = 0): void {
    this.nav1FreqMhz = freqMhz;
    this.nav1ObsDeg = obs;
  }

  public tuneNav2(freqMhz: number, obs = 0): void {
    this.nav2FreqMhz = freqMhz;
    this.nav2ObsDeg = obs;
  }

  public tuneADF(freqKhz: number): void {
    this.adf1FreqKhz = freqKhz;
  }

  public setNav1OBS(obs: number): void { this.nav1ObsDeg = ((obs % 360) + 360) % 360; }
  public setNav2OBS(obs: number): void { this.nav2ObsDeg = ((obs % 360) + 360) % 360; }

  // ── Per-frame update ──────────────────────────────────────────────────────────

  public update(lat: number, lng: number, altM: number): void {
    this.nav1 = this.computeVOR(lat, lng, altM, this.nav1FreqMhz, this.nav1ObsDeg);
    this.nav2 = this.computeVOR(lat, lng, altM, this.nav2FreqMhz, this.nav2ObsDeg);
    this.adf1 = this.computeADF(lat, lng, altM, this.adf1FreqKhz);
    this.ils  = this.computeILS(lat, lng, altM);
  }

  // ── VOR computation ───────────────────────────────────────────────────────────

  private computeVOR(
    lat: number, lng: number, altM: number,
    freqMhz: number, obsDeg: number,
  ): NavReceiverState {
    const navaid = this.navaidsForFreq(freqMhz, ["VOR", "VORDME", "VORTAC"])
      .sort((a, b) => haversineNm(lat, lng, a.lat, a.lng) - haversineNm(lat, lng, b.lat, b.lng))[0];

    if (!navaid) return this.emptyReceiver();

    const distNm = haversineNm(lat, lng, navaid.lat, navaid.lng);
    const signalStrength = this.signalQuality(distNm, altM, navaid.rangeNm);
    if (signalStrength < 0.05) return this.emptyReceiver();

    const bearingFrom = initialBearingDeg(navaid.lat, navaid.lng, lat, lng);
    const bearingTo   = initialBearingDeg(lat, lng, navaid.lat, navaid.lng);

    const radialDiff = this.wrap180(bearingFrom - obsDeg);
    const cdiMax = 10; // degrees full-scale deflection
    const cdiDeflection = Math.max(-1, Math.min(1, radialDiff / cdiMax));

    const toFrom = Math.abs(this.wrap180(bearingTo - obsDeg)) <= 90 ? "TO" : "FROM";

    const dmeNm = navaid.type === "VORDME" || navaid.type === "VORTAC"
      ? this.slantRangeNm(lat, lng, altM, navaid.lat, navaid.lng, navaid.elevM)
      : null;

    return {
      tuned: true, navaid,
      bearingFromDeg: bearingFrom,
      bearingToDeg: bearingTo,
      dmeNm, obsDeg,
      cdiDeflection,
      toFrom,
      flagged: false,
      signalStrength,
    };
  }

  // ── ADF/NDB computation ───────────────────────────────────────────────────────

  private computeADF(
    lat: number, lng: number, altM: number, freqKhz: number,
  ): NavReceiverState {
    const freqMhz = freqKhz / 1000;
    const navaid = this.navaidsForFreq(freqMhz, ["NDB"])
      .sort((a, b) => haversineNm(lat, lng, a.lat, a.lng) - haversineNm(lat, lng, b.lat, b.lng))[0];

    if (!navaid) return this.emptyReceiver();

    const distNm = haversineNm(lat, lng, navaid.lat, navaid.lng);
    const signalStrength = this.signalQuality(distNm, altM, navaid.rangeNm);
    if (signalStrength < 0.05) return this.emptyReceiver();

    const bearingTo = initialBearingDeg(lat, lng, navaid.lat, navaid.lng);

    return {
      tuned: true, navaid,
      bearingFromDeg: (bearingTo + 180) % 360,
      bearingToDeg: bearingTo,
      dmeNm: null,
      obsDeg: 0,
      cdiDeflection: 0,
      toFrom: "TO",
      flagged: false,
      signalStrength,
    };
  }

  // ── ILS computation ───────────────────────────────────────────────────────────

  private computeILS(lat: number, lng: number, altM: number): ILSReceiverState {
    for (const sys of this.ilsSystems) {
      const distNm = haversineNm(lat, lng, sys.locLat, sys.locLng);
      if (distNm > 25) continue;

      // Localizer: angular error from course
      const bearingToLoc = initialBearingDeg(lat, lng, sys.locLat, sys.locLng);
      const locErrDeg = this.wrap180(bearingToLoc - (sys.locCourseDeg + 180));
      const locFull = 2.5; // degrees full-scale
      const locDefl = Math.max(-1, Math.min(1, locErrDeg / locFull));

      // Glideslope: angle above/below nominal GS
      const elevDiffM = altM - sys.gsLat; // rough — proper calc below
      const gsDistM = distNm * 1852;
      const nomAltAtDistM = sys.gsLat + Math.tan(sys.gsAngleDeg * DEG2RAD) * gsDistM;
      const gsErrM = altM - (sys.gsLat + Math.tan(sys.gsAngleDeg * DEG2RAD) * gsDistM);
      const gsFull = 60; // metres full-scale
      const gsDefl = Math.max(-1, Math.min(1, -gsErrM / gsFull));
      void elevDiffM; void nomAltAtDistM;

      // Marker beacons
      let outerM = false, middleM = false, innerM = false;
      for (const mk of this.markers) {
        if (mk.airportIcao !== sys.airportIcao || mk.runwayId !== sys.runwayId) continue;
        const mkDist = haversineNm(lat, lng, mk.lat, mk.lng) * 1852;
        if (mkDist < 200) {
          if (mk.type === "outer")  outerM  = true;
          if (mk.type === "middle") middleM = true;
          if (mk.type === "inner")  innerM  = true;
        }
      }

      return {
        tuned: true, ils: sys,
        locDeflection: locDefl,
        gsDeflection: gsDefl,
        outerMarker: outerM, middleMarker: middleM, innerMarker: innerM,
        flagged: distNm > 18,
        signalStrength: Math.max(0, 1 - distNm / 25),
      };
    }
    return this.emptyILS();
  }

  // ── Frequency lookup helpers ──────────────────────────────────────────────────

  private navaidsForFreq(freqMhz: number, types: Navaid["type"][]): Navaid[] {
    return this.navaids.filter(
      (n) => n.active && types.includes(n.type) && Math.abs(n.frequencyMhz - freqMhz) < 0.01,
    );
  }

  /** Find nearest navaid by frequency within rangeNm. */
  public findByFreq(freqMhz: number, lat?: number, lng?: number): Navaid | undefined {
    const matches = this.navaids.filter((n) => n.active && Math.abs(n.frequencyMhz - freqMhz) < 0.015);
    if (!matches.length) return undefined;
    if (lat == null || lng == null) return matches[0];
    return matches.sort((a, b) =>
      haversineNm(lat, lng, a.lat, a.lng) - haversineNm(lat, lng, b.lat, b.lng),
    )[0];
  }

  public getById(id: string): Navaid | undefined { return this.byId.get(id.toUpperCase()); }
  public getAll(): Navaid[]  { return [...this.navaids]; }
  public getILSFor(icao: string, runwayId: string): ILSSystem | undefined {
    return this.ilsSystems.find((s) => s.airportIcao === icao && s.runwayId === runwayId);
  }

  // ── Signal quality ────────────────────────────────────────────────────────────

  private signalQuality(distNm: number, altM: number, rangeNm: number): number {
    const altBonus = Math.sqrt(Math.max(0, altM) / 10000) * 20; // altitude extends range
    const effectiveRange = rangeNm + altBonus;
    return Math.max(0, 1 - distNm / effectiveRange);
  }

  private slantRangeNm(
    lat1: number, lng1: number, alt1M: number,
    lat2: number, lng2: number, alt2M: number,
  ): number {
    const horizM = haversineNm(lat1, lng1, lat2, lng2) * 1852;
    const vertM  = alt1M - alt2M;
    return Math.sqrt(horizM * horizM + vertM * vertM) / 1852;
  }

  private wrap180(deg: number): number {
    let d = ((deg + 180) % 360) - 180;
    if (d < -180) d += 360;
    return d;
  }

  // ── Empty state factories ─────────────────────────────────────────────────────

  private emptyReceiver(): NavReceiverState {
    return {
      tuned: false, navaid: null,
      bearingFromDeg: 0, bearingToDeg: 0,
      dmeNm: null, obsDeg: 0,
      cdiDeflection: 0, toFrom: "OFF",
      flagged: true, signalStrength: 0,
    };
  }

  private emptyILS(): ILSReceiverState {
    return {
      tuned: false, ils: null,
      locDeflection: 0, gsDeflection: 0,
      outerMarker: false, middleMarker: false, innerMarker: false,
      flagged: true, signalStrength: 0,
    };
  }
}

export const radioNav = RadioNavigation.getInstance();
