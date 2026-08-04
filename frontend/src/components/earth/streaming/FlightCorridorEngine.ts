/**
 * FlightCorridorEngine - Core terrain streaming engine for flight simulator
 * 
 * NEVER renders the entire Earth.
 * Only streams terrain along the active flight corridor.
 * Dynamically loads/unloads tiles based on aircraft position.
 */

import { haversineNm, greatCircleWaypoints } from "@/components/game/Navigation/greatCircle";

export interface FlightCorridor {
  /** Route coordinates sampled every 250m-1000m */
  routePoints: RoutePoint[];
  /** Departure airport ICAO */
  departure: string;
  /** Destination airport ICAO */
  destination: string;
  /** Total route distance in NM */
  totalDistanceNm: number;
  /** Current aircraft position index in routePoints */
  currentIndex: number;
  /** Streaming radius in meters */
  streamingRadiusM: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  altitudeM: number;
  distanceFromStartNm: number;
  bearingDeg: number;
}

export interface TileRequest {
  x: number;
  z: number;
  zoom: number;
  priority: TilePriority;
  distanceFromAircraft: number;
}

export enum TilePriority {
  CURRENT_AIRCRAFT = 0,    // Highest - tile under aircraft
  AHEAD_NEAR = 1,          // Next 10km
  AHEAD_FAR = 2,           // 10-50km ahead
  CAMERA_DIRECTION = 3,    // User looking at
  DEPARTURE_ARRIVAL = 4,   // Airports
  BEHIND = 5,              // Already passed
  LOW = 6,                 // Everything else
}

export interface StreamingState {
  /** Currently loaded tiles */
  loadedTiles: Set<string>;
  /** Tiles in loading queue */
  queuedTiles: Set<string>;
  /** Tiles cached in memory */
  cachedTiles: Map<string, CachedTile>;
  /** Current memory usage MB */
  memoryUsageMB: number;
  /** Max memory budget MB */
  maxMemoryMB: number;
  /** Tiles to load this frame */
  loadQueue: TileRequest[];
  /** Tiles to unload this frame */
  unloadQueue: string[];
}

export interface CachedTile {
  key: string;
  geometry: any;
  texture?: any;
  lastAccessed: number;
  sizeBytes: number;
}

export class FlightCorridorEngine {
  private corridor: FlightCorridor | null = null;
  private state: StreamingState;
  private aircraftPosition: { lat: number; lng: number; altM: number } | null = null;
  
  constructor(
    private maxMemoryMB: number = 512,
    private defaultStreamingRadiusM: number = 20000 // 20km default
  ) {
    this.state = {
      loadedTiles: new Set(),
      queuedTiles: new Set(),
      cachedTiles: new Map(),
      memoryUsageMB: 0,
      maxMemoryMB,
      loadQueue: [],
      unloadQueue: [],
    };
  }

  /**
   * Initialize flight corridor from departure to destination
   */
  initializeCorridor(
    departureLat: number,
    departureLng: number,
    destinationLat: number,
    destinationLng: number,
    departureIcao: string,
    destinationIcao: string,
    cruiseAltM: number = 3000,
    streamingRadiusM?: number
  ): FlightCorridor {
    // Calculate great circle route
    const distanceNm = haversineNm(departureLat, departureLng, destinationLat, destinationLng);
    
    // Sample points every 250m-1000m based on distance
    const sampleIntervalM = distanceNm < 50 ? 250 : distanceNm < 200 ? 500 : 1000;
    const numSamples = Math.floor((distanceNm * 1852) / sampleIntervalM);
    
    const waypoints = greatCircleWaypoints(
      departureLat,
      departureLng,
      destinationLat,
      destinationLng,
      numSamples
    );

    // Convert to RoutePoints with altitude profile
    const routePoints: RoutePoint[] = waypoints.map((wp, idx) => {
      const progress = idx / waypoints.length;
      
      // Simple altitude profile: climb to cruise, maintain, descend
      let altitude = 0;
      if (progress < 0.2) {
        // Climb phase
        altitude = cruiseAltM * (progress / 0.2);
      } else if (progress > 0.8) {
        // Descent phase
        altitude = cruiseAltM * ((1 - progress) / 0.2);
      } else {
        // Cruise phase
        altitude = cruiseAltM;
      }

      const distanceFromStart = distanceNm * progress;
      
      return {
        lat: wp.lat,
        lng: wp.lng,
        altitudeM: altitude,
        distanceFromStartNm: distanceFromStart,
        bearingDeg: this.calculateBearing(wp.lat, wp.lng, waypoints[idx + 1]?.lat, waypoints[idx + 1]?.lng),
      };
    });

    this.corridor = {
      routePoints,
      departure: departureIcao,
      destination: destinationIcao,
      totalDistanceNm: distanceNm,
      currentIndex: 0,
      streamingRadiusM: streamingRadiusM ?? this.defaultStreamingRadiusM,
    };

    return this.corridor;
  }

