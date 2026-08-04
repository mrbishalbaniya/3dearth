/**
 * Nepal Airspace & Navigation System — shared type definitions.
 * All coordinates use decimal degrees (WGS84), altitudes in meters MSL.
 */

// ─── Coordinate primitives ────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LatLngAlt extends LatLng {
  altM: number;
}

// ─── Waypoints ────────────────────────────────────────────────────────────────

export type WaypointType =
  | "fix"          // Named intersection fix
  | "vor"          // VOR station
  | "ndb"          // NDB station
  | "dme"          // DME-only station
  | "ils_outer"    // ILS outer marker
  | "ils_middle"   // ILS middle marker
  | "ils_inner"    // ILS inner marker
  | "user"         // User-defined GPS waypoint
  | "airport"      // Airport reference point
  | "holding"      // Holding pattern fix
  | "sid"          // SID fix
  | "star"         // STAR fix
  | "approach";    // Approach fix

export interface AltitudeRestriction {
  type: "at" | "at_or_above" | "at_or_below" | "between";
  minAltM?: number;
  maxAltM?: number;
  altM?: number;
}

export interface SpeedRestriction {
  type: "at" | "at_or_above" | "at_or_below";
  speedKt: number;
}

export interface Waypoint {
  id: string;               // Unique identifier (ICAO 5-letter fix, VOR ident, etc.)
  name: string;
  type: WaypointType;
  lat: number;
  lng: number;
  altitudeRestriction?: AltitudeRestriction;
  speedRestriction?: SpeedRestriction;
  /** Magnetic variation at this fix (degrees, + east) */
  magVarDeg?: number;
  region?: string;
  country: string;
}

export interface HoldingPattern {
  fixId: string;
  inboundCoursDeg: number;
  turnDirection: "left" | "right";
  legLengthNm: number;
  legTimeSec?: number;
  minAltM: number;
  maxAltM: number;
  speedLimitKt: number;
}

// ─── Radio Navigation Aids ────────────────────────────────────────────────────

export type NavaidType = "VOR" | "VORDME" | "VORTAC" | "DME" | "NDB" | "TACAN" | "ILS_LOC" | "ILS_GS";

export interface Navaid {
  id: string;           // 2-3 letter ident
  name: string;
  type: NavaidType;
  lat: number;
  lng: number;
  elevM: number;
  frequencyMhz: number;
  rangeNm: number;
  /** Magnetic variation (deg) */
  magVarDeg: number;
  /** Associated airport ICAO */
  airportIcao?: string;
  /** ILS course (deg true) */
  ilsCourseDeg?: number;
  /** Glideslope angle (deg, typically 3.0) */
  gsAngleDeg?: number;
  /** DME channel (for paired VOR/DME) */
  dmeChannel?: string;
  declination?: number;
  country: string;
  region?: string;
  active: boolean;
}

export interface ILSSystem {
  airportIcao: string;
  runwayId: string;
  locIdent: string;
  locFreqMhz: number;
  locCourseDeg: number;
  gsFreqMhz: number;
  gsAngleDeg: number;
  /** Lat/lng of localizer transmitter */
  locLat: number;
  locLng: number;
  /** Lat/lng of glideslope transmitter */
  gsLat: number;
  gsLng: number;
  /** Decision altitude MSL (meters) */
  daAltM: number;
  /** Decision height AGL (meters) */
  dhAgl: number;
  category: "CAT_I" | "CAT_II" | "CAT_III";
}

export interface MarkerBeacon {
  type: "outer" | "middle" | "inner";
  lat: number;
  lng: number;
  distanceFromThresholdM: number;
  airportIcao: string;
  runwayId: string;
}

// ─── Airspace ─────────────────────────────────────────────────────────────────

export type AirspaceClass = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type AirspaceType =
  | "CTR"          // Control Zone
  | "TMA"          // Terminal Maneuvering Area
  | "FIR"          // Flight Information Region
  | "UIR"          // Upper Information Region
  | "CTA"          // Control Area
  | "RESTRICTED"   // Restricted Area
  | "PROHIBITED"   // Prohibited Area
  | "DANGER"       // Danger Area
  | "MILITARY"     // Military Operations Area
  | "TRAINING"     // Training Area
  | "TFR"          // Temporary Flight Restriction
  | "ADIZ"         // Air Defence Identification Zone
  | "GLIDER"       // Glider Area
  | "PARACHUTE";   // Parachute Drop Zone

