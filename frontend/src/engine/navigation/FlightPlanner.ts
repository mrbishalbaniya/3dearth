import { Vector3 } from '@babylonjs/core';
import { AirportDatabase, Airport } from './AirportDatabase';
import { WaypointManager, Waypoint, FlightPlan } from './WaypointManager';
import { TerrainAwareness } from './TerrainAwareness';

export interface FlightPlanRequest {
  origin: string;
  destination: string;
  waypoints?: string[];
  cruiseAltitude?: number;
  cruiseSpeed?: number;
  aircraftType?: AircraftType;
  fuelCapacity?: number;
  weatherConsideration?: boolean;
  terrainAvoidance?: boolean;
}

export interface FlightPlanResult {
  flightPlan: FlightPlan;
  route: RouteSegment[];
  totalDistance: number;
  estimatedTime: number;
  fuelRequired: number;
  alternateAirports: string[];
  warnings: FlightPlanWarning[];
}

export interface RouteSegment {
  from: string;
  to: string;
  distance: number;
  bearing: number;
  altitude: number;
  estimatedTime: number;
  type: SegmentType;
}

export interface FlightPlanWarning {
  type: WarningType;
  message: string;
  severity: WarningSeverity;
  position?: Vector3;
}

export enum AircraftType {
  LIGHT_SINGLE = 'LIGHT_SINGLE',
  LIGHT_TWIN = 'LIGHT_TWIN',
  TURBOPROP = 'TURBOPROP',
  JET = 'JET',
  HELICOPTER = 'HELICOPTER'
}

export enum SegmentType {
  DEPARTURE = 'DEPARTURE',
  ENROUTE = 'ENROUTE',
  APPROACH = 'APPROACH',
  DIRECT = 'DIRECT'
}

export enum WarningType {
  TERRAIN = 'TERRAIN',
  WEATHER = 'WEATHER',
  AIRSPACE = 'AIRSPACE',
  FUEL = 'FUEL',
  DISTANCE = 'DISTANCE',
  ALTITUDE = 'ALTITUDE'
}

export enum WarningSeverity {
  INFO = 'INFO',
  CAUTION = 'CAUTION',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export interface AircraftPerformance {
  cruiseSpeed: number;
  cruiseAltitude: number;
  fuelConsumption: number;
  range: number;
  serviceceiling: number;
  climbRate: number;
}

export class FlightPlanner {
  private airportDatabase: AirportDatabase;
  private waypointManager: WaypointManager;
  private terrainAwareness: TerrainAwareness;
  private aircraftPerformance: Map<AircraftType, AircraftPerformance>;
  private isActive: boolean;

  constructor() {
    this.airportDatabase = new AirportDatabase();
    this.waypointManager = new WaypointManager();
    this.terrainAwareness = new TerrainAwareness();
    this.aircraftPerformance = new Map();
    this.isActive = false;

    this.initializeAircraftPerformance();
  }

  public initialize(): void {
    if (this.isActive) return;
    
    this.airportDatabase.initialize();
    this.waypointManager.initialize();
    this.terrainAwareness.initialize();
    
    this.isActive = true;
  }

  public shutdown(): void {
    this.isActive = false;
  }
  private initializeAircraftPerformance(): void {
    this.aircraftPerformance.set(AircraftType.LIGHT_SINGLE, {
      cruiseSpeed: 120,
      cruiseAltitude: 8000,
      fuelConsumption: 8.0,
      range: 600,
      serviceceiling: 14000,
      climbRate: 500
    });

    this.aircraftPerformance.set(AircraftType.LIGHT_TWIN, {
      cruiseSpeed: 180,
      cruiseAltitude: 12000,
      fuelConsumption: 16.0,
      range: 800,
      serviceceiling: 20000,
      climbRate: 800
    });

    this.aircraftPerformance.set(AircraftType.TURBOPROP, {
      cruiseSpeed: 250,
      cruiseAltitude: 18000,
      fuelConsumption: 35.0,
      range: 1200,
      serviceceiling: 25000,
      climbRate: 1200
    });

    this.aircraftPerformance.set(AircraftType.JET, {
      cruiseSpeed: 400,
      cruiseAltitude: 35000,
      fuelConsumption: 120.0,
      range: 2000,
      serviceceiling: 41000,
      climbRate: 2000
    });

    this.aircraftPerformance.set(AircraftType.HELICOPTER, {
      cruiseSpeed: 100,
      cruiseAltitude: 5000,
      fuelConsumption: 25.0,
      range: 300,
      serviceceiling: 12000,
      climbRate: 800
    });
  }

  public createFlightPlan(
    origin: string,
    destination: string,
    waypoints: string[] = []
  ): FlightPlan {
    const request: FlightPlanRequest = {
      origin,
      destination,
      waypoints,
      aircraftType: AircraftType.LIGHT_SINGLE,
      weatherConsideration: true,
      terrainAvoidance: true
    };

    const result = this.generateFlightPlan(request);
    return result.flightPlan;
  }

