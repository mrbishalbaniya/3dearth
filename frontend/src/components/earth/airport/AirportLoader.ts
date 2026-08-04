import { TIA_LAYOUT } from "./data";
import type { AirportLayout } from "./types";

export class AirportLoader {
  private loaded = false;
  private layout: AirportLayout = TIA_LAYOUT;

  async load(): Promise<AirportLayout> {
    this.loaded = true;
    return this.layout;
  }

  get isLoaded(): boolean {
    return this.loaded;
  }

  getLayout(): AirportLayout {
    return this.layout;
  }
}
