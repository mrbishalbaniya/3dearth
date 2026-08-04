export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public debug(message: string, category?: string): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.debug(`[DEBUG]${category ? `[${category}]` : ''} ${message}`);
    }
  }

  public info(message: string, category?: string): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.info(`[INFO]${category ? `[${category}]` : ''} ${message}`);
    }
  }

  public warn(message: string, category?: string): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`[WARN]${category ? `[${category}]` : ''} ${message}`);
    }
  }

  public error(message: string, category?: string, error?: Error): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`[ERROR]${category ? `[${category}]` : ''} ${message}`, error || '');
    }
  }
}