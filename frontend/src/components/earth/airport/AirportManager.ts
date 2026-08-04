import { AirportLoader } from "./AirportLoader";
import { AirportNavigation } from "./AirportNavigation";
import { AirportCollision } from "./AirportCollision";
import { AirportWeather } from "./AirportWeather";
import { AirportLOD } from "./AirportLOD";
import { TIA_LAYOUT } from "./data";
import type { AirportLayout, AirportLightingState } from "./types";
import type { WeatherObservation } from "../weather/types";

export class AirportManager {
  private readonly loader = new AirportLoader();
  private readonly navigation = new AirportNavigation(TIA_LAYOUT);
  private readonly collision = new AirportCollision(TIA_LAYOUT);
  private readonly weather = new AirportWeather();
  private readonly lod = new AirportLOD();
  private layout: AirportLayout = TIA_LAYOUT;
  private lighting: AirportLightingState = {
    night: false,
    wetRunway: false,
    visibilityM: 20_000,
    cloudCover: 0.2,
    windSpeedMs: 2.5,
    windFromDeg: 180,
    temperatureC: 22,
  };

  async init(weather: WeatherObservation | null): Promise<AirportLayout> {
    this.layout = await this.loader.load();
    this.lighting = this.weather.buildLighting(weather);
    return this.layout;
  }

  getLayout(): AirportLayout {
    return this.layout;
  }

  getNavigation(): AirportNavigation {
    return this.navigation;
  }

  getCollision(): AirportCollision {
    return this.collision;
  }

  getLod(): AirportLOD {
    return this.lod;
  }

  getLighting(): AirportLightingState {
    return this.lighting;
  }
}
