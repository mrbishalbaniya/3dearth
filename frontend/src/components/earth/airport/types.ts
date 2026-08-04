import type { Color, Vector3 } from "three";

export interface AirportPosition {
  lat: number;
  lng: number;
  elevM: number;
}

export interface RunwayDefinition {
  ident: string;
  oppositeIdent: string;
  headingDeg: number;
  lengthM: number;
  widthM: number;
  surface: "asphalt" | "concrete" | "composite";
}

export interface TaxiwayDefinition {
  name: string;
  widthM: number;
  lengthM: number;
  offsetXM: number;
  offsetZM: number;
  headingDeg: number;
}

export interface StandDefinition {
  id: string;
  type: "gate" | "remote" | "cargo" | "helicopter" | "fuel";
  offsetXM: number;
  offsetZM: number;
  headingDeg: number;
}

export interface AirportBuildingLOD {
  distance: number;
  detail: "low" | "medium" | "high";
}

export interface AirportLightingState {
  night: boolean;
  wetRunway: boolean;
  visibilityM: number;
  cloudCover: number;
  windSpeedMs: number;
  windFromDeg: number;
  temperatureC: number;
}

export interface AirportDebugState {
  showRunwayBounds: boolean;
  showTaxiGraph: boolean;
  showParkingNodes: boolean;
  showAircraftPaths: boolean;
  showLoadedAssets: boolean;
}

export interface AirportFrame {
  origin: Vector3;
  up: Vector3;
  east: Vector3;
  north: Vector3;
  quaternion: import("three").Quaternion;
}

export interface AirportLayout {
  position: AirportPosition;
  runway: RunwayDefinition;
  taxiways: TaxiwayDefinition[];
  stands: StandDefinition[];
  gateCount: number;
}

export interface AirportObjectPalette {
  runway: Color;
  runwayPaint: Color;
  lights: Color;
  taxiway: Color;
  apron: Color;
  terminal: Color;
  tower: Color;
  service: Color;
  signs: Color;
  vegetation: Color;
}
