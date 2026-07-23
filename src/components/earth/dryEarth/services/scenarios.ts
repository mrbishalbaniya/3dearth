/**
 * Future-ready data services — swap implementations without refactoring UI.
 * Historical sea levels, ice age, climate, Mars/Moon terrain, currents, etc.
 */

export type PlanetId = "earth" | "mars" | "moon";

export interface ScenarioDefinition {
  id: string;
  label: string;
  planet: PlanetId;
  /** Sea level offset meters (Earth) or datum offset. */
  seaLevelM: number;
  epochYear?: number;
  description: string;
}

export const FUTURE_SCENARIOS: ScenarioDefinition[] = [
  {
    id: "lgm",
    label: "Last Glacial Maximum",
    planet: "earth",
    seaLevelM: -120,
    epochYear: -21000,
    description: "Ice Age lowstand ~21 ka",
  },
  {
    id: "holocene_high",
    label: "Holocene Highstand",
    planet: "earth",
    seaLevelM: 2,
    epochYear: -6000,
    description: "Mid-Holocene warm period",
  },
  {
    id: "rcp85_2100",
    label: "Climate +2 m (2100)",
    planet: "earth",
    seaLevelM: 2,
    epochYear: 2100,
    description: "Illustrative high-end rise scenario",
  },
  {
    id: "mars_datum",
    label: "Mars Areoid",
    planet: "mars",
    seaLevelM: 0,
    description: "Future Mars terrain datum",
  },
  {
    id: "moon_datum",
    label: "Lunar Mean",
    planet: "moon",
    seaLevelM: 0,
    description: "Future Moon terrain datum",
  },
];

export interface ElevationProvider {
  id: string;
  sample(lat: number, lng: number, z?: number): Promise<number>;
}

/** Placeholder for GEBCO / ETOPO / SRTM provider swap. */
export const elevationProviders: Record<string, ElevationProvider> = {
  terrarium: {
    id: "terrarium",
    async sample(lat, lng, z = 10) {
      const { sampleElevation } = await import(
        "../../streaming/ElevationService"
      );
      return sampleElevation(lat, lng, z);
    },
  },
};

export async function resolveScenarioSeaLevel(
  scenarioId: string,
): Promise<number | null> {
  const s = FUTURE_SCENARIOS.find((x) => x.id === scenarioId);
  return s ? s.seaLevelM : null;
}
