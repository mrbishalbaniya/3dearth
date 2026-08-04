import type { AirportLayout } from "../../../earth/airport/types";
import { NavigationManager } from "./NavigationManager";

export class TaxiManager {
  constructor(private readonly nav: NavigationManager) {}

  getTaxiPath(startId: string, endId: string): string[] {
    return this.nav.buildTaxiPath(startId, endId);
  }

  speedLimitMs(weatherWet: boolean): number {
    return weatherWet ? 5 : 7;
  }

  holdShortNode(layout: AirportLayout, runwayId: string): string {
    const suffix = runwayId.slice(-2);
    return `hs-${suffix}`;
  }

  gateRoute(layout: AirportLayout, gateId: string): string[] {
    const start = gateId;
    const end = `hs-${layout.runway.ident ?? layout.runway.headingDeg.toString().slice(0, 2)}`;
    return this.getTaxiPath(start, end);
  }
}
