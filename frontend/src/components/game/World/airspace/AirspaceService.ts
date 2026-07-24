/**
 * Airspace classification around airports + crude FIR bands.
 * Ref: ICAO Annex 11 concepts (simplified geometry).
 */

export type AirspaceClass = "A" | "C" | "D" | "G" | "FIR";

export interface AirspaceVolume {
  id: string;
  klass: AirspaceClass;
  /** Airport-centric cylinder, or FIR label */
  airportIcao?: string;
  lat: number;
  lng: number;
  radiusNm: number;
  floorM: number;
  ceilingM: number;
  facility: "ground" | "tower" | "departure" | "approach" | "center" | "unicom";
}

export function buildAirportAirspace(
  icao: string,
  lat: number,
  lng: number,
): AirspaceVolume[] {
  return [
    {
      id: `${icao}-atz`,
      klass: "D",
      airportIcao: icao,
      lat,
      lng,
      radiusNm: 5,
      floorM: 0,
      ceilingM: 900,
      facility: "tower",
    },
    {
      id: `${icao}-tma`,
      klass: "C",
      airportIcao: icao,
      lat,
      lng,
      radiusNm: 40,
      floorM: 0,
      ceilingM: 6000,
      facility: "approach",
    },
    {
      id: `${icao}-dep`,
      klass: "C",
      airportIcao: icao,
      lat,
      lng,
      radiusNm: 25,
      floorM: 450,
      ceilingM: 5000,
      facility: "departure",
    },
  ];
}

export function facilityForPosition(
  volumes: AirspaceVolume[],
  lat: number,
  lng: number,
  altM: number,
  onGround: boolean,
): AirspaceVolume["facility"] {
  if (onGround) return "ground";
  let best: AirspaceVolume | null = null;
  let bestR = Infinity;
  for (const v of volumes) {
    if (altM < v.floorM || altM > v.ceilingM) continue;
    const dNm =
      Math.hypot(v.lat - lat, v.lng - lng) * 60; // deg≈nm lat
    if (dNm <= v.radiusNm && v.radiusNm < bestR) {
      best = v;
      bestR = v.radiusNm;
    }
  }
  if (!best) return "center";
  return best.facility;
}

export function frequencyForFacility(
  facility: AirspaceVolume["facility"],
): number {
  switch (facility) {
    case "ground":
      return 121.7;
    case "tower":
      return 118.7;
    case "departure":
      return 124.3;
    case "approach":
      return 119.1;
    case "center":
      return 128.5;
    default:
      return 122.8;
  }
}
