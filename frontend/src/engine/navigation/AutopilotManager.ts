import { Vector3 } from '@babylonjs/core';
import { NavigationState } from './NavigationManager';

export interface AutopilotSettings {
  headingHold: boolean;
  altitudeHold: boolean;
  verticalSpeedHold: boolean;
  navigationTracking: boolean;
  gpsTracking: boolean;
  approachMode: boolean;
  targetHeading: number;
  targetAltitude: number;
  targetVerticalSpeed: number;
  altitudeTolerance: number;
  headingTolerance: number;
  verticalSpeedTolerance: number;
}

export interface AutopilotCommands {
  pitchCommand: number;
  rollCommand: number;
  yawCommand: number;
  throttleCommand: number;
}

export interface AutopilotStatus {
  isEngaged: boolean;
  activeMode: AutopilotMode;
  activeModes: AutopilotMode[];
  targetValues: TargetValues;
  deviations: Deviations;
  isArmed: boolean;
}

export interface TargetValues {
  heading: number;
  altitude: number;
  verticalSpeed: number;
  course: number;
  glideslope: number;
  localizer: number;
}

export interface Deviations {
  headingError: number;
  altitudeError: number;
  verticalSpeedError: number;
  courseError: number;
  glideslopeError: number;
  localizerError: number;
}

export enum AutopilotMode {
  HEADING_HOLD = 'HDG',
  ALTITUDE_HOLD = 'ALT',
  VERTICAL_SPEED = 'VS',
  NAVIGATION = 'NAV',
  GPS = 'GPS',
  APPROACH = 'APR',
  LOCALIZER = 'LOC',
  GLIDESLOPE = 'GS',
  BACKCOURSE = 'BC',
  VNAV = 'VNAV'
}

export class AutopilotManager {
  private settings: AutopilotSettings;
  private commands: AutopilotCommands;
  private status: AutopilotStatus;
  private navigationState: NavigationState | null;
  private isActive: boolean;
  private updateInterval: number;
  private pidControllers: Map<string, PIDController>;

  constructor() {
    this.isActive = false;
    this.navigationState = null;
    this.updateInterval = 0;

    this.settings = {
      headingHold: false,
      altitudeHold: false,
      verticalSpeedHold: false,
      navigationTracking: false,
      gpsTracking: false,
      approachMode: false,
      targetHeading: 0,
      targetAltitude: 0,
      targetVerticalSpeed: 0,
      altitudeTolerance: 50,
      headingTolerance: 2,
      verticalSpeedTolerance: 50
    };

    this.commands = {
      pitchCommand: 0,
      rollCommand: 0,
      yawCommand: 0,
      throttleCommand: 0
    };

    this.status = {
      isEngaged: false,
      activeMode: AutopilotMode.HEADING_HOLD,
      activeModes: [],
      targetValues: {
        heading: 0,
        altitude: 0,
        verticalSpeed: 0,
        course: 0,
        glideslope: 0,
        localizer: 0
      },
      deviations: {
        headingError: 0,
        altitudeError: 0,
        verticalSpeedError: 0,
        courseError: 0,
        glideslopeError: 0,
        localizerError: 0
      },
      isArmed: false
    };

    this.pidControllers = new Map();
    this.initializePIDControllers();
  }
  private initializePIDControllers(): void {
    this.pidControllers.set('heading', new PIDController(2.0, 0.1, 0.5, -30, 30));
    this.pidControllers.set('altitude', new PIDController(0.5, 0.02, 0.1, -10, 10));
    this.pidControllers.set('verticalSpeed', new PIDController(0.3, 0.01, 0.05, -5, 5));
    this.pidControllers.set('course', new PIDController(1.5, 0.08, 0.3, -25, 25));
    this.pidControllers.set('glideslope', new PIDController(1.0, 0.05, 0.2, -8, 8));
    this.pidControllers.set('localizer', new PIDController(2.5, 0.15, 0.6, -30, 30));
  }

  public initialize(): void {
    if (this.isActive) return;
    this.startUpdateLoop();
    this.isActive = true;
  }

  public shutdown(): void {
    if (!this.isActive) return;
    this.stopUpdateLoop();
    this.disengage();
    this.isActive = false;
  }

  private startUpdateLoop(): void {
    this.updateInterval = window.setInterval(() => {
      this.updateAutopilot();
    }, 50);
  }