  public generateFlightPlan(request: FlightPlanRequest): FlightPlanResult {
    const originAirport = this.airportDatabase.getAirportByICAO(request.origin);
    const destinationAirport = this.airportDatabase.getAirportByICAO(request.destination);

    if (!originAirport || !destinationAirport) {
      throw new Error('Invalid origin or destination airport');
    }

    const aircraftPerf = this.aircraftPerformance.get(
      request.aircraftType || AircraftType.LIGHT_SINGLE
    )!;

    const route = this.generateRoute(
      originAirport,
      destinationAirport,
      request.waypoints || [],
      aircraftPerf
    );

    const totalDistance = route.reduce((sum, segment) => sum + segment.distance, 0);
    const estimatedTime = route.reduce((sum, segment) => sum + segment.estimatedTime, 0);
    const fuelRequired = this.calculateFuelRequirement(totalDistance, aircraftPerf);

    const warnings = this.generateWarnings(route, request, aircraftPerf);
    const alternateAirports = this.findAlternateAirports(destinationAirport);

    const flightPlan: FlightPlan = {
      id: this.generateFlightPlanId(),
      name: `${request.origin} to ${request.destination}`,
      origin: request.origin,
      destination: request.destination,
      waypoints: this.extractWaypoints(route),
      cruiseAltitude: request.cruiseAltitude || aircraftPerf.cruiseAltitude,
      cruiseSpeed: request.cruiseSpeed || aircraftPerf.cruiseSpeed,
      totalDistance,
      estimatedTime,
      fuelRequired,
      createdAt: new Date()
    };

    return {
      flightPlan,
      route,
      totalDistance,
      estimatedTime,
      fuelRequired,
      alternateAirports,
      warnings
    };
  }
  private generateRoute(
    origin: Airport,
    destination: Airport,
    waypoints: string[],
    aircraftPerf: AircraftPerformance
  ): RouteSegment[] {
    const route: RouteSegment[] = [];
    const allPoints = [origin.icao, ...waypoints, destination.icao];

    for (let i = 0; i < allPoints.length - 1; i++) {
      const fromId = allPoints[i];
      const toId = allPoints[i + 1];

      const fromPoint = this.getPointPosition(fromId);
      const toPoint = this.getPointPosition(toId);

      if (!fromPoint || !toPoint) continue;

      const distance = this.calculateDistance(fromPoint, toPoint);
      const bearing = this.calculateBearing(fromPoint, toPoint);
      const estimatedTime = (distance / aircraftPerf.cruiseSpeed) * 60;

      let segmentType = SegmentType.ENROUTE;
      if (i === 0) segmentType = SegmentType.DEPARTURE;
      if (i === allPoints.length - 2) segmentType = SegmentType.APPROACH;

      route.push({
        from: fromId,
        to: toId,
        distance,
        bearing,
        altitude: aircraftPerf.cruiseAltitude,
        estimatedTime,
        type: segmentType
      });
    }

    return route;
  }

