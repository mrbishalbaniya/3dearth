import { Vector3 } from '@babylonjs/core';

export interface Waypoint {
  id: string;
  name: string;
  type: WaypointType;
  position: Vector3;
  altitude?: number;
  speedRestriction?: number;
  altitudeRestriction?: AltitudeRestriction;
  holdingPattern?: HoldingPattern;
  isSequenced: boolean;
  frequency?: string;
  description?: string;
}

export enum WaypointType {
  GPS = 'GPS',
  VOR = 'VOR',
  NDB = 'NDB',
  FIX = 'FIX',
  INTERSECTION = 'INTERSECTION',
  AIRPORT = 'AIRPORT',
  RUNWAY = 'RUNWAY',
  USER_DEFINED = 'USER_DEFINED',
  APPROACH = 'APPROACH',
  DEPARTURE = 'DEPARTURE',
  ENROUTE = 'ENROUTE'
}

export interface AltitudeRestriction {
  type: 'AT' | 'AT_OR_ABOVE' | 'AT_OR_BELOW' | 'BETWEEN';
  altitude1: number;
  altitude2?: number;
}

export interface HoldingPattern {
  inboundCourse: number;
  turnDirection: 'LEFT' | 'RIGHT';
  legTime: number;
  legDistance?: number;
  entryType: 'DIRECT' | 'TEARDROP' | 'PARALLEL';
}

export interface FlightPlan {
  id: string;
  name: string;
  origin: string;
  destination: string;
  waypoints: string[];
  cruiseAltitude: number;
  cruiseSpeed: number;
  totalDistance: number;
  estimatedTime: number;
  fuelRequired: number;
  createdAt: Date;
}

export interface WaypointSequence {
  currentIndex: number;
  waypoints: string[];
  isActive: boolean;
  completedWaypoints: string[];
}

export class WaypointManager {
  private waypoints: Map<string, Waypoint>;
  private flightPlan: FlightPlan | null;
  private sequence: WaypointSequence;
  private waypointReachedCallbacks: Set<(waypoint: string) => void>;
  private sequenceUpdateCallbacks: Set<(sequence: WaypointSequence) => void>;
  private proximityThreshold: number;
  private isActive: boolean;

  constructor() {
    this.waypoints = new Map();
    this.flightPlan = null;
    this.proximityThreshold = 0.01; // ~1km in degrees
    this.isActive = false;
    
    this.sequence = {
      currentIndex: 0,
      waypoints: [],
      isActive: false,
      completedWaypoints: []
    };
    
    this.waypointReachedCallbacks = new Set();
    this.sequenceUpdateCallbacks = new Set();
    
    this.loadNepalWaypoints();
  }

  public initialize(): void {
    if (this.isActive) return;
    this.isActive = true;
  }

  public shutdown(): void {
    this.isActive = false;
    this.sequence.isActive = false;
  }