  /**
   * Update aircraft position and determine which tiles to load/unload
   */
  updateAircraftPosition(lat: number, lng: number, altM: number): void {
    this.aircraftPosition = { lat, lng, altM };

    if (!this.corridor) return;

    // Find nearest route point
    this.corridor.currentIndex = this.findNearestRoutePointIndex(lat, lng);

    // Calculate which tiles are needed
    this.updateTileRequests();
  }

  /**
   * Find nearest point on route to aircraft
   */
  private findNearestRoutePointIndex(lat: number, lng: number): number {
    if (!this.corridor) return 0;

    let minDist = Infinity;
    let nearestIdx = 0;

    for (let i = 0; i < this.corridor.routePoints.length; i++) {
      const point = this.corridor.routePoints[i];
      const dist = haversineNm(lat, lng, point.lat, point.lng);
      
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }

    return nearestIdx;
  }

  /**
   * Calculate which tiles are needed based on current position
   */
  private updateTileRequests(): void {
    if (!this.corridor || !this.aircraftPosition) return;

    const newLoadQueue: TileRequest[] = [];
    const currentTiles = new Set<string>();

    // 1. Current aircraft tile (highest priority)
    const aircraftTile = this.latLngToTile(
      this.aircraftPosition.lat,
      this.aircraftPosition.lng,
      this.getZoomForAltitude(this.aircraftPosition.altM)
    );
    
    newLoadQueue.push({
      ...aircraftTile,
      priority: TilePriority.CURRENT_AIRCRAFT,
      distanceFromAircraft: 0,
    });
    currentTiles.add(this.tileKey(aircraftTile.x, aircraftTile.z, aircraftTile.zoom));

    // 2. Corridor tiles ahead (next 100km)
    const currentIdx = this.corridor.currentIndex;
    const radiusNm = this.corridor.streamingRadiusM / 1852;
    
    for (let i = currentIdx; i < this.corridor.routePoints.length; i++) {
      const point = this.corridor.routePoints[i];
      const distFromAircraft = haversineNm(
        this.aircraftPosition.lat,
        this.aircraftPosition.lng,
        point.lat,
        point.lng
      );

      // Stop if beyond 100km ahead
      if (distFromAircraft > 54) break; // ~100km

      // Load tiles within streaming radius of this route point
      const zoom = this.getZoomForAltitude(point.altitudeM);
      const tile = this.latLngToTile(point.lat, point.lng, zoom);
      const tileKey = this.tileKey(tile.x, tile.z, zoom);

      if (!currentTiles.has(tileKey)) {
        let priority: TilePriority;
        if (distFromAircraft < 5.4) {
          priority = TilePriority.AHEAD_NEAR; // Next 10km
        } else {
          priority = TilePriority.AHEAD_FAR; // 10-100km
        }

        newLoadQueue.push({
          ...tile,
          priority,
          distanceFromAircraft: distFromAircraft * 1852, // Convert to meters
        });
        currentTiles.add(tileKey);
      }
    }

    // 3. Tiles behind (last 20km) - lower priority
    for (let i = currentIdx - 1; i >= 0; i--) {
      const point = this.corridor.routePoints[i];
      const distFromAircraft = haversineNm(
        this.aircraftPosition.lat,
        this.aircraftPosition.lng,
        point.lat,
        point.lng
      );

      // Stop if beyond 20km behind
      if (distFromAircraft > 10.8) break; // ~20km

      const zoom = this.getZoomForAltitude(point.altitudeM);
      const tile = this.latLngToTile(point.lat, point.lng, zoom);
      const tileKey = this.tileKey(tile.x, tile.z, zoom);

      if (!currentTiles.has(tileKey)) {
        newLoadQueue.push({
          ...tile,
          priority: TilePriority.BEHIND,
          distanceFromAircraft: distFromAircraft * 1852,
        });
        currentTiles.add(tileKey);
      }
    }

    // Sort by priority then distance
    newLoadQueue.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.distanceFromAircraft - b.distanceFromAircraft;
    });

    // Determine tiles to unload (not in current set)
    const unloadQueue: string[] = [];
    for (const loadedKey of this.state.loadedTiles) {
      if (!currentTiles.has(loadedKey)) {
        unloadQueue.push(loadedKey);
      }
    }

    this.state.loadQueue = newLoadQueue;
    this.state.unloadQueue = unloadQueue;
  }

  /**
   * Get appropriate zoom level based on altitude
   */
  private getZoomForAltitude(altM: number): number {
    // Higher altitude = lower zoom (less detail)
    if (altM > 10000) return 12;
    if (altM > 5000) return 13;
    if (altM > 2000) return 14;
    if (altM > 1000) return 15;
    return 16;
  }

  /**
   * Convert lat/lng to tile coordinates
   */
  private latLngToTile(lat: number, lng: number, zoom: number): { x: number; z: number; zoom: number } {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lng + 180) / 360) * n);
    const z = Math.floor(
      ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
    );
    return { x, z, zoom };
  }

  /**
   * Generate tile key
   */
  private tileKey(x: number, z: number, zoom: number): string {
    return `${zoom}/${x}/${z}`;
  }

  /**
   * Calculate bearing between two points
   */
  private calculateBearing(lat1: number, lng1: number, lat2?: number, lng2?: number): number {
    if (lat2 === undefined || lng2 === undefined) return 0;

    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360;
  }

  /**
   * Get current streaming state
   */
  getState(): StreamingState {
    return this.state;
  }

  /**
   * Get current corridor
   */
  getCorridor(): FlightCorridor | null {
    return this.corridor;
  }

  /**
   * Mark tile as loaded
   */
  markTileLoaded(key: string, sizeBytes: number): void {
    this.state.loadedTiles.add(key);
    this.state.queuedTiles.delete(key);
    this.state.memoryUsageMB += sizeBytes / (1024 * 1024);
  }

  /**
   * Unload tile and free memory
   */
  unloadTile(key: string): void {
    const cached = this.state.cachedTiles.get(key);
    if (cached) {
      this.state.memoryUsageMB -= cached.sizeBytes / (1024 * 1024);
      this.state.cachedTiles.delete(key);
    }
    this.state.loadedTiles.delete(key);
  }

  /**
   * Check if we're exceeding memory budget
   */
  isMemoryExceeded(): boolean {
    return this.state.memoryUsageMB > this.state.maxMemoryMB;
  }

  /**
   * Evict least recently used tiles to free memory
   */
  evictLRU(targetMB: number): void {
    const sorted = Array.from(this.state.cachedTiles.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    for (const [key, tile] of sorted) {
      if (this.state.memoryUsageMB <= targetMB) break;
      this.unloadTile(key);
    }
  }
}
