import { Matrix4, Quaternion, Vector3 } from "three";
import { EARTH_RADIUS } from "../utils/constants";
import { latLngToVector3 } from "../utils/geo";
import type { AirportFrame } from "./types";

export const METERS_TO_SCENE = 1 / 6_371_000;

export function metersToScene(meters: number): number {
  return meters * METERS_TO_SCENE;
}

export function createAirportFrame(
  lat: number,
  lng: number,
  headingDeg: number,
): AirportFrame {
  const origin = latLngToVector3(lat, lng, EARTH_RADIUS + metersToScene(2));
  const up = origin.clone().normalize();
  const worldNorth = new Vector3(0, 1, 0);
  let east = new Vector3().crossVectors(worldNorth, up);
  if (east.lengthSq() < 1e-6) {
    east = new Vector3(1, 0, 0);
  } else {
    east.normalize();
  }
  const north = new Vector3().crossVectors(up, east).normalize();

  const heading = (headingDeg * Math.PI) / 180;
  const runwayDir = north.clone().multiplyScalar(Math.cos(heading)).addScaledVector(east, Math.sin(heading)).normalize();
  const runwayRight = new Vector3().crossVectors(runwayDir, up).normalize();

  const basis = new Matrix4().makeBasis(runwayRight, up, runwayDir.clone().negate());
  const quaternion = new Quaternion().setFromRotationMatrix(basis);

  return { origin, up, east, north: runwayDir, quaternion };
}

export function offsetToWorld(
  frame: AirportFrame,
  offsetXM: number,
  offsetZM: number,
  elevationM = 0,
  target = new Vector3(),
): Vector3 {
  const right = new Vector3().crossVectors(frame.north, frame.up).normalize();
  const up = frame.up.clone();
  const forward = frame.north.clone();
  return target
    .copy(frame.origin)
    .addScaledVector(right, metersToScene(offsetXM))
    .addScaledVector(forward, metersToScene(offsetZM))
    .addScaledVector(up, metersToScene(elevationM));
}
