import { Vector3 } from '@babylonjs/core';
import type { 
  Waypoint, 
  NavAid, 
  FlightPlan, 
  NavigationData, 
  GPSData, 
  CDIData,
  CourseDeviationData,
  NavigationMode
} from '../../components/game/Navigation/NavigationTypes';
import { NavigationComputer } from './NavigationComputer';
import { RadioNavigation } from './RadioNavigation';

export interface NavigationState {
  position: Vector3;
  heading: number;
  groundSpeed: number;
  altitude: number;
  verticalSpeed: number;
  course: number;
  track: number;
  drift: number;
  windDirection: number;
  windSpeed: number;
}

export interface NavigationTarget {
  waypoint?: Waypoint;
  navAid?: NavAid;
  position: Vector3;
  course?: number;
  altitude?: number;
  speed?: number;
}

export class NavigationManager {
  private navigationComputer: NavigationComputer;
  private radioNavigation: RadioNavigation;
  
  private currentFlightPlan: FlightPlan | null = null;
  private activeWaypointIndex: number = 0;
  private navigationMode: NavigationMode = 'GPS';
  private selectedNavSource: string = 'GPS';
  
  private currentTarget: NavigationTarget | null = null;
  private lastPosition: Vector3 = Vector3.Zero();
  private lastUpdateTime: number = 0;
  
  // Navigation tolerances
  private waypointCaptureRadius: number = 0.1; // ~6nm in degrees
  private courseDeviationLimit: number = 10; // degrees
  private altitudeDeviationLimit: number = 300; // feet
  
  constructor() {
    this.navigationComputer = new NavigationComputer();
    this.radioNavigation = new RadioNavigation();
  }

  public setFlightPlan(flightPlan: FlightPlan): void {
    this.currentFlightPlan = flightPlan;
    this.activeWaypointIndex = 0;
    this.updateActiveTarget();
  }

  public getFlightPlan(): FlightPlan | null {
    return this.currentFlightPlan;
  }

  public setNavigationMode(mode: NavigationMode): void {
    this.navigationMode = mode;
    this.updateActiveTarget();
  }

  public getNavigationMode(): NavigationMode {
    return this.navigationMode;
  }

  public setNavSource(source: string): void {
    this.selectedNavSource = source;
    this.updateActiveTarget();
  }

  public update(state: NavigationState, deltaTime: number): NavigationData {
    const currentTime = performance.now();
    
    // Calculate ground speed and track
    const distance = Vector3.Distance(state.position, this.lastPosition);
    const timeElapsed = (currentTime - this.lastUpdateTime) / 1000;
    
    if (timeElapsed > 0) {
      const groundSpeed = distance / timeElapsed * 3600; // Convert to degrees/hour then to knots approximation
      state.groundSpeed = groundSpeed * 60; // Rough conversion to knots
    }

    // Update track based on actual movement
    if (!this.lastPosition.equals(Vector3.Zero()) && distance > 0.001) {
      const deltaPos = state.position.subtract(this.lastPosition);
      state.track = Math.atan2(deltaPos.x, deltaPos.z) * 180 / Math.PI;
      if (state.track < 0) state.track += 360;
    }

    // Calculate wind drift
    state.drift = state.track - state.heading;
    if (state.drift > 180) state.drift -= 360;
    if (state.drift < -180) state.drift += 360;

    // Check waypoint sequencing
    this.checkWaypointSequencing(state.position);

    // Generate navigation data
    const navData = this.generateNavigationData(state);

    this.lastPosition = state.position.clone();
    this.lastUpdateTime = currentTime;

    return navData;
  }

  public proceedToNextWaypoint(): boolean {
    if (!this.currentFlightPlan || this.activeWaypointIndex >= this.currentFlightPlan.waypoints.length - 1) {
      return false;
    }
    
    this.activeWaypointIndex++;
    this.updateActiveTarget();
    return true;
  }

  public proceedToPreviousWaypoint(): boolean {
    if (!this.currentFlightPlan || this.activeWaypointIndex <= 0) {
      return false;
    }
    
    this.activeWaypointIndex--;
    this.updateActiveTarget();
    return true;
  }

  public directToWaypoint(waypoint: Waypoint): void {
    this.currentTarget = {
      waypoint,
      position: new Vector3(waypoint.longitude, waypoint.altitude || 0, waypoint.latitude)
    };
    this.navigationMode = 'GPS';
  }

  public getActiveWaypoint(): Waypoint | null {
    if (!this.currentFlightPlan || this.activeWaypointIndex >= this.currentFlightPlan.waypoints.length) {
      return null;
    }
    return this.currentFlightPlan.waypoints[this.activeWaypointIndex];
  }