export interface AirspaceAltitude {
  /** "AGL", "MSL", "FL", "UNLIMITED", "GND" */
  reference: "AGL" | "MSL" | "FL" | "UNLIMITED" | "GND";
  value: number;
}

export interface AirspaceBoundary {
  id: string;
  name: string;
  type: AirspaceType;
  class: AirspaceClass;
  /** Polygon vertices (lat/lng, counter-clockwise winding) */
  boundary: LatLng[];
  lowerLimit: AirspaceAltitude;
  upperLimit: AirspaceAltitude;
  /** Controlling ATC unit */
  controller?: string;
  /** Primary frequency MHz */
  frequencyMhz?: number;
  /** Secondary frequency MHz */
  secondaryFreqMhz?: number;
  /** Primary frequency as named alias for ATC use */
  primaryFreqMhz?: number;
  transponderRequired: boolean;
  remarks?: string;
  active: boolean;
  country: string;
  icaoRegion: string;
}

// ─── Nepal-specific airport extension ────────────────────────────────────────

export interface NepalAirportExtended {
  icao: string;
  iata: string | null;
  name: string;
  nameNepali?: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  elevM: number;
  runways: NepalRunway[];
  frequencies: AirportFrequency[];
  /** Available instrument approaches */
  approaches: InstrumentApproach[];
  /** Parking positions */
  parkingPositions: ParkingPosition[];
  /** Is airport paved? */
  surfaceType: "paved" | "gravel" | "unpaved" | "grass";
  /** Longest runway length metres */
  longestRunwayM: number;
  /** Airport category */
  category: "international" | "domestic" | "stol" | "helipad";
  /** Nepal Civil Aviation Authority code */
  caanCode?: string;
  active: boolean;
  /** Hazardous terrain nearby */
  terrainWarning?: string;
}

export interface NepalRunway {
  id: string;
  headingDeg: number;
  lengthM: number;
  widthM: number;
  surface: "asphalt" | "concrete" | "gravel" | "grass" | "dirt";
  /** PCN rating (pavement classification) */
  pcn?: number;
  /** True threshold lat/lng */
  thresholdLat?: number;
  thresholdLng?: number;
  /** Displaced threshold distance (m) */
  displacedThresholdM?: number;
  ils?: {
    locFreqMhz: number;
    courseDeg: number;
    gsAngleDeg?: number;
  };
  visualGlidePath?: number;
  lightingPapi?: boolean;
  lightingVasi?: boolean;
  elevM?: number;
}

export interface AirportFrequency {
  type: "ATIS" | "GND" | "TWR" | "APP" | "DEP" | "CTR" | "UNICOM" | "EMERGENCY" | "CLEARANCE";
  name: string;
  mhz: number;
}

export interface InstrumentApproach {
  type: "ILS" | "RNAV_GNSS" | "VOR" | "NDB" | "LOC" | "VISUAL";
  runwayId: string;
  /** Minimum descent altitude MSL (meters) */
  mdaAltM: number;
  /** Decision altitude MSL (meters) — ILS/LPV only */
  daAltM?: number;
  /** Visibility requirement (meters) */
  visibilityM: number;
  navaidId?: string;
}

export interface ParkingPosition {
  id: string;
  lat: number;
  lng: number;
  headingDeg: number;
  type: "gate" | "remote" | "cargo" | "ga" | "military";
  widthM?: number;
}

// ─── GPS / RNAV ────────────────────────────────────────────────────────────────

export interface GPSPosition {
  lat: number;
  lng: number;
  altM: number;
  hdop: number;    // Horizontal dilution of precision
  vdop: number;    // Vertical dilution of precision
  satellites: number;
  fixType: "none" | "2d" | "3d" | "dgps" | "waas";
  accuracyM: number;
  velocityMs: number;
  trackDeg: number;
  timestamp: number;
}

export interface GPSConfig {
  waasEnabled: boolean;
  updateRateHz: number;
  antennaNoise: number;
}

// ─── Navigation Computer / CDI ────────────────────────────────────────────────

export type NavSource = "GPS" | "VOR1" | "VOR2" | "NDB1" | "NDB2" | "ILS" | "LOC" | "RNAV";
export type NavPhase = "TERM" | "ENROUTE" | "APPROACH" | "DEPARTURE" | "MISSED";

export interface CourseDeviationIndicator {
  source: NavSource;
  /** Course selected (magnetic, degrees) */
  courseDeg: number;
  /** Cross-track deviation: positive = right of course (dots: -2.5 to 2.5) */
  cdiDots: number;
  /** Glideslope deviation (dots: -2.5 to 2.5), null if not ILS */
  gsDots: number | null;
  /** Distance to active waypoint (nm) */
  distanceNm: number;
  /** Bearing to active waypoint (magnetic degrees) */
  bearingDeg: number;
  /** Track angle error (degrees) */
  taeError: number;
  /** Flag: no signal */
  flagged: boolean;
  /** Active navaid or waypoint id */
  activeIdent: string | null;
  /** TO/FROM indicator */
  toFrom: "TO" | "FROM" | "OFF";
}

export interface NavigationState {
  source: NavSource;
  phase: NavPhase;
  activeWaypointIndex: number;
  activeWaypoint: Waypoint | null;
  nextWaypoint: Waypoint | null;
  distanceToWptNm: number;
  bearingToWptDeg: number;
  crossTrackErrorM: number;
  requiredNavPerformanceNm: number;
  actualNavPerformanceNm: number;
  navigationIntegrity: boolean;
  cdi: CourseDeviationIndicator;
  /** Estimated time to next waypoint (seconds) */
  etaNextWptSec: number | null;
  /** Estimated time to destination (seconds) */
  etaDestSec: number | null;
  /** Total flight plan distance remaining (nm) */
  remainingDistanceNm: number;
}

// ─── Autopilot ────────────────────────────────────────────────────────────────

export type AutopilotLateralMode =
  | "OFF"
  | "HDG"       // Heading Select
  | "LNAV"      // GPS/FMS lateral navigation
  | "LOC"       // Localizer capture
  | "BC"        // Back-course localizer
  | "TRK";      // Ground track hold

export type AutopilotVerticalMode =
  | "OFF"
  | "ALT"       // Altitude hold
  | "VS"        // Vertical speed
  | "FLC"       // Flight level change / airspeed
  | "VNAV"      // FMS vertical navigation
  | "GS"        // Glideslope
  | "TO"        // Takeoff
  | "GA";       // Go-around

export type AutopilotSpeedMode = "OFF" | "IAS" | "MACH";

export interface AutopilotFullState {
  masterEngage: boolean;
  fdActive: boolean;     // Flight director
  atActive: boolean;     // Autothrottle
  lateral: AutopilotLateralMode;
  vertical: AutopilotVerticalMode;
  speed: AutopilotSpeedMode;
  targetHdgDeg: number;
  targetTrkDeg: number;
  targetAltM: number;
  targetVsMs: number;
  targetSpeedKt: number;
  targetMach: number;
  /** Bank angle limit degrees */
  bankLimitDeg: number;
  approachMode: boolean;
  /** TOGA engaged */
  togaEngaged: boolean;
  /** Current roll command (-1..1) */
  rollCmd: number;
  /** Current pitch command (-1..1) */
  pitchCmd: number;
  /** Current throttle command (-1..1) */
  throttleCmd: number;
  /** Alert: heading capture pending */
  hdgCapture: boolean;
  /** Alert: alt capture pending */
  altCapture: boolean;
  /** Alert: glideslope capture pending */
  gsCapture: boolean;
}

// ─── Terrain Awareness ────────────────────────────────────────────────────────

export type TerrainAlertLevel = "NONE" | "CAUTION" | "WARNING" | "PULL_UP";

export interface TerrainAlert {
  level: TerrainAlertLevel;
  /** Mode number (GPWS modes 1-6, EGPWS terrain) */
  mode: number;
  message: string;
  audioTrigger: string;
}

export interface TerrainCell {
  lat: number;
  lng: number;
  elevationM: number;
}

export interface TerrainAwarenessState {
  alert: TerrainAlert;
  /** Terrain elevation directly below (m) */
  terrainElevationM: number;
  /** AGL height (m) */
  aglM: number;
  /** Minimum safe altitude in current sector (m MSL) */
  msaM: number;
  /** Look-ahead terrain clear distance (nm) */
  lookAheadClearNm: number;
  /** Grid MORA (Minimum Off-Route Altitude, meters) */
  gridMoraM: number;
}

// ─── Obstacle Database ────────────────────────────────────────────────────────

export type ObstacleType =
  | "antenna"
  | "tower"
  | "building"
  | "mountain"
  | "hill"
  | "powerline"
  | "cable"
  | "stack"
  | "wind_turbine"
  | "other";

export interface Obstacle {
  id: string;
  type: ObstacleType;
  name?: string;
  lat: number;
  lng: number;
  elevationMsl: number;   // MSL elevation of base
  heightAgl: number;      // AGL height of obstacle
  summitElevM: number;    // MSL elevation of top
  lightedAtNight: boolean;
  markedByDay: boolean;
  remarks?: string;
}

// ─── Flight Plan ─────────────────────────────────────────────────────────────

export type FlightRules = "IFR" | "VFR" | "SVFR" | "DVFR";
export type FlightType = "S" | "N" | "G" | "M" | "X";  // Scheduled / Non-sched / GA / Military / Other

export interface FlightPlanWaypoint extends Waypoint {
  /** Planned altitude at this waypoint (m MSL) */
  plannedAltM: number;
  /** Planned indicated airspeed (kt) */
  plannedIasKt: number;
  /** Distance from previous waypoint (nm) */
  legDistNm: number;
  /** Track from previous waypoint (degrees true) */
  legTrackDeg: number;
  /** Estimated time over fix (seconds from departure) */
  etoSec: number;
  /** Wind correction angle (degrees) */
  wcaDeg: number;
  /** Magnetic heading (degrees) */
  magHdgDeg: number;
  /** Fuel remaining at this waypoint (kg) */
  fuelRemainingKg: number;
}

export interface FlightPlanFull {
  id: string;
  callsign: string;
  rules: FlightRules;
  flightType: FlightType;
  aircraftType: string;
  departureIcao: string;
  destinationIcao: string;
  alternateIcao: string | null;
  alternate2Icao: string | null;
  /** Planned departure time (ISO-8601) */
  eobt: string;
  cruiseAltM: number;
  cruiseSpeedKt: number;
  waypoints: FlightPlanWaypoint[];
  totalDistanceNm: number;
  totalTimeSec: number;
  fuelRequiredKg: number;
  fuelReserveKg: number;
  fuelAlternateKg: number;
  fuelContingencyKg: number;
  route: string;  // ICAO route string e.g. "DCT KINDA/N0130F070 DCT VNKT"
  remarks: string;
}

// ─── ATC ─────────────────────────────────────────────────────────────────────

export type ATCFacilityType = "TOWER" | "APPROACH" | "CENTER" | "GROUND" | "DELIVERY";

export interface ATCFacility {
  id: string;
  name: string;
  type: ATCFacilityType;
  icaoRegion: string;
  lat: number;
  lng: number;
  /** Service area radius (nm) */
  serviceRadiusNm: number;
  /** Lower limit altitude (m MSL) */
  lowerLimitM: number;
  /** Upper limit altitude (m MSL) */
  upperLimitM: number;
  primaryFreqMhz: number;
  secondaryFreqMhz?: number;
  active: boolean;
}

// ─── Navigation Manager Events ────────────────────────────────────────────────

export type NavEvent =
  | "waypoint_sequenced"
  | "destination_reached"
  | "airspace_entered"
  | "airspace_exited"
  | "terrain_alert"
  | "obstacle_alert"
  | "gps_fix_lost"
  | "gps_fix_acquired"
  | "ils_capture"
  | "missed_approach"
  | "route_loaded"
  | "route_cleared"
  | "direct_to_set";

export interface NavEventPayload {
  event: NavEvent;
  timestamp: number;
  data?: Record<string, unknown>;
}