  private loadNepalWaypoints(): void {
    // GPS Waypoints around Kathmandu
    this.addWaypoint({
      id: 'BAGMATI',
      name: 'Bagmati River',
      type: WaypointType.GPS,
      position: new Vector3(85.3240, 27.7172, 0),
      isSequenced: false,
      description: 'Bagmati River crossing point'
    });

    this.addWaypoint({
      id: 'THAMEL',
      name: 'Thamel District',
      type: WaypointType.GPS,
      position: new Vector3(85.3118, 27.7152, 0),
      isSequenced: false,
      description: 'Tourist district waypoint'
    });

    this.addWaypoint({
      id: 'SWAYAMBHU',
      name: 'Swayambhunath',
      type: WaypointType.GPS,
      position: new Vector3(85.2900, 27.7149, 0),
      altitude: 6000,
      isSequenced: false,
      description: 'Monkey Temple waypoint'
    });

    this.addWaypoint({
      id: 'BOUDHA',
      name: 'Boudhanath Stupa',
      type: WaypointType.GPS,
      position: new Vector3(85.3616, 27.7215, 0),
      isSequenced: false,
      description: 'Buddhist stupa waypoint'
    });

    // Airport waypoints
    this.addWaypoint({
      id: 'VNKT',
      name: 'Kathmandu Airport',
      type: WaypointType.AIRPORT,
      position: new Vector3(85.3591, 27.6966, 0),
      altitude: 4390,
      isSequenced: false,
      frequency: '118.1',
      description: 'Tribhuvan International Airport'
    });

    this.addWaypoint({
      id: 'VNPK',
      name: 'Pokhara Airport',
      type: WaypointType.AIRPORT,
      position: new Vector3(83.9819, 28.2008, 0),
      altitude: 2712,
      isSequenced: false,
      frequency: '118.5',
      description: 'Pokhara Regional Airport'
    });

    this.addWaypoint({
      id: 'VNLK',
      name: 'Lukla Airport',
      type: WaypointType.AIRPORT,
      position: new Vector3(86.7319, 27.6869, 0),
      altitude: 9334,
      isSequenced: false,
      frequency: '118.3',
      description: 'Tenzing-Hillary Airport'
    });

    this.addWaypoint({
      id: 'VNBW',
      name: 'Bharatpur Airport',
      type: WaypointType.AIRPORT,
      position: new Vector3(84.4294, 27.6783, 0),
      altitude: 415,
      isSequenced: false,
      description: 'Bharatpur Airport'
    });

    // Navigation fixes for approach procedures
    this.addWaypoint({
      id: 'VNKT_IAF',
      name: 'Kathmandu IAF',
      type: WaypointType.APPROACH,
      position: new Vector3(85.2000, 27.8000, 0),
      altitude: 12000,
      altitudeRestriction: {
        type: 'AT_OR_ABOVE',
        altitude1: 10000
      },
      speedRestriction: 180,
      isSequenced: false,
      description: 'Initial Approach Fix for Kathmandu'
    });

    this.addWaypoint({
      id: 'VNKT_FAF',
      name: 'Kathmandu FAF',
      type: WaypointType.APPROACH,
      position: new Vector3(85.3000, 27.7500, 0),
      altitude: 7000,
      altitudeRestriction: {
        type: 'AT',
        altitude1: 7000
      },
      speedRestriction: 150,
      isSequenced: false,
      description: 'Final Approach Fix for Kathmandu'
    });

    // Mountain waypoints for scenic routes
    this.addWaypoint({
      id: 'EVEREST',
      name: 'Mount Everest',
      type: WaypointType.GPS,
      position: new Vector3(86.9250, 27.9881, 0),
      altitude: 29032,
      isSequenced: false,
      description: 'Mount Everest summit'
    });

    this.addWaypoint({
      id: 'ANNAPURNA',
      name: 'Annapurna Base Camp',
      type: WaypointType.GPS,
      position: new Vector3(83.8931, 28.5169, 0),
      altitude: 13550,
      isSequenced: false,
      description: 'Annapurna Base Camp'
    });

    this.addWaypoint({
      id: 'MACHAPUCHARE',
      name: 'Machapuchare',
      type: WaypointType.GPS,
      position: new Vector3(83.9478, 28.4969, 0),
      altitude: 22943,
      isSequenced: false,
      description: 'Fishtail Mountain'
    });

    // En-route waypoints
    this.addWaypoint({
      id: 'GORKHA',
      name: 'Gorkha',
      type: WaypointType.ENROUTE,
      position: new Vector3(84.6333, 28.0000, 0),
      altitude: 8000,
      isSequenced: false,
      description: 'Gorkha en-route waypoint'
    });

    this.addWaypoint({
      id: 'NAMCHE',
      name: 'Namche Bazaar',
      type: WaypointType.GPS,
      position: new Vector3(86.7131, 27.8056, 0),
      altitude: 11286,
      isSequenced: false,
      description: 'Sherpa capital waypoint'
    });

    this.addWaypoint({
      id: 'JOMSOM',
      name: 'Jomsom',
      type: WaypointType.AIRPORT,
      position: new Vector3(83.7228, 28.7806, 0),
      altitude: 8976,
      isSequenced: false,
      frequency: '118.7',
      description: 'Jomsom Airport'
    });

    // VOR stations (simulated)
    this.addWaypoint({
      id: 'KTM_VOR',
      name: 'Kathmandu VOR',
      type: WaypointType.VOR,
      position: new Vector3(85.3591, 27.6966, 0),
      altitude: 4390,
      isSequenced: false,
      frequency: '114.5',
      description: 'Kathmandu VOR/DME'
    });

    this.addWaypoint({
      id: 'PKR_VOR',
      name: 'Pokhara VOR',
      type: WaypointType.VOR,
      position: new Vector3(83.9819, 28.2008, 0),
      altitude: 2712,
      isSequenced: false,
      frequency: '115.2',
      description: 'Pokhara VOR'
    });
  }

  private addWaypoint(waypoint: Waypoint): void {
    this.waypoints.set(waypoint.id, waypoint);
  }

