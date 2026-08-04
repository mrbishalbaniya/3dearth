import { Vector3 } from '@babylonjs/core';
import { AirportDatabase, Airport } from './AirportDatabase';
import { WaypointManager, Waypoint } from './WaypointManager';
import { TerrainAwareness } from './TerrainAwareness';
import { AirspaceManager } from './AirspaceManager';

export interface RouteRequest {
  origin: Vector3;
  destination: Vector3;
  cruiseAltitude: number;
  terrainAvoidance: boolean;
  airspaceAvoidance: boolean;
  weatherAvoidance: boolean;
  maxWaypoints?: number;
  preferredRoutes?: PreferredRoute[];
}

export interface GeneratedRoute {
  waypoints: RouteWaypoint[];
  totalDistance: number;
  estimatedTime: number;
  safetyScore: number;
  terrainClearance: number;
  alternativeRoutes: AlternativeRoute[];
}

export interface RouteWaypoint {
  position: Vector3;
  altitude: number;
  type: RouteWaypointType;
  name?: string;
  restrictions?: RouteRestriction[];
}

export interface AlternativeRoute {
  waypoints: RouteWaypoint[];
  score: number;
  reason: string;
}

export interface PreferredRoute {
  name: string;
  waypoints: Vector3[];
  preference: number;
}

export interface RouteRestriction {
  type: RestrictionType;
  value: number;
  reason: string;
}

export enum RouteWaypointType {
  ORIGIN = 'ORIGIN',
  DESTINATION = 'DESTINATION',
  GENERATED = 'GENERATED',
  TERRAIN_AVOIDANCE = 'TERRAIN_AVOIDANCE',
  AIRSPACE_AVOIDANCE = 'AIRSPACE_AVOIDANCE',
  WEATHER_AVOIDANCE = 'WEATHER_AVOIDANCE',
  NAVIGATION_FIX = 'NAVIGATION_FIX'
}

export enum RestrictionType {
  ALTITUDE = 'ALTITUDE',
  SPEED = 'SPEED',
  HEADING = 'HEADING'
}

export interface Quadtree {
  bounds: Rectangle;
  level: number;
  maxObjects: number;
  maxLevels: number;
  objects: QuadtreeObject[];
  nodes: Quadtree[];
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QuadtreeObject {
  position: Vector3;
  data: any;
}

export class RouteGenerator {
  private airportDatabase: AirportDatabase;
  private waypointManager: WaypointManager;
  private terrainAwareness: TerrainAwareness;
  private airspaceManager: AirspaceManager;
  private spatialIndex: Quadtree;
  private isActive: boolean;
  private workers: Worker[];
  private objectPool: Map<string, any[]>;

  constructor() {
    this.airportDatabase = new AirportDatabase();
    this.waypointManager = new WaypointManager();
    this.terrainAwareness = new TerrainAwareness();
    this.airspaceManager = new AirspaceManager();
    this.isActive = false;
    this.workers = [];
    this.objectPool = new Map();

    this.spatialIndex = this.createQuadtree(
      { x: 80.0, y: 26.0, width: 8.5, height: 4.5 },
      0,
      10,
      5
    );

    this.initializeObjectPool();
  }

  public initialize(): void {
    if (this.isActive) return;
    
    this.airportDatabase.initialize();
    this.waypointManager.initialize();
    this.terrainAwareness.initialize();
    this.airspaceManager.initialize();
    
    this.buildSpatialIndex();
    this.initializeWorkers();
    
    this.isActive = true;
  }

  public shutdown(): void {
    this.isActive = false;
    this.terminateWorkers();
  }
  private initializeObjectPool(): void {
    this.objectPool.set('Vector3', []);
    this.objectPool.set('RouteWaypoint', []);
    this.objectPool.set('RouteRestriction', []);
    
    for (let i = 0; i < 100; i++) {
      this.objectPool.get('Vector3')!.push(new Vector3());
      this.objectPool.get('RouteWaypoint')!.push({
        position: new Vector3(),
        altitude: 0,
        type: RouteWaypointType.GENERATED
      });
      this.objectPool.get('RouteRestriction')!.push({
        type: RestrictionType.ALTITUDE,
        value: 0,
        reason: ''
      });
    }
  }

  private getPooledObject<T>(type: string): T | null {
    const pool = this.objectPool.get(type);
    return pool && pool.length > 0 ? pool.pop() as T : null;
  }

  private returnPooledObject(type: string, obj: any): void {
    const pool = this.objectPool.get(type);
    if (pool && pool.length < 100) {
      pool.push(obj);
    }
  }

