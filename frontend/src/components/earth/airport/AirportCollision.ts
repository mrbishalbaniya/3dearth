import { Vector3 } from "three";
import { createAirportFrame } from "./airportMath";
import { TIA_LAYOUT } from "./data";
import type { AirportFrame, AirportLayout } from "./types";

export interface AirportCollisionHit {
  onRunway: boolean;
  onApron: boolean;
  onTaxiway: boolean;
  aboveGroundM: number;
  runwayDistanceM: number;
}

export class AirportCollision {
  private readonly layout: AirportLayout;
  private readonly frame: AirportFrame;

  constructor(layout: AirportLayout = TIA_LAYOUT) {
    this.layout = layout;
    this.frame = createAirportFrame(
      layout.position.lat,
      layout.position.lng,
      layout.runway.headingDeg,
    );
  }

  getFrame(): AirportFrame {
    return this.frame;
  }

  private toLocal(position: Vector3): { x: number; z: number } {
    const right = new Vector3().crossVectors(this.frame.north, this.frame.up).normalize();
    const delta = position.clone().sub(this.frame.origin);
    return {
      x: delta.dot(right) * 6_371_000,
      z: delta.dot(this.frame.north) * 6_371_000,
    };
  }

  sample(position: Vector3, altitudeM: number): AirportCollisionHit {
    const local = this.toLocal(position);
    const runwayHalfWidth = this.layout.runway.widthM / 2;
    const runwayHalfLength = this.layout.runway.lengthM / 2;
    const runwayX = Math.abs(local.x);
    const runwayZ = Math.abs(local.z);
    const runwayDistanceM = Math.max(0, Math.hypot(runwayX - runwayHalfWidth, runwayZ - runwayHalfLength));

    const onRunway = runwayX <= runwayHalfWidth && runwayZ <= runwayHalfLength;
    const onApron = local.x < 800 && local.x > -700 && local.z < 900 && local.z > -950;
    const onTaxiway = !onRunway && Math.abs(local.x) < 500 && Math.abs(local.z) < 1000;

    return {
      onRunway,
      onApron,
      onTaxiway,
      aboveGroundM: altitudeM,
      runwayDistanceM,
    };
  }

  getLandingClearance(position: Vector3, altitudeM: number): boolean {
    const hit = this.sample(position, altitudeM);
    return hit.onRunway || hit.onApron || hit.onTaxiway;
  }
}
