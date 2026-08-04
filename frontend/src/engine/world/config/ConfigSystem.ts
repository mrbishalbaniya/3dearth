import type { WorldEngineConfig } from './WorldConfig';
import type { EventSystem } from '../events/EventSystem';
import type { WorldEventMap } from '../events/WorldEventMap';

export class ConfigSystem {
  private config: WorldEngineConfig;
  private readonly events: EventSystem<WorldEventMap>;

  constructor(initialConfig: WorldEngineConfig, events: EventSystem<WorldEventMap>) {
    this.config = initialConfig;
    this.events = events;
  }

  public get<K extends keyof WorldEngineConfig>(key: K): WorldEngineConfig[K] {
    return this.config[key];
  }

  public set<K extends keyof WorldEngineConfig>(key: K, value: WorldEngineConfig[K]): void {
    this.config = {
      ...this.config,
      [key]: value,
    };
    this.events.emit('config:changed', { key: String(key), value });
  }

  public patch(patch: Partial<WorldEngineConfig>): void {
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        this.events.emit('config:changed', { key, value });
      }
    }
    this.config = {
      ...this.config,
      ...patch,
    };
  }

  public getAll(): WorldEngineConfig {
    return this.config;
  }
}
