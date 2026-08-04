import { Vector3 } from '@babylonjs/core';
import { NavigationState } from './NavigationManager';

export interface NavigationData {
  position: Vector3;
  altitude: number;
  heading: number;
  track: number;
  groundSpeed: number;
  trueAirspeed: number;
  verticalSpeed: number;
  course: number;
  courseDeviation: number;
  distanceToWaypoint: number;
  bearingToWaypoint: number;
  etaToWaypoint: number;
  crossTrackError: number;
  desiredTrack: number;
}

export interface FlightData {
  totalDistance: number;
  distanceRemaining: number;
  timeEnroute: number;
  timeRemaining: number;
  fuelUsed: number;
  fuelRemaining: number;
  estimatedFuelAtDestination: number;
  averageGroundSpeed: number;
}

export interface WindData {
  direction: number;
  speed: number;
  headwindComponent: number;
  crosswindComponent: number;
}

export interface NavigationCalculations {
  magneticVariation: number;
  trueCourse: number;
  magneticCourse: number;
  compassCourse: number;
  windCorrectionAngle: number;
  driftAngle: number;
}

export class NavigationComputer {
  private navigationData: NavigationData;
  private flightData: FlightData;
  private windData: WindData;
  private calculations: NavigationCalculations;
  private waypointPosition: Vector3 | null;
  private routeStartTime: Date | null;
  private isActive: boolean;

  constructor() {
    this.isActive = false;
    this.waypointPosition = null;
    this.routeStartTime = null;

    this.navigationData = {
      position: Vector3.Zero(),
      altitude: 0,
      heading: 0,
      track: 0,
      groundSpeed: 0,
      trueAirspeed: 0,
      verticalSpeed: 0,
      course: 0,
      courseDeviation: 0,
      distanceToWaypoint: 0,
      bearingToWaypoint: 0,
      etaToWaypoint: 0,
      crossTrackError: 0,
      desiredTrack: 0
    };

    this.flightData = {
      totalDistance: 0,
      distanceRemaining: 0,
      timeEnroute: 0,
      timeRemaining: 0,
      fuelUsed: 0,
      fuelRemaining: 0,
      estimatedFuelAtDestination: 0,
      averageGroundSpeed: 0
    };

    this.windData = {
      direction: 270,
      speed: 10,
      headwindComponent: 0,
      crosswindComponent: 0
    };

    this.calculations = {
      magneticVariation: 0.5,
      trueCourse: 0,
      magneticCourse: 0,
      compassCourse: 0,
      windCorrectionAngle: 0,
      driftAngle: 0
    };
  }

  public initialize(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.routeStartTime = new Date();
  }

  public shutdown(): void {
    this.isActive = false;
  }
  public update(navigationState: NavigationState): void {
    if (!this.isActive) return;

    this.updateNavigationData(navigationState);
    this.updateFlightData();
    this.updateWindCalculations();
    this.updateNavigationCalculations();
  }

  private updateNavigationData(state: NavigationState): void {
    this.navigationData.position = state.position.clone();
    this.navigationData.altitude = state.altitude;
    this.navigationData.heading = state.heading;
    this.navigationData.groundSpeed = state.groundSpeed;
    this.navigationData.verticalSpeed = state.verticalSpeed;
    this.navigationData.course = state.course;
    this.navigationData.courseDeviation = state.courseDeviation;

    this.navigationData.track = this.calculateGroundTrack();
    this.navigationData.trueAirspeed = this.calculateTrueAirspeed();

    if (this.waypointPosition) {
      this.updateWaypointData();
    }
  }

  private calculateGroundTrack(): number {
    return (this.navigationData.heading + this.calculations.driftAngle) % 360;
  }

  private calculateTrueAirspeed(): number {
    const density = this.calculateAirDensity(this.navigationData.altitude);
    const seaLevelDensity = 1.225;
    return this.navigationData.groundSpeed * Math.sqrt(seaLevelDensity / density);
  }

  private calculateAirDensity(altitude: number): number {
    const temperature = 288.15 - (0.0065 * altitude);
    const pressure = 101325 * Math.pow(temperature / 288.15, 5.256);
    return pressure / (287.05 * temperature);
  }

