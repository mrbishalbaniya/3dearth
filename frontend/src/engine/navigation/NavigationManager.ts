import { Vector3 } from '@babylonjs/core';
import type { 
  NavigationState, 
  Waypoint, 
  NavSource, 
  CourseDeviationIndicator, 
  GPSPosition, 
  NavigationTypes 
} from '../../components/game/Navigation/NavigationTypes';

export interface NavigationManagerConfig {
  updateRateHz: number;
  waasEnabled: boolean;
  rnavCapable: boolean;
  antennaNoise: number;
}

export class NavigationManager {
  private state: NavigationState;
  private config: NavigationManagerConfig;
  private aircraftPosition: Vector3;
  private aircraftHeading: number;
  private aircraftGroundSpeed: number;
  private waypoints: Waypoint[] = [];
  private activeWaypointIndex: number = -1;
  private gpsPosition: GPSPosition | null = null;
  private isActive: boolean = false;
  private updateTimer: number = 0;

  constructor(config: Partial<NavigationManagerConfig> = {}) {
    this.config = {
      updateRateHz: 10,
      waasEnabled: true,
      rnavCapable: true,
      antennaNoise: 0.1,
      ...config
    };

    this.aircraftPosition = Vector3.Zero();
    this.aircraftHeading = 0;
    this.aircraftGroundSpeed = 0;

    this.state = {
      source: 'GPS',
      phase: 'ENROUTE',
      activeWaypointIndex: -1,
      activeWaypoint: null,
      nextWaypoint: null,
      distanceToWptNm: 0,
      bearingToWptDeg: 0,
      crossTrackErrorM: 0,
      requiredNavPerformanceNm: 0.3,
      actualNavPerformanceNm: 0.1,
      navigationIntegrity: true,
      etaNextWptSec: null,
      etaDestSec: null,
      remainingDistanceNm: 0,
      cdi: {
        source: 'GPS',
        courseDeg: 0,
        cdiDots: 0,
        gsDots: null,
        distanceNm: 0,
        bearingDeg: 0,
        taeError: 0,
        flagged: false,
        activeIdent: null,
        toFrom: 'OFF'
      }
    };
  }

  public initialize(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.startUpdateLoop();
  }

  public shutdown(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.stopUpdateLoop();
  }

  private startUpdateLoop(): void {
    const updateInterval = 1000 / this.config.updateRateHz;
    this.updateTimer = window.setInterval(() => {
      this.update();
    }, updateInterval);
  }