  private createQuadtree(bounds: Rectangle, level: number, maxObjects: number, maxLevels: number): Quadtree {
    return {
      bounds,
      level,
      maxObjects,
      maxLevels,
      objects: [],
      nodes: []
    };
  }

  private buildSpatialIndex(): void {
    this.clearQuadtree(this.spatialIndex);
    
    const waypoints = this.waypointManager.getAllWaypoints();
    for (const waypoint of waypoints) {
      this.insertIntoQuadtree(this.spatialIndex, {
        position: waypoint.position,
        data: waypoint
      });
    }
    
    const airports = this.airportDatabase.getAllAirports();
    for (const airport of airports) {
      this.insertIntoQuadtree(this.spatialIndex, {
        position: airport.position,
        data: airport
      });
    }
  }

  private clearQuadtree(quadtree: Quadtree): void {
    quadtree.objects = [];
    quadtree.nodes = [];
  }

  private insertIntoQuadtree(quadtree: Quadtree, obj: QuadtreeObject): void {
    if (quadtree.nodes.length > 0) {
      const index = this.getQuadrantIndex(quadtree, obj.position);
      if (index !== -1) {
        this.insertIntoQuadtree(quadtree.nodes[index], obj);
        return;
      }
    }

    quadtree.objects.push(obj);

    if (quadtree.objects.length > quadtree.maxObjects && quadtree.level < quadtree.maxLevels) {
      if (quadtree.nodes.length === 0) {
        this.splitQuadtree(quadtree);
      }

      let i = 0;
      while (i < quadtree.objects.length) {
        const index = this.getQuadrantIndex(quadtree, quadtree.objects[i].position);
        if (index !== -1) {
          const obj = quadtree.objects.splice(i, 1)[0];
          this.insertIntoQuadtree(quadtree.nodes[index], obj);
        } else {
          i++;
        }
      }
    }
  }