  private stopUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = 0;
    }
  }

  public update(navigationState: NavigationState): void {
    this.navigationState = navigationState;
  }

  private updateAutopilot(): void {
    if (!this.status.isEngaged || !this.navigationState) return;

    this.updateDeviations();
    this.updateActiveModes();
    this.computeControlCommands();
    this.updateStatus();
  }

  private updateDeviations(): void {
    if (!this.navigationState) return;

    this.status.deviations.headingError = 
      this.calculateHeadingError(this.status.targetValues.heading, this.navigationState.heading);
    
    this.status.deviations.altitudeError = 
      this.status.targetValues.altitude - this.navigationState.altitude;
    
    this.status.deviations.verticalSpeedError = 
      this.status.targetValues.verticalSpeed - this.navigationState.verticalSpeed;
    
    this.status.deviations.courseError = 
      this.calculateHeadingError(this.status.targetValues.course, this.navigationState.course);
  }

  private calculateHeadingError(target: number, current: number): number {
    let error = target - current;
    
    if (error > 180) error -= 360;
    if (error < -180) error += 360;
    
    return error;
  }

  private updateActiveModes(): void {
    this.status.activeModes = [];

    if (this.settings.headingHold) {
      this.status.activeModes.push(AutopilotMode.HEADING_HOLD);
    }
    if (this.settings.altitudeHold) {
      this.status.activeModes.push(AutopilotMode.ALTITUDE_HOLD);
    }
    if (this.settings.verticalSpeedHold) {
      this.status.activeModes.push(AutopilotMode.VERTICAL_SPEED);
    }
    if (this.settings.navigationTracking) {
      this.status.activeModes.push(AutopilotMode.NAVIGATION);
    }
    if (this.settings.gpsTracking) {
      this.status.activeModes.push(AutopilotMode.GPS);
    }
    if (this.settings.approachMode) {
      this.status.activeModes.push(AutopilotMode.APPROACH);
    }

    this.status.activeMode = this.status.activeModes[0] || AutopilotMode.HEADING_HOLD;
  }
  private computeControlCommands(): void {
    this.commands.pitchCommand = 0;
    this.commands.rollCommand = 0;
    this.commands.yawCommand = 0;
    this.commands.throttleCommand = 0;

    if (this.settings.headingHold || this.settings.navigationTracking || this.settings.gpsTracking) {
      const headingPID = this.pidControllers.get('heading')!;
      this.commands.rollCommand = headingPID.compute(this.status.deviations.headingError);
    }

    if (this.settings.altitudeHold) {
      const altitudePID = this.pidControllers.get('altitude')!;
      this.commands.pitchCommand = altitudePID.compute(this.status.deviations.altitudeError);
      
      this.commands.throttleCommand = this.computeThrottleForAltitude();
    }

    if (this.settings.verticalSpeedHold) {
      const vsPID = this.pidControllers.get('verticalSpeed')!;
      this.commands.pitchCommand = vsPID.compute(this.status.deviations.verticalSpeedError);
    }

    if (this.settings.approachMode) {
      this.computeApproachCommands();
    }

    this.limitCommands();
  }

  private computeThrottleForAltitude(): number {
    if (!this.navigationState) return 0;

    const altitudeError = this.status.deviations.altitudeError;
    const baseThrottle = 0.7;
    const throttleAdjustment = Math.max(-0.2, Math.min(0.2, altitudeError / 1000));
    
    return baseThrottle + throttleAdjustment;
  }

  private computeApproachCommands(): void {
    const glideslopePID = this.pidControllers.get('glideslope')!;
    const localizerPID = this.pidControllers.get('localizer')!;

    this.commands.pitchCommand += glideslopePID.compute(this.status.deviations.glideslopeError);
    this.commands.rollCommand += localizerPID.compute(this.status.deviations.localizerError);
  }

  private limitCommands(): void {
    this.commands.pitchCommand = Math.max(-15, Math.min(15, this.commands.pitchCommand));
    this.commands.rollCommand = Math.max(-30, Math.min(30, this.commands.rollCommand));
    this.commands.yawCommand = Math.max(-10, Math.min(10, this.commands.yawCommand));
    this.commands.throttleCommand = Math.max(0, Math.min(1, this.commands.throttleCommand));
  }

  private updateStatus(): void {
    this.status.targetValues.heading = this.settings.targetHeading;
    this.status.targetValues.altitude = this.settings.targetAltitude;
    this.status.targetValues.verticalSpeed = this.settings.targetVerticalSpeed;
  }

  public engage(): void {
    if (!this.navigationState) return;

    this.status.isEngaged = true;
    this.status.isArmed = true;

    this.settings.targetHeading = this.navigationState.heading;
    this.settings.targetAltitude = this.navigationState.altitude;
    this.settings.targetVerticalSpeed = 0;

    this.resetPIDControllers();
  }

  public disengage(): void {
    this.status.isEngaged = false;
    this.status.isArmed = false;
    
    this.settings.headingHold = false;
    this.settings.altitudeHold = false;
    this.settings.verticalSpeedHold = false;
    this.settings.navigationTracking = false;
    this.settings.gpsTracking = false;
    this.settings.approachMode = false;

    this.resetCommands();
    this.resetPIDControllers();
  }
  private resetCommands(): void {
    this.commands.pitchCommand = 0;
    this.commands.rollCommand = 0;
    this.commands.yawCommand = 0;
    this.commands.throttleCommand = 0;
  }

  private resetPIDControllers(): void {
    for (const controller of this.pidControllers.values()) {
      controller.reset();
    }
  }

  public setHeadingHold(heading: number): void {
    this.settings.headingHold = true;
    this.settings.targetHeading = heading;
    this.settings.navigationTracking = false;
    this.settings.gpsTracking = false;
  }

  public setAltitudeHold(altitude: number): void {
    this.settings.altitudeHold = true;
    this.settings.targetAltitude = altitude;
    this.settings.verticalSpeedHold = false;
  }

  public setVerticalSpeedHold(verticalSpeed: number): void {
    this.settings.verticalSpeedHold = true;
    this.settings.targetVerticalSpeed = verticalSpeed;
    this.settings.altitudeHold = false;
  }

  public setNavigationTracking(enabled: boolean): void {
    this.settings.navigationTracking = enabled;
    if (enabled) {
      this.settings.headingHold = false;
      this.settings.gpsTracking = false;
    }
  }

  public setGPSTracking(enabled: boolean): void {
    this.settings.gpsTracking = enabled;
    if (enabled) {
      this.settings.headingHold = false;
      this.settings.navigationTracking = false;
    }
  }

  public setApproachMode(enabled: boolean): void {
    this.settings.approachMode = enabled;
    if (enabled) {
      this.settings.navigationTracking = true;
      this.settings.altitudeHold = false;
    }
  }

  public getCommands(): AutopilotCommands {
    return { ...this.commands };
  }

  public getStatus(): AutopilotStatus {
    return { ...this.status };
  }

  public getSettings(): AutopilotSettings {
    return { ...this.settings };
  }

  public isEngaged(): boolean {
    return this.status.isEngaged;
  }

  public getActiveMode(): AutopilotMode {
    return this.status.activeMode;
  }

  public getActiveModes(): AutopilotMode[] {
    return [...this.status.activeModes];
  }
}

class PIDController {
  private kp: number;
  private ki: number;
  private kd: number;
  private minOutput: number;
  private maxOutput: number;
  private integral: number;
  private previousError: number;
  private lastTime: number;

  constructor(kp: number, ki: number, kd: number, minOutput: number, maxOutput: number) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.minOutput = minOutput;
    this.maxOutput = maxOutput;
    this.integral = 0;
    this.previousError = 0;
    this.lastTime = Date.now();
  }

  public compute(error: number): number {
    const now = Date.now();
    const deltaTime = (now - this.lastTime) / 1000;
    
    if (deltaTime <= 0) return 0;

    this.integral += error * deltaTime;
    this.integral = Math.max(-1000, Math.min(1000, this.integral));

    const derivative = (error - this.previousError) / deltaTime;
    
    const output = (this.kp * error) + (this.ki * this.integral) + (this.kd * derivative);
    
    this.previousError = error;
    this.lastTime = now;
    
    return Math.max(this.minOutput, Math.min(this.maxOutput, output));
  }

  public reset(): void {
    this.integral = 0;
    this.previousError = 0;
    this.lastTime = Date.now();
  }
}