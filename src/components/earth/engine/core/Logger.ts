/**
 * Structured logging — scoped, level-filtered, debug-friendly.
 */
import type { EngineLogger } from "./types";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

export class Logger implements EngineLogger {
  constructor(
    private level: LogLevel = "info",
    private prefix = "[EarthEngine]",
  ) {}

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private ok(level: LogLevel) {
    return LEVEL_RANK[level] >= LEVEL_RANK[this.level];
  }

  debug(scope: string, message: string, data?: unknown) {
    if (!this.ok("debug")) return;
    if (data !== undefined) console.debug(`${this.prefix}:${scope}`, message, data);
    else console.debug(`${this.prefix}:${scope}`, message);
  }

  info(scope: string, message: string, data?: unknown) {
    if (!this.ok("info")) return;
    if (data !== undefined) console.info(`${this.prefix}:${scope}`, message, data);
    else console.info(`${this.prefix}:${scope}`, message);
  }

  warn(scope: string, message: string, data?: unknown) {
    if (!this.ok("warn")) return;
    if (data !== undefined) console.warn(`${this.prefix}:${scope}`, message, data);
    else console.warn(`${this.prefix}:${scope}`, message);
  }

  error(scope: string, message: string, data?: unknown) {
    if (!this.ok("error")) return;
    if (data !== undefined) console.error(`${this.prefix}:${scope}`, message, data);
    else console.error(`${this.prefix}:${scope}`, message);
  }
}