  private splitQuadtree(quadtree: Quadtree): void {
    const subWidth = quadtree.bounds.width / 2;
    const subHeight = quadtree.bounds.height / 2;
    const x = quadtree.bounds.x;
    const y = quadtree.bounds.y;

    quadtree.nodes[0] = this.createQuadtree(
      { x: x + subWidth, y: y, width: subWidth, height: subHeight },
      quadtree.level + 1,
      quadtree.maxObjects,
      quadtree.maxLevels
    );

    quadtree.nodes[1] = this.createQuadtree(
      { x: x, y: y, width: subWidth, height: subHeight },
      quadtree.level + 1,
      quadtree.maxObjects,
      quadtree.maxLevels
    );

    quadtree.nodes[2] = this.createQuadtree(
      { x: x, y: y + subHeight, width: subWidth, height: subHeight },
      quadtree.level + 1,
      quadtree.maxObjects,
      quadtree.maxLevels
    );

    quadtree.nodes[3] = this.createQuadtree(
      { x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
      quadtree.level + 1,
      quadtree.maxObjects,
      quadtree.maxLevels
    );
  }
  private getQuadrantIndex(quadtree: Quadtree, position: Vector3): number {
    let index = -1;
    const verticalMidpoint = quadtree.bounds.x + (quadtree.bounds.width / 2);
    const horizontalMidpoint = quadtree.bounds.y + (quadtree.bounds.height / 2);

    const topQuadrant = position.y < horizontalMidpoint;
    const bottomQuadrant = position.y >= horizontalMidpoint;
    const leftQuadrant = position.x < verticalMidpoint;
    const rightQuadrant = position.x >= verticalMidpoint;

    if (leftQuadrant) {
      if (topQuadrant) {
        index = 1;
      } else if (bottomQuadrant) {
        index = 2;
      }
    } else if (rightQuadrant) {
      if (topQuadrant) {
        index = 0;
      } else if (bottomQuadrant) {
        index = 3;
      }
    }

    return index;
  }

  private queryQuadtree(quadtree: Quadtree, bounds: Rectangle): QuadtreeObject[] {
    const returnObjects: QuadtreeObject[] = [];

    if (!this.rectanglesIntersect(quadtree.bounds, bounds)) {
      return returnObjects;
    }

    for (const obj of quadtree.objects) {
      if (this.pointInRectangle(obj.position, bounds)) {
        returnObjects.push(obj);
      }
    }

    if (quadtree.nodes.length > 0) {
      for (const node of quadtree.nodes) {
        returnObjects.push(...this.queryQuadtree(node, bounds));
      }
    }

    return returnObjects;
  }

  private rectanglesIntersect(rect1: Rectangle, rect2: Rectangle): boolean {
    return !(rect2.x > rect1.x + rect1.width ||
             rect2.x + rect2.width < rect1.x ||
             rect2.y > rect1.y + rect1.height ||
             rect2.y + rect2.height < rect1.y);
  }

  private pointInRectangle(point: Vector3, rect: Rectangle): boolean {
    return point.x >= rect.x &&
           point.x <= rect.x + rect.width &&
           point.y >= rect.y &&
           point.y <= rect.y + rect.height;
  }

  private initializeWorkers(): void {
    const workerCount = Math.min(navigator.hardwareConcurrency || 4, 4);
    
    for (let i = 0; i < workerCount; i++) {
      const workerScript = this.createRouteWorkerScript();
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      const worker = new Worker(workerUrl);
      this.workers.push(worker);
    }
  }

  private terminateWorkers(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
  }

  private createRouteWorkerScript(): string {
    return `
      self.onmessage = function(e) {
        const { origin, destination, constraints } = e.data;
        
        const route = generateRouteSegment(origin, destination, constraints);
        
        self.postMessage({
          success: true,
          route: route
        });
      };
      
      function generateRouteSegment(origin, destination, constraints) {
        const waypoints = [];
        const steps = 10;
        
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = origin.x + (destination.x - origin.x) * t;
          const y = origin.y + (destination.y - origin.y) * t;
          
          waypoints.push({
            position: { x, y, z: 0 },
            altitude: constraints.cruiseAltitude,
            type: 'GENERATED'
          });
        }
        
        return { waypoints };
      }
    `;
  }
  public async generateRoute(request: RouteRequest): Promise<GeneratedRoute> {
    if (!this.isActive) {
      throw new Error('RouteGenerator not initialized');
    }

    const directRoute = this.generateDirectRoute(request);
    const optimizedRoute = await this.optimizeRoute(directRoute, request);
    const alternatives = await this.generateAlternativeRoutes(request, 3);

    return {
      waypoints: optimizedRoute.waypoints,
      totalDistance: this.calculateRouteDistance(optimizedRoute.waypoints),
      estimatedTime: this.calculateRouteTime(optimizedRoute.waypoints, 120),
      safetyScore: this.calculateSafetyScore(optimizedRoute.waypoints, request),
      terrainClearance: this.calculateMinimumTerrainClearance(optimizedRoute.waypoints),
      alternativeRoutes: alternatives
    };
  }

  private generateDirectRoute(request: RouteRequest): GeneratedRoute {
    const waypoints: RouteWaypoint[] = [];

    const originWaypoint = this.getPooledObject<RouteWaypoint>('RouteWaypoint') || {
      position: new Vector3(),
      altitude: 0,
      type: RouteWaypointType.ORIGIN
    };
    
    originWaypoint.position.copyFrom(request.origin);
    originWaypoint.altitude = request.cruiseAltitude;
    originWaypoint.type = RouteWaypointType.ORIGIN;
    waypoints.push(originWaypoint);

    if (request.terrainAvoidance || request.airspaceAvoidance) {
      const intermediateWaypoints = this.generateIntermediateWaypoints(request);
      waypoints.push(...intermediateWaypoints);
    }

    const destinationWaypoint = this.getPooledObject<RouteWaypoint>('RouteWaypoint') || {
      position: new Vector3(),
      altitude: 0,
      type: RouteWaypointType.DESTINATION
    };
    
    destinationWaypoint.position.copyFrom(request.destination);
    destinationWaypoint.altitude = request.cruiseAltitude;
    destinationWaypoint.type = RouteWaypointType.DESTINATION;
    waypoints.push(destinationWaypoint);

    return {
      waypoints,
      totalDistance: this.calculateRouteDistance(waypoints),
      estimatedTime: this.calculateRouteTime(waypoints, 120),
      safetyScore: this.calculateSafetyScore(waypoints, request),
      terrainClearance: this.calculateMinimumTerrainClearance(waypoints),
      alternativeRoutes: []
    };
  }

  private generateIntermediateWaypoints(request: RouteRequest): RouteWaypoint[] {
    const waypoints: RouteWaypoint[] = [];
    const segments = 5;

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const position = new Vector3(
        request.origin.x + (request.destination.x - request.origin.x) * t,
        request.origin.y + (request.destination.y - request.origin.y) * t,
        0
      );

      let waypointType = RouteWaypointType.GENERATED;
      let altitude = request.cruiseAltitude;
      const restrictions: RouteRestriction[] = [];

      if (request.terrainAvoidance) {
        const terrainHeight = this.terrainAwareness.getTerrainElevation(position);
        const minimumAltitude = terrainHeight + 1000;
        
        if (altitude < minimumAltitude) {
          altitude = minimumAltitude;
          waypointType = RouteWaypointType.TERRAIN_AVOIDANCE;
          
          restrictions.push({
            type: RestrictionType.ALTITUDE,
            value: minimumAltitude,
            reason: 'Terrain avoidance'
          });
        }
      }

      if (request.airspaceAvoidance) {
        position.y += 0.01 * Math.sin(i * Math.PI / segments);
        waypointType = RouteWaypointType.AIRSPACE_AVOIDANCE;
      }

      const waypoint: RouteWaypoint = {
        position,
        altitude,
        type: waypointType,
        restrictions: restrictions.length > 0 ? restrictions : undefined
      };

      waypoints.push(waypoint);
    }

    return waypoints;
  }
  private async optimizeRoute(route: GeneratedRoute, request: RouteRequest): Promise<GeneratedRoute> {
    if (this.workers.length === 0) {
      return route;
    }

    const worker = this.workers[0];
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(route);
      }, 5000);

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        
        if (e.data.success && e.data.route) {
          const optimizedWaypoints = e.data.route.waypoints.map((wp: any) => ({
            position: new Vector3(wp.position.x, wp.position.y, wp.position.z),
            altitude: wp.altitude,
            type: wp.type as RouteWaypointType
          }));

          resolve({
            ...route,
            waypoints: optimizedWaypoints
          });
        } else {
          resolve(route);
        }
      };

      worker.postMessage({
        origin: request.origin,
        destination: request.destination,
        constraints: {
          cruiseAltitude: request.cruiseAltitude,
          terrainAvoidance: request.terrainAvoidance,
          airspaceAvoidance: request.airspaceAvoidance
        }
      });
    });
  }

  private async generateAlternativeRoutes(request: RouteRequest, count: number): Promise<AlternativeRoute[]> {
    const alternatives: AlternativeRoute[] = [];

    for (let i = 0; i < count; i++) {
      const modifiedRequest = { ...request };
      
      switch (i) {
        case 0:
          modifiedRequest.cruiseAltitude += 2000;
          break;
        case 1:
          modifiedRequest.origin = new Vector3(
            request.origin.x + 0.05,
            request.origin.y,
            request.origin.z
          );
          break;
        case 2:
          modifiedRequest.destination = new Vector3(
            request.destination.x,
            request.destination.y + 0.05,
            request.destination.z
          );
          break;
      }

      const alternativeRoute = this.generateDirectRoute(modifiedRequest);
      
      alternatives.push({
        waypoints: alternativeRoute.waypoints,
        score: alternativeRoute.safetyScore,
        reason: this.getAlternativeReason(i)
      });
    }

    return alternatives;
  }

  private getAlternativeReason(index: number): string {
    const reasons = [
      'Higher altitude route',
      'Eastern deviation',
      'Southern approach'
    ];
    
    return reasons[index] || 'Alternative route';
  }

  private calculateRouteDistance(waypoints: RouteWaypoint[]): number {
    let totalDistance = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const current = waypoints[i].position;
      const next = waypoints[i + 1].position;
      
      totalDistance += this.calculateGreatCircleDistance(current, next);
    }

    return totalDistance;
  }

  private calculateGreatCircleDistance(pos1: Vector3, pos2: Vector3): number {
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

  private calculateRouteTime(waypoints: RouteWaypoint[], speed: number): number {
    const distance = this.calculateRouteDistance(waypoints);
    return (distance / speed) * 60;
  }

  private calculateSafetyScore(waypoints: RouteWaypoint[], request: RouteRequest): number {
    let score = 100;

    for (const waypoint of waypoints) {
      if (waypoint.restrictions) {
        score -= waypoint.restrictions.length * 5;
      }

      const terrainHeight = this.terrainAwareness.getTerrainElevation(waypoint.position);
      const clearance = waypoint.altitude - terrainHeight;
      
      if (clearance < 1000) {
        score -= (1000 - clearance) / 10;
      }
    }

    return Math.max(0, score);
  }

  private calculateMinimumTerrainClearance(waypoints: RouteWaypoint[]): number {
    let minClearance = Infinity;

    for (const waypoint of waypoints) {
      const terrainHeight = this.terrainAwareness.getTerrainElevation(waypoint.position);
      const clearance = waypoint.altitude - terrainHeight;
      
      if (clearance < minClearance) {
        minClearance = clearance;
      }
    }

    return minClearance === Infinity ? 0 : minClearance;
  }

  public getNearbyNavigationPoints(position: Vector3, radius: number): QuadtreeObject[] {
    const bounds: Rectangle = {
      x: position.x - radius,
      y: position.y - radius,
      width: radius * 2,
      height: radius * 2
    };

    return this.queryQuadtree(this.spatialIndex, bounds);
  }
}