  private updateWaypointData(): void {
    if (!this.waypointPosition) return;

    this.navigationData.distanceToWaypoint = this.calculateDistance(
      this.navigationData.position,
      this.waypointPosition
    );

    this.navigationData.bearingToWaypoint = this.calculateBearing(
      this.navigationData.position,
      this.waypointPosition
    );

    if (this.navigationData.groundSpeed > 0) {
      this.navigationData.etaToWaypoint = 
        (this.navigationData.distanceToWaypoint / this.navigationData.groundSpeed) * 60;
    }

    this.navigationData.crossTrackError = this.calculateCrossTrackError();
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const R = 6371;
    const lat1 = pos1.y * Math.PI / 180;
    const lat2 = pos2.y * Math.PI / 180;
    const deltaLat = (pos2.y - pos1.y) * Math.PI / 180;
    const deltaLon = (pos2.x - pos1.x) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateBearing(pos1: Vector3, pos2: Vector3): number {
    const lat1 = pos1.y * Math.PI / 180;
    const lat2 = pos2.y * Math.PI / 180;
    const deltaLon = (pos2.x - pos1.x) * Math.PI / 180;

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    return (bearing + 360) % 360;
  }

  private calculateCrossTrackError(): number {
    if (!this.waypointPosition) return 0;

    const distance = this.navigationData.distanceToWaypoint;
    const bearing = this.navigationData.bearingToWaypoint;
    const track = this.navigationData.track;

    const bearingDiff = (bearing - track + 540) % 360 - 180;
    return distance * Math.sin(bearingDiff * Math.PI / 180) * 1852;
  }
  private updateFlightData(): void {
    if (!this.routeStartTime) return;

    const now = new Date();
    this.flightData.timeEnroute = (now.getTime() - this.routeStartTime.getTime()) / 60000;

    if (this.navigationData.groundSpeed > 0) {
      this.flightData.timeRemaining = 
        (this.navigationData.distanceToWaypoint / this.navigationData.groundSpeed) * 60;
    }

    this.flightData.averageGroundSpeed = 
      this.flightData.totalDistance > 0 ? 
      this.flightData.totalDistance / (this.flightData.timeEnroute / 60) : 0;

    this.updateFuelCalculations();
  }

  private updateFuelCalculations(): void {
    const fuelFlowRate = this.calculateFuelFlow();
    this.flightData.fuelUsed = fuelFlowRate * (this.flightData.timeEnroute / 60);
    
    if (this.flightData.timeRemaining > 0) {
      const fuelForRemaining = fuelFlowRate * (this.flightData.timeRemaining / 60);
      this.flightData.estimatedFuelAtDestination = 
        this.flightData.fuelRemaining - fuelForRemaining;
    }
  }

  private calculateFuelFlow(): number {
    const baseFlow = 8.0;
    const altitudeFactor = 1.0 - (this.navigationData.altitude / 50000) * 0.2;
    const speedFactor = this.navigationData.trueAirspeed / 120;
    
    return baseFlow * altitudeFactor * speedFactor;
  }

  private updateWindCalculations(): void {
    const windDirection = this.windData.direction * Math.PI / 180;
    const heading = this.navigationData.heading * Math.PI / 180;

    const relativeWind = windDirection - heading;
    
    this.windData.headwindComponent = 
      this.windData.speed * Math.cos(relativeWind);
    
    this.windData.crosswindComponent = 
      this.windData.speed * Math.sin(relativeWind);

    this.calculations.driftAngle = 
      Math.asin(this.windData.crosswindComponent / this.navigationData.trueAirspeed) * 
      (180 / Math.PI);
  }

  private updateNavigationCalculations(): void {
    this.calculations.trueCourse = this.navigationData.bearingToWaypoint;
    this.calculations.magneticCourse = 
      this.calculations.trueCourse - this.calculations.magneticVariation;
    
    this.calculations.windCorrectionAngle = this.calculateWindCorrectionAngle();
    this.calculations.compassCourse = 
      this.calculations.magneticCourse + this.calculations.windCorrectionAngle;

    this.navigationData.desiredTrack = this.calculations.trueCourse;
  }

  private calculateWindCorrectionAngle(): number {
    if (this.navigationData.trueAirspeed === 0) return 0;

    const crosswind = this.windData.crosswindComponent;
    const airspeed = this.navigationData.trueAirspeed;

    return Math.asin(crosswind / airspeed) * (180 / Math.PI);
  }

  public setWaypointPosition(position: Vector3): void {
    this.waypointPosition = position ? position.clone() : null;
  }

  public setWindData(direction: number, speed: number): void {
    this.windData.direction = direction;
    this.windData.speed = speed;
  }

  public setMagneticVariation(variation: number): void {
    this.calculations.magneticVariation = variation;
  }
  public getNavigationData(): NavigationData {
    return { ...this.navigationData };
  }

  public getFlightData(): FlightData {
    return { ...this.flightData };
  }

  public getWindData(): WindData {
    return { ...this.windData };
  }

  public getCalculations(): NavigationCalculations {
    return { ...this.calculations };
  }

  public resetFlightData(): void {
    this.routeStartTime = new Date();
    this.flightData.timeEnroute = 0;
    this.flightData.fuelUsed = 0;
    this.flightData.distanceRemaining = this.flightData.totalDistance;
  }

  public setTotalDistance(distance: number): void {
    this.flightData.totalDistance = distance;
    this.flightData.distanceRemaining = distance;
  }

  public setFuelRemaining(fuel: number): void {
    this.flightData.fuelRemaining = fuel;
  }

  public calculateETE(distance: number): number {
    if (this.navigationData.groundSpeed === 0) return 0;
    return (distance / this.navigationData.groundSpeed) * 60;
  }

  public calculateETA(distance: number): Date {
    const eteMinutes = this.calculateETE(distance);
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + eteMinutes);
    return eta;
  }

  public getDesiredHeading(): number {
    return this.calculations.compassCourse;
  }

  public getCourseDeviation(): number {
    const desiredCourse = this.calculations.trueCourse;
    const actualTrack = this.navigationData.track;
    
    let deviation = actualTrack - desiredCourse;
    
    if (deviation > 180) deviation -= 360;
    if (deviation < -180) deviation += 360;
    
    return deviation;
  }

  public isOnCourse(tolerance: number = 5): boolean {
    return Math.abs(this.getCourseDeviation()) <= tolerance;
  }

  public getGroundTrackError(): number {
    return this.navigationData.track - this.navigationData.heading;
  }

  public calculateInterceptHeading(courseToIntercept: number, interceptAngle: number = 30): number {
    const currentBearing = this.navigationData.bearingToWaypoint;
    let interceptHeading = courseToIntercept;

    if (currentBearing > courseToIntercept) {
      interceptHeading = courseToIntercept + interceptAngle;
    } else {
      interceptHeading = courseToIntercept - interceptAngle;
    }

    return (interceptHeading + 360) % 360;
  }
}