  private getPointPosition(id: string): Vector3 | null {
    const airport = this.airportDatabase.getAirportByICAO(id);
    if (airport) return airport.position;

    const waypoint = this.waypointManager.getWaypoint(id);
    if (waypoint) return waypoint.position;

    return null;
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const R = 6371;
    const lat1Rad = (pos1.y * Math.PI) / 180;
    const lat2Rad = (pos2.y * Math.PI) / 180;
    const deltaLatRad = ((pos2.y - pos1.y) * Math.PI) / 180;
    const deltaLonRad = ((pos2.x - pos1.x) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateBearing(pos1: Vector3, pos2: Vector3): number {
    const lat1Rad = (pos1.y * Math.PI) / 180;
    const lat2Rad = (pos2.y * Math.PI) / 180;
    const deltaLonRad = ((pos2.x - pos1.x) * Math.PI) / 180;

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    return (bearing + 360) % 360;
  }

  private calculateFuelRequirement(distance: number, aircraftPerf: AircraftPerformance): number {
    const baseFuel = (distance / aircraftPerf.cruiseSpeed) * aircraftPerf.fuelConsumption;
    const reserveFuel = baseFuel * 0.3;
    return baseFuel + reserveFuel;
  }

  private generateWarnings(
    route: RouteSegment[],
    request: FlightPlanRequest,
    aircraftPerf: AircraftPerformance
  ): FlightPlanWarning[] {
    const warnings: FlightPlanWarning[] = [];

    const totalDistance = route.reduce((sum, segment) => sum + segment.distance, 0);

    if (totalDistance > aircraftPerf.range * 0.8) {
      warnings.push({
        type: WarningType.FUEL,
        message: 'Flight distance approaches aircraft range limits',
        severity: WarningSeverity.WARNING
      });
    }

    for (const segment of route) {
      const fromPos = this.getPointPosition(segment.from);
      const toPos = this.getPointPosition(segment.to);

      if (fromPos && toPos && request.terrainAvoidance) {
        const terrainWarning = this.checkTerrainClearance(fromPos, toPos, segment.altitude);
        if (terrainWarning) {
          warnings.push(terrainWarning);
        }
      }
    }

    return warnings;
  }
  private checkTerrainClearance(
    fromPos: Vector3,
    toPos: Vector3,
    altitude: number
  ): FlightPlanWarning | null {
    const midPoint = new Vector3(
      (fromPos.x + toPos.x) / 2,
      (fromPos.y + toPos.y) / 2,
      0
    );

    const terrainHeight = this.terrainAwareness.getTerrainElevation(midPoint);
    const minimumSafeAltitude = terrainHeight + 1000;

    if (altitude < minimumSafeAltitude) {
      return {
        type: WarningType.TERRAIN,
        message: `Altitude ${altitude}ft below minimum safe altitude ${minimumSafeAltitude}ft`,
        severity: WarningSeverity.CRITICAL,
        position: midPoint
      };
    }

    return null;
  }

  private findAlternateAirports(destination: Airport): string[] {
    const nearbyAirports = this.airportDatabase.getNearbyAirports(
      destination.position,
      2.0
    );

    return nearbyAirports
      .filter(airport => 
        airport.icao !== destination.icao &&
        airport.isActive &&
        airport.runways.some(runway => runway.length >= 1000)
      )
      .slice(0, 3)
      .map(airport => airport.icao);
  }

  private extractWaypoints(route: RouteSegment[]): string[] {
    const waypoints: string[] = [];
    
    for (const segment of route) {
      if (waypoints.length === 0) {
        waypoints.push(segment.from);
      }
      waypoints.push(segment.to);
    }
    
    return waypoints;
  }

  private generateFlightPlanId(): string {
    return `FPL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public validateFlightPlan(flightPlan: FlightPlan): FlightPlanWarning[] {
    const warnings: FlightPlanWarning[] = [];

    const originAirport = this.airportDatabase.getAirportByICAO(flightPlan.origin);
    const destinationAirport = this.airportDatabase.getAirportByICAO(flightPlan.destination);

    if (!originAirport) {
      warnings.push({
        type: WarningType.DISTANCE,
        message: `Origin airport ${flightPlan.origin} not found`,
        severity: WarningSeverity.CRITICAL
      });
    }

    if (!destinationAirport) {
      warnings.push({
        type: WarningType.DISTANCE,
        message: `Destination airport ${flightPlan.destination} not found`,
        severity: WarningSeverity.CRITICAL
      });
    }

    for (const waypointId of flightPlan.waypoints) {
      const waypoint = this.waypointManager.getWaypoint(waypointId);
      const airport = this.airportDatabase.getAirportByICAO(waypointId);
      
      if (!waypoint && !airport) {
        warnings.push({
          type: WarningType.DISTANCE,
          message: `Waypoint ${waypointId} not found`,
          severity: WarningSeverity.WARNING
        });
      }
    }

    if (flightPlan.cruiseAltitude > 25000 && flightPlan.cruiseAltitude < 29000) {
      warnings.push({
        type: WarningType.ALTITUDE,
        message: 'Cruise altitude in transition zone - consider FL290 or above',
        severity: WarningSeverity.CAUTION
      });
    }

    return warnings;
  }

  public optimizeRoute(flightPlan: FlightPlan): FlightPlan {
    const optimizedWaypoints = this.removeUnnecessaryWaypoints(flightPlan.waypoints);
    
    return {
      ...flightPlan,
      waypoints: optimizedWaypoints,
      id: this.generateFlightPlanId()
    };
  }

  private removeUnnecessaryWaypoints(waypoints: string[]): string[] {
    if (waypoints.length <= 2) return waypoints;

    const optimized = [waypoints[0]];

    for (let i = 1; i < waypoints.length - 1; i++) {
      const prevPos = this.getPointPosition(waypoints[i - 1]);
      const currentPos = this.getPointPosition(waypoints[i]);
      const nextPos = this.getPointPosition(waypoints[i + 1]);

      if (!prevPos || !currentPos || !nextPos) {
        optimized.push(waypoints[i]);
        continue;
      }

      const bearing1 = this.calculateBearing(prevPos, currentPos);
      const bearing2 = this.calculateBearing(currentPos, nextPos);
      const bearingDiff = Math.abs(bearing1 - bearing2);

      if (bearingDiff > 10 && bearingDiff < 350) {
        optimized.push(waypoints[i]);
      }
    }

    optimized.push(waypoints[waypoints.length - 1]);
    return optimized;
  }
}