  public getNextWaypoint(): Waypoint | null {
    if (!this.currentFlightPlan || this.activeWaypointIndex >= this.currentFlightPlan.waypoints.length - 1) {
      return null;
    }
    return this.currentFlightPlan.waypoints[this.activeWaypointIndex + 1];
  }

  public getDistanceToDestination(): number {
    if (!this.currentFlightPlan) return 0;
    
    let totalDistance = 0;
    const waypoints = this.currentFlightPlan.waypoints;
    
    for (let i = this.activeWaypointIndex; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];
      totalDistance += this.navigationComputer.calculateDistance(
        from.latitude, from.longitude,
        to.latitude, to.longitude
      );
    }
    
    return totalDistance;
  }

  public getEstimatedTimeToDestination(groundSpeed: number): number {
    if (groundSpeed <= 0) return 0;
    const distance = this.getDistanceToDestination();
    return distance / groundSpeed; // hours
  }

  private updateActiveTarget(): void {
    if (!this.currentFlightPlan) {
      this.currentTarget = null;
      return;
    }

    const activeWaypoint = this.getActiveWaypoint();
    if (!activeWaypoint) {
      this.currentTarget = null;
      return;
    }

    this.currentTarget = {
      waypoint: activeWaypoint,
      position: new Vector3(activeWaypoint.longitude, activeWaypoint.altitude || 0, activeWaypoint.latitude),
      course: activeWaypoint.course,
      altitude: activeWaypoint.altitude,
      speed: activeWaypoint.speed
    };
  }

  private checkWaypointSequencing(position: Vector3): void {
    if (!this.currentTarget?.waypoint) return;

    const distance = Vector3.Distance(position, this.currentTarget.position);
    
    if (distance < this.waypointCaptureRadius) {
      this.proceedToNextWaypoint();
    }
  }

  private generateNavigationData(state: NavigationState): NavigationData {
    const activeWaypoint = this.getActiveWaypoint();
    const nextWaypoint = this.getNextWaypoint();
    
    let gpsData: GPSData | null = null;
    let cdiData: CDIData | null = null;
    let courseDeviation: CourseDeviationData | null = null;

    if (this.currentTarget) {
      const bearing = this.navigationComputer.calculateBearing(
        state.position.z, state.position.x,
        this.currentTarget.position.z, this.currentTarget.position.x
      );
      
      const distance = this.navigationComputer.calculateDistance(
        state.position.z, state.position.x,
        this.currentTarget.position.z, this.currentTarget.position.x
      );

      gpsData = {
        latitude: state.position.z,
        longitude: state.position.x,
        altitude: state.position.y,
        heading: state.heading,
        groundSpeed: state.groundSpeed,
        track: state.track,
        bearingToWaypoint: bearing,
        distanceToWaypoint: distance,
        crossTrackError: this.calculateCrossTrackError(state, bearing),
        desiredTrack: bearing,
        waypoint: activeWaypoint?.name || null,
        nextWaypoint: nextWaypoint?.name || null
      };

      if (this.navigationMode === 'VOR' || this.navigationMode === 'ILS') {
        const navAid = this.radioNavigation.getSelectedNavAid();
        if (navAid) {
          cdiData = this.radioNavigation.getCDIData(state.position, state.heading, navAid);
        }
      }

      const courseDev = this.calculateCourseDeviation(state, bearing);
      courseDeviation = {
        deviation: courseDev,
        dots: Math.round(courseDev / 2), // 2 degrees per dot
        fromFlag: false,
        toFlag: true,
        valid: true
      };
    }

    return {
      mode: this.navigationMode,
      gps: gpsData,
      cdi: cdiData,
      courseDeviation,
      activeWaypoint,
      nextWaypoint,
      flightPlan: this.currentFlightPlan,
      waypointIndex: this.activeWaypointIndex,
      totalWaypoints: this.currentFlightPlan?.waypoints.length || 0,
      distanceRemaining: this.getDistanceToDestination(),
      timeRemaining: this.getEstimatedTimeToDestination(state.groundSpeed)
    };
  }

  private calculateCrossTrackError(state: NavigationState, desiredTrack: number): number {
    if (!this.currentTarget) return 0;
    
    return this.navigationComputer.calculateCrossTrackError(
      state.position.z, state.position.x,
      this.currentTarget.position.z, this.currentTarget.position.x,
      desiredTrack
    );
  }

  private calculateCourseDeviation(state: NavigationState, desiredTrack: number): number {
    let deviation = desiredTrack - state.track;
    
    if (deviation > 180) deviation -= 360;
    if (deviation < -180) deviation += 360;
    
    return deviation;
  }

  public getNavigationComputer(): NavigationComputer {
    return this.navigationComputer;
  }

  public getRadioNavigation(): RadioNavigation {
    return this.radioNavigation;
  }
}