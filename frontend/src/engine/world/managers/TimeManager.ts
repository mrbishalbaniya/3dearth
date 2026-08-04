import type { EventSystem } from '../events/EventSystem';
import type { WorldEventMap } from '../events/WorldEventMap';
import type { Lifecycle, Updatable } from '../core/Lifecycle';

export class TimeManager implements Lifecycle, Updatable {
  private readonly events: EventSystem<WorldEventMap>;
  private day = 1;
  private hour = 12;
  private minute = 0;
  private timeScale = 60;
  private carrySeconds = 0;

  constructor(events: EventSystem<WorldEventMap>) {
    this.events = events;
  }

  public async initialize(): Promise<void> {
    return Promise.resolve();
  }

  public update(deltaTime: number): void {
    this.carrySeconds += deltaTime * this.timeScale;

    while (this.carrySeconds >= 60) {
      this.carrySeconds -= 60;
      this.minute += 1;

      if (this.minute >= 60) {
        this.minute = 0;
        this.hour += 1;
        this.events.emit('time:hour-changed', { hour: this.hour % 24 });
      }

      if (this.hour >= 24) {
        this.hour = 0;
        this.day += 1;
        this.events.emit('time:day-changed', { day: this.day });
      }
    }
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }

  public getTimeScale(): number {
    return this.timeScale;
  }

  public getTimeOfDayNormalized(): number {
    const totalMinutes = this.hour * 60 + this.minute;
    return totalMinutes / 1440;
  }

  public getClock(): { day: number; hour: number; minute: number } {
    return {
      day: this.day,
      hour: this.hour,
      minute: this.minute,
    };
  }

  public dispose(): void {
    this.carrySeconds = 0;
  }
}
