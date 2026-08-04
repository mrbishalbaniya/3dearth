/**
 * Nepal Airspace & Navigation System — public API barrel.
 * Import from this file to access all navigation sub-systems.
 */

// ─── Core singletons ──────────────────────────────────────────────────────────
export { navigationManager }                   from "./NavigationManager";
export { navigationComputer }                  from "./NavigationComputer";
export { autopilotManager }                    from "./AutopilotManager";
export { gpsManager }                          from "./GPSManager";
export { radioNav }                            from "./RadioNavigation";
export { terrainAwareness }                    from "./TerrainAwareness";
export { airspaceManager }                     from "./AirspaceManager";
export { waypointManager }                     from "./WaypointManager";
export { airportDb, getNepalAirport }          from "./AirportDatabase";
export { obstacleDb }                          from "./ObstacleDatabase";
export { flightPlanner }                       from "./FlightPlanner";
export { routeGenerator }                      from "./RouteGenerator";
export { atcManager }                          from "./ATCManager";
export { aiTrafficManager }                    from "./AINavigator";

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useNavigationSystem }                 from "./useNavigationSystem";
export type { NavigationSystemHandle }         from "./useNavigationSystem";

// ─── React components ─────────────────────────────────────────────────────────
export { NavigationOverlay }                   from "./NavigationOverlay";
export { NavigationPanel }                     from "./NavigationPanel";
export { NavigationMapLayer }                  from "./NavigationMapLayer";
export { NavigationDebugPanel }                from "./NavigationDebugPanel";

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Waypoint,
  WaypointType,
  HoldingPattern,
  Navaid,
  NavaidType,
  ILSSystem,
  MarkerBeacon,
  AirspaceBoundary,
  AirspaceType,
  AirspaceClass,
  AirspaceAltitude,
  NepalAirportExtended,
  NepalRunway,
  AirportFrequency,
  InstrumentApproach,
  ParkingPosition,
  GPSPosition,
  GPSConfig,
  NavSource,
  NavPhase,
  CourseDeviationIndicator,
  NavigationState,
  AutopilotFullState,
  AutopilotLateralMode,
  AutopilotVerticalMode,
  AutopilotSpeedMode,
  TerrainAlert,
  TerrainAlertLevel,
  TerrainAwarenessState,
  Obstacle,
  ObstacleType,
  FlightPlanFull,
  FlightPlanWaypoint,
  FlightRules,
  ATCFacility,
  ATCFacilityType,
  NavEvent,
  NavEventPayload,
  LatLng,
  LatLngAlt,
}                                              from "./NavigationTypes";

export type { NavigationOutput }               from "./NavigationManager";
export type { GeneratedRoute }                 from "./RouteGenerator";
export type { ATCClearance, TrafficContact }   from "./ATCManager";
export type { AINavState, AIFlightProfile }    from "./AINavigator";

// ─── Math utilities (re-export for convenience) ────────────────────────────────
export {
  haversineNm,
  haversineM,
  initialBearingDeg,
  greatCircleWaypoints,
  crossTrackErrorM,
  etaSeconds,
  geodeticToEcef,
  horizonDistanceM,
}                                              from "./greatCircle";