  public update(currentPosition: Vector3): void {
    if (!this.isActive || !this.sequence.isActive) return;

    const currentWaypoint = this.getCurrentWaypoint();
    if (!currentWaypoint) return;

    const waypointData = this.waypoints.get(currentWaypoint);
    if (!waypointData) return;

    const distance = this.calculateDistance(currentPosition, waypointData.position);
    
    if (distance <= this.proximityThreshold) {
      this.advanceToNextWaypoint();
    }
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) +
      Math.pow(pos1.y - pos2.y, 2)
    );
  }

  public loadFlightPlan(flightPlan: FlightPlan): void {
    this.flightPlan = flightPlan;
    this.sequence = {
      currentIndex: 0,
      waypoints: [...flightPlan.waypoints],
      isActive: true,
      completedWaypoints: []
    };
    
    this.notifySequenceUpdate();
  }

  public setDirectTo(waypointId: string): void {
    const waypoint = this.waypoints.get(waypointId);
    if (!waypoint) return;

    this.sequence = {
      currentIndex: 0,
      waypoints: [waypointId],
      isActive: true,
      completedWaypoints: []
    };
    
    this.notifySequenceUpdate();
  }

  private advanceToNextWaypoint(): void {
    const currentWaypoint = this.getCurrentWaypoint();
    if (currentWaypoint) {
      this.sequence.completedWaypoints.push(currentWaypoint);
      this.notifyWaypointReached(currentWaypoint);
    }

    this.sequence.currentIndex++;
    
    if (this.sequence.currentIndex >= this.sequence.waypoints.length) {
      this.sequence.isActive = false;
    }
    
    this.notifySequenceUpdate();
  }

  public getCurrentWaypoint(): string | null {
    if (!this.sequence.isActive || 
        this.sequence.currentIndex >= this.sequence.waypoints.length) {
      return null;
    }
    
    return this.sequence.waypoints[this.sequence.currentIndex];
  }

  public getNextWaypoint(): string | null {
    const nextIndex = this.sequence.currentIndex + 1;
    
    if (!this.sequence.isActive || nextIndex >= this.sequence.waypoints.length) {
      return null;
    }
    
    return this.sequence.waypoints[nextIndex];
  }

  public getWaypointAfter(waypointId: string | null): string | null {
    if (!waypointId || !this.sequence.isActive) return null;
    
    const index = this.sequence.waypoints.indexOf(waypointId);
    if (index === -1 || index >= this.sequence.waypoints.length - 1) {
      return null;
    }
    
    return this.sequence.waypoints[index + 1];
  }

  public getWaypoint(id: string): Waypoint | null {
    return this.waypoints.get(id) || null;
  }

  public getAllWaypoints(): Waypoint[] {
    return Array.from(this.waypoints.values());
  }

  public getWaypointsByType(type: WaypointType): Waypoint[] {
    return Array.from(this.waypoints.values()).filter(wp => wp.type === type);
  }

  public getNearbyWaypoints(position: Vector3, radius: number = 0.5): Waypoint[] {
    return Array.from(this.waypoints.values()).filter(waypoint => {
      const distance = this.calculateDistance(position, waypoint.position);
      return distance <= radius;
    });
  }

  public createWaypoint(waypoint: Omit<Waypoint, 'isSequenced'>): string {
    const fullWaypoint: Waypoint = {
      ...waypoint,
      isSequenced: false
    };
    
    this.waypoints.set(waypoint.id, fullWaypoint);
    return waypoint.id;
  }

  public deleteWaypoint(id: string): boolean {
    return this.waypoints.delete(id);
  }

  public getSequence(): WaypointSequence {
    return { ...this.sequence };
  }

  public getFlightPlan(): FlightPlan | null {
    return this.flightPlan ? { ...this.flightPlan } : null;
  }

  public getDistanceToWaypoint(position: Vector3, waypointId: string): number {
    const waypoint = this.waypoints.get(waypointId);
    if (!waypoint) return -1;
    
    return this.calculateDistance(position, waypoint.position) * 111000; // Convert to meters
  }

  public getBearingToWaypoint(position: Vector3, waypointId: string): number {
    const waypoint = this.waypoints.get(waypointId);
    if (!waypoint) return 0;
    
    const deltaLon = waypoint.position.x - position.x;
    const deltaLat = waypoint.position.y - position.y;
    
    let bearing = Math.atan2(deltaLon, deltaLat) * (180 / Math.PI);
    
    if (bearing < 0) bearing += 360;
    
    return bearing;
  }

  public onWaypointReached(callback: (waypoint: string) => void): void {
    this.waypointReachedCallbacks.add(callback);
  }

  public onSequenceUpdate(callback: (sequence: WaypointSequence) => void): void {
    this.sequenceUpdateCallbacks.add(callback);
  }

  private notifyWaypointReached(waypoint: string): void {
    this.waypointReachedCallbacks.forEach(callback => callback(waypoint));
  }

  private notifySequenceUpdate(): void {
    this.sequenceUpdateCallbacks.forEach(callback => callback(this.sequence));
  }

  public setProximityThreshold(threshold: number): void {
    this.proximityThreshold = threshold;
  }
}