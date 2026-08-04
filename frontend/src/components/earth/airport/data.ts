import type { AirportLayout, AirportPosition, AirportObjectPalette, RunwayDefinition, StandDefinition, TaxiwayDefinition } from "./types";
import { Color } from "three";

export const TIA_AIRPORT: AirportPosition = {
  lat: 27.6966,
  lng: 85.3591,
  elevM: 1338,
};

export const TIA_RUNWAY: RunwayDefinition = {
  ident: "02",
  oppositeIdent: "20",
  headingDeg: 20,
  lengthM: 3050,
  widthM: 45,
  surface: "asphalt",
};

export const TIA_TAXIWAYS: TaxiwayDefinition[] = [
  { name: "A", widthM: 23, lengthM: 620, offsetXM: -180, offsetZM: -240, headingDeg: 20 },
  { name: "B", widthM: 23, lengthM: 730, offsetXM: 145, offsetZM: -210, headingDeg: 20 },
  { name: "C", widthM: 18, lengthM: 280, offsetXM: 90, offsetZM: 460, headingDeg: 110 },
  { name: "D", widthM: 18, lengthM: 260, offsetXM: -110, offsetZM: 430, headingDeg: 110 },
  { name: "E", widthM: 18, lengthM: 180, offsetXM: 250, offsetZM: 220, headingDeg: 110 },
];

export const TIA_STANDS: StandDefinition[] = [
  { id: "gate-1", type: "gate", offsetXM: -320, offsetZM: -360, headingDeg: 200 },
  { id: "gate-2", type: "gate", offsetXM: -270, offsetZM: -360, headingDeg: 200 },
  { id: "gate-3", type: "gate", offsetXM: -220, offsetZM: -360, headingDeg: 200 },
  { id: "gate-4", type: "gate", offsetXM: -170, offsetZM: -360, headingDeg: 200 },
  { id: "gate-5", type: "gate", offsetXM: -120, offsetZM: -360, headingDeg: 200 },
  { id: "gate-6", type: "gate", offsetXM: -70, offsetZM: -360, headingDeg: 200 },
  { id: "remote-1", type: "remote", offsetXM: 260, offsetZM: -470, headingDeg: 20 },
  { id: "remote-2", type: "remote", offsetXM: 320, offsetZM: -520, headingDeg: 20 },
  { id: "cargo-1", type: "cargo", offsetXM: 430, offsetZM: 220, headingDeg: 110 },
  { id: "helipad-1", type: "helicopter", offsetXM: 520, offsetZM: 40, headingDeg: 0 },
  { id: "fuel-1", type: "fuel", offsetXM: 390, offsetZM: 360, headingDeg: 90 },
];

export const TIA_LAYOUT: AirportLayout = {
  position: TIA_AIRPORT,
  runway: TIA_RUNWAY,
  taxiways: TIA_TAXIWAYS,
  stands: TIA_STANDS,
  gateCount: 6,
};

export const TIA_PALETTE: AirportObjectPalette = {
  runway: new Color("#2e3136"),
  runwayPaint: new Color("#f5f1d0"),
  lights: new Color("#d7f2ff"),
  taxiway: new Color("#474b51"),
  apron: new Color("#585d62"),
  terminal: new Color("#cfd6db"),
  tower: new Color("#d9dde2"),
  service: new Color("#8c9399"),
  signs: new Color("#ffd54f"),
  vegetation: new Color("#2f5a37"),
};