  private stopUpdateLoop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = 0;
    }
  }

  public update(): void {
    if (!this.isActive) return;

    this.updateGPSPosition();
    this.updateActiveWaypoint();
    this.calculateNavigation();
    this.updateCDI();
    this.checkNavigationIntegrity();
  }

  public setAircraftState(position: Vector3, heading: number, groundSpeed: number): void {
    this.aircraftPosition = position.clone();
    this.aircraftHeading = heading;
    this.aircraftGroundSpeed = groundSpeed;
  }

  public loadFlightPlan(waypoints: Waypoint[]): void {
    this.waypoints = [...waypoints];
    this.activeWaypointIndex = waypoints.length > 0 ? 0 : -1;
    this.updateActiveWaypoint();
  }

  public setActiveWaypoint(index: number): boolean {
    if (index < 0 || index >= this.waypoints.length) {
      return false;
    }
    this.activeWaypointIndex = index;
    this.updateActiveWaypoint();
    return true;
  }

  public advanceToNextWaypoint(): boolean {
    if (this.activeWaypointIndex + 1 < this.waypoints.length) {
      this.activeWaypointIndex++;
      this.updateActiveWaypoint();
      return true;
    }
    return false;
  }

  private updateGPSPosition(): void {
    // Simulate GPS accuracy based on conditions
    const hdop = 1.0 + this.config.antennaNoise;
    const vdop = 1.2 + this.config.antennaNoise;
    const accuracy = hdop * 3.0; // meters

    this.gpsPosition = {
      lat: this.aircraftPosition.x, // Simplified - in real implementation convert from world coords
      lng: this.aircraftPosition.y,
      altM: this.aircraftPosition.z,
      hdop,
      vdop,
      satellites: this.config.waasEnabled ? 12 : 8,
      fixType: this.config.waasEnabled ? 'waas' : '3d',
      accuracyM: accuracy,
      velocityMs: this.aircraftGroundSpeed,
      trackDeg: this.aircraftHeading,
      timestamp: Date.now()
    };
  }

  private updateActiveWaypoint(): void {
    this.state.activeWaypointIndex = this.activeWaypointIndex;
    
    if (this.activeWaypointIndex >= 0 && this.activeWaypointIndex < this.waypoints.length) {
      this.state.activeWaypoint = this.waypoints[this.activeWaypointIndex];
      
      if (this.activeWaypointIndex + 1 < this.waypoints.length) {
        this.state.nextWaypoint = this.waypoints[this.activeWaypointIndex + 1];
      } else {
        this.state.nextWaypoint = null;
      }
    } else {
      this.state.activeWaypoint = null;
      this.state.nextWaypoint = null;
    }
  }

  private calculateNavigation(): void {
    if (!this.state.activeWaypoint) {
      this.state.distanceToWptNm = 0;
      this.state.bearingToWptDeg = 0;
      this.state.crossTrackErrorM = 0;
      this.state.remainingDistanceNm = 0;
      return;
    }

    const waypoint = this.state.activeWaypoint;
    
    // Calculate distance and bearing to active waypoint
    this.state.distanceToWptNm = this.calculateDistance(
      this.aircraftPosition.x,
      this.aircraftPosition.y,
      waypoint.lat,
      waypoint.lng
    );

    this.state.bearingToWptDeg = this.calculateBearing(
      this.aircraftPosition.x,
      this.aircraftPosition.y,
      waypoint.lat,
      waypoint.lng
    );

    // Calculate cross-track error
    this.state.crossTrackErrorM = this.calculateCrossTrackError();

    // Calculate remaining flight plan distance
    this.state.remainingDistanceNm = this.calculateRemainingDistance();

    // Calculate ETA
    if (this.aircraftGroundSpeed > 0) {
      this.state.etaNextWptSec = (this.state.distanceToWptNm * 3600) / this.aircraftGroundSpeed;
      this.state.etaDestSec = (this.state.remainingDistanceNm * 3600) / this.aircraftGroundSpeed;
    }

    // Update CDI ident
    if (this.state.cdi) {
      this.state.cdi.activeIdent = waypoint.id;
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }

  private calculateCrossTrackError(): number {
    if (!this.state.activeWaypoint || this.activeWaypointIndex === 0) {
      return 0;
    }

    const previousWaypoint = this.waypoints[this.activeWaypointIndex - 1];
    const currentWaypoint = this.state.activeWaypoint;

    // Calculate cross-track distance using great circle navigation
    const R = 6371000; // Earth radius in meters
    const dLat = (currentWaypoint.lat - previousWaypoint.lat) * Math.PI / 180;
    const dLng = (currentWaypoint.lng - previousWaypoint.lng) * Math.PI / 180;
    
    const aircraftLat = this.aircraftPosition.x * Math.PI / 180;
    const trackLat = previousWaypoint.lat * Math.PI / 180;
    
    const alongTrackDist = Math.acos(
      Math.sin(trackLat) * Math.sin(aircraftLat) +
      Math.cos(trackLat) * Math.cos(aircraftLat) *
      Math.cos(dLng)
    ) * R;

    return Math.asin(Math.sin(alongTrackDist / R) * 
      Math.sin(this.aircraftHeading * Math.PI / 180 - 
        this.calculateBearing(previousWaypoint.lat, previousWaypoint.lng, 
          currentWaypoint.lat, currentWaypoint.lng) * Math.PI / 180)) * R;
  }

  private calculateRemainingDistance(): number {
    let distance = this.state.distanceToWptNm;
    
    for (let i = this.activeWaypointIndex + 1; i < this.waypoints.length; i++) {
      const waypoint1 = this.waypoints[i - 1];
      const waypoint2 = this.waypoints[i];
      distance += this.calculateDistance(waypoint1.lat, waypoint1.lng, waypoint2.lat, waypoint2.lng);
    }
    
    return distance;
  }

  private updateCDI(): void {
    if (!this.state.activeWaypoint) {
      this.state.cdi.flagged = true;
      this.state.cdi.cdiDots = 0;
      return;
    }

    this.state.cdi.flagged = false;
    this.state.cdi.distanceNm = this.state.distanceToWptNm;
    this.state.cdi.bearingDeg = this.state.bearingToWptDeg;

    // Calculate CDI deflection (±2.5 dots full scale)
    const fullScaleDeviationM = this.config.rnavCapable ? 370 : 1850; // 0.2nm for RNAV, 1nm for conventional
    this.state.cdi.cdiDots = Math.max(-2.5, Math.min(2.5, 
      this.state.crossTrackErrorM / fullScaleDeviationM * 2.5));

    // Calculate track angle error
    this.state.cdi.taeError = this.state.bearingToWptDeg - this.aircraftHeading;
    if (this.state.cdi.taeError > 180) {
      this.state.cdi.taeError -= 360;
    } else if (this.state.cdi.taeError < -180) {
      this.state.cdi.taeError += 360;
    }

    // Set TO/FROM flag
    this.state.cdi.toFrom = Math.abs(this.state.cdi.taeError) < 90 ? 'TO' : 'FROM';
  }

  private checkNavigationIntegrity(): void {
    if (!this.gpsPosition) {
      this.state.navigationIntegrity = false;
      return;
    }

    // Check RNP compliance
    this.state.actualNavPerformanceNm = this.gpsPosition.accuracyM / 1852; // Convert to nautical miles
    this.state.navigationIntegrity = this.state.actualNavPerformanceNm <= this.state.requiredNavPerformanceNm;
  }

  public getState(): NavigationState {
    return { ...this.state };
  }

  public getGPSPosition(): GPSPosition | null {
    return this.gpsPosition ? { ...this.gpsPosition } : null;
  }

  public setNavSource(source: NavSource): void {
    this.state.source = source;
    this.state.cdi.source = source;
  }

  public setRequiredNavPerformance(rnp: number): void {
    this.state.requiredNavPerformanceNm = rnp;
  }

  public isWaypointSequencing(): boolean {
    return this.state.distanceToWptNm < 0.5 && this.state.activeWaypoint !== null;
  }

  public getFlightPlan(): Waypoint[] {
    return [...this.waypoints];
  }

  public addWaypoint(waypoint: Waypoint, insertAt?: number): void {
    if (insertAt !== undefined) {
      this.waypoints.splice(insertAt, 0, waypoint);
      if (insertAt <= this.activeWaypointIndex) {
        this.activeWaypointIndex++;
      }
    } else {
      this.waypoints.push(waypoint);
    }
  }

  public removeWaypoint(index: number): boolean {
    if (index < 0 || index >= this.waypoints.length) {
      return false;
    }
    
    this.waypoints.splice(index, 1);
    
    if (index < this.activeWaypointIndex) {
      this.activeWaypointIndex--;
    } else if (index === this.activeWaypointIndex) {
      if (this.activeWaypointIndex >= this.waypoints.length) {
        this.activeWaypointIndex = this.waypoints.length - 1;
      }
    }
    
    this.updateActiveWaypoint();
    return true;
  }
}