export type AirportDetailTier = "ultra" | "high" | "medium" | "low";

export interface AirportLodDecision {
  terminalTier: AirportDetailTier;
  towerTier: AirportDetailTier;
  apronTier: AirportDetailTier;
  showInterior: boolean;
  showGroundVehicles: boolean;
  showDebug: boolean;
}

export class AirportLOD {
  decide(cameraDistance: number, isFlightMode: boolean): AirportLodDecision {
    const close = cameraDistance < 1.5 || isFlightMode;
    const mid = cameraDistance < 2.5;
    const far = cameraDistance >= 3.5;

    return {
      terminalTier: close ? "ultra" : mid ? "high" : far ? "low" : "medium",
      towerTier: close ? "high" : mid ? "medium" : "low",
      apronTier: close ? "ultra" : mid ? "high" : "medium",
      showInterior: close,
      showGroundVehicles: close || mid,
      showDebug: isFlightMode,
    };
  }
}
