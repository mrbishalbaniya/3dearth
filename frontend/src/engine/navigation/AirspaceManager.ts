import { Vector3 } from '@babylonjs/core';

export interface AirspaceZone {
  id: string;
  name: string;
  type: AirspaceType;
  geometry: AirspaceGeometry;
  minAltitude: number;
  maxAltitude: number;
  restrictions: AirspaceRestriction[];
  isActive: boolean;
  frequency?: string;
  operatingHours?: OperatingHours;
}

export enum AirspaceType {
  CTR = 'CTR',           // Control Zone
  TMA = 'TMA',           // Terminal Maneuvering Area
  FIR = 'FIR',           // Flight Information Region
  CTA = 'CTA',           // Control Area
  ATZ = 'ATZ',           // Aerodrome Traffic Zone
  RESTRICTED = 'RESTRICTED',
  PROHIBITED = 'PROHIBITED',
  DANGER = 'DANGER',
  MILITARY = 'MILITARY',
  TRAINING = 'TRAINING',
  NATIONAL_PARK = 'NATIONAL_PARK',
  NO_FLY = 'NO_FLY'
}

export enum AirspaceRestriction {
  NO_ENTRY = 'NO_ENTRY',
  CLEARANCE_REQUIRED = 'CLEARANCE_REQUIRED',
  ALTITUDE_RESTRICTED = 'ALTITUDE_RESTRICTED',
  TIME_RESTRICTED = 'TIME_RESTRICTED',
  CONTACT_ATC = 'CONTACT_ATC',
  TRANSPONDER_REQUIRED = 'TRANSPONDER_REQUIRED',
  RADIO_REQUIRED = 'RADIO_REQUIRED'
}

export interface AirspaceGeometry {
  type: 'POLYGON' | 'CIRCLE' | 'SECTOR';
  coordinates: Vector3[];
  center?: Vector3;
  radius?: number;
  startBearing?: number;
  endBearing?: number;
}

export interface OperatingHours {
  days: number[];  // 0=Sunday, 1=Monday, etc.
  startTime: string;  // HH:MM format
  endTime: string;    // HH:MM format
  timezone: string;
}

export interface AirspaceViolation {
  zone: AirspaceZone;
  position: Vector3;
  altitude: number;
  violationType: ViolationType;
  severity: ViolationSeverity;
  timestamp: Date;
}

export enum ViolationType {
  ENTRY = 'ENTRY',
  ALTITUDE = 'ALTITUDE',
  TIME = 'TIME',
  CLEARANCE = 'CLEARANCE'
}

export enum ViolationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CAUTION = 'CAUTION',
  CRITICAL = 'CRITICAL'
}

export class AirspaceManager {
  private airspaceZones: Map<string, AirspaceZone>;
  private activeZones: Set<string>;
  private violationCallbacks: Set<(violation: boolean) => void>;
  private violationDetailCallbacks: Set<(violation: AirspaceViolation) => void>;
  private spatialIndex: Map<string, AirspaceZone[]>;
  private gridSize: number;
  private isActive: boolean;

  constructor() {
    this.airspaceZones = new Map();
    this.activeZones = new Set();
    this.violationCallbacks = new Set();
    this.violationDetailCallbacks = new Set();
    this.spatialIndex = new Map();
    this.gridSize = 0.1; // Degrees for spatial indexing
    this.isActive = false;

    this.loadNepalAirspace();
  }

  public initialize(): void {
    if (this.isActive) return;
    this.buildSpatialIndex();
    this.isActive = true;
  }

  public shutdown(): void {
    this.isActive = false;
    this.activeZones.clear();
  }

  private loadNepalAirspace(): void {
    // Kathmandu Control Zone (CTR)
    this.addAirspaceZone({
      id: 'VNKT_CTR',
      name: 'Kathmandu Control Zone',
      type: AirspaceType.CTR,
      geometry: {
        type: 'CIRCLE',
        coordinates: [],
        center: new Vector3(85.3591, 27.6966, 0), // Kathmandu Airport
        radius: 0.0833 // 5 NM
      },
      minAltitude: 0,
      maxAltitude: 9500, // feet
      restrictions: [AirspaceRestriction.CLEARANCE_REQUIRED, AirspaceRestriction.CONTACT_ATC],
      isActive: true,
      frequency: '118.1'
    });

    // Kathmandu Terminal Maneuvering Area (TMA)
    this.addAirspaceZone({
      id: 'VNKT_TMA',
      name: 'Kathmandu Terminal Area',
      type: AirspaceType.TMA,
      geometry: {
        type: 'POLYGON',
        coordinates: [
          new Vector3(84.5, 27.0, 0),
          new Vector3(86.5, 27.0, 0),
          new Vector3(86.5, 28.5, 0),
          new Vector3(84.5, 28.5, 0),
          new Vector3(84.5, 27.0, 0)
        ]
      },
      minAltitude: 9500,
      maxAltitude: 25000,
      restrictions: [AirspaceRestriction.CLEARANCE_REQUIRED],
      isActive: true,
      frequency: '124.9'
    });

    // Pokhara Control Zone
    this.addAirspaceZone({
      id: 'VNPK_CTR',
      name: 'Pokhara Control Zone',
      type: AirspaceType.CTR,
      geometry: {
        type: 'CIRCLE',
        coordinates: [],
        center: new Vector3(83.9819, 28.2008, 0), // Pokhara Airport
        radius: 0.0833 // 5 NM
      },
      minAltitude: 0,
      maxAltitude: 8000,
      restrictions: [AirspaceRestriction.CLEARANCE_REQUIRED, AirspaceRestriction.CONTACT_ATC],
      isActive: true,
      frequency: '118.5'
    });

    // Lukla Control Zone
    this.addAirspaceZone({
      id: 'VNLK_CTR',
      name: 'Lukla Control Zone',
      type: AirspaceType.CTR,
      geometry: {
        type: 'CIRCLE',
        coordinates: [],
        center: new Vector3(86.7319, 27.6869, 0), // Lukla Airport
        radius: 0.0556 // 3 NM
      },
      minAltitude: 0,
      maxAltitude: 12000,
      restrictions: [AirspaceRestriction.CLEARANCE_REQUIRED, AirspaceRestriction.RADIO_REQUIRED],
      isActive: true,
      frequency: '118.3'
    });

    // Nepal Flight Information Region
    this.addAirspaceZone({
      id: 'NEPAL_FIR',
      name: 'Nepal Flight Information Region',
      type: AirspaceType.FIR,
      geometry: {
        type: 'POLYGON',
        coordinates: [
          new Vector3(80.0, 26.3, 0),
          new Vector3(88.2, 26.3, 0),
          new Vector3(88.2, 30.5, 0),
          new Vector3(80.0, 30.5, 0),
          new Vector3(80.0, 26.3, 0)
        ]
      },
      minAltitude: 25000,
      maxAltitude: 60000,
      restrictions: [AirspaceRestriction.CONTACT_ATC],
      isActive: true,
      frequency: '126.9'
    });

    // Sagarmatha National Park - Restricted Area
    this.addAirspaceZone({
      id: 'SAGARMATHA_RESTRICTED',
      name: 'Sagarmatha National Park',
      type: AirspaceType.NATIONAL_PARK,
      geometry: {
        type: 'POLYGON',
        coordinates: [
          new Vector3(86.5, 27.8, 0),
          new Vector3(86.9, 27.8, 0),
          new Vector3(86.9, 28.1, 0),
          new Vector3(86.5, 28.1, 0),
          new Vector3(86.5, 27.8, 0)
        ]
      },
      minAltitude: 0,
      maxAltitude: 25000,
      restrictions: [AirspaceRestriction.ALTITUDE_RESTRICTED, AirspaceRestriction.CLEARANCE_REQUIRED],
      isActive: true
    });

    // Annapurna Conservation Area
    this.addAirspaceZone({
      id: 'ANNAPURNA_RESTRICTED',
      name: 'Annapurna Conservation Area',
      type: AirspaceType.NATIONAL_PARK,
      geometry: {
        type: 'POLYGON',
        coordinates: [
          new Vector3(83.5, 28.2, 0),
          new Vector3(84.2, 28.2, 0),
          new Vector3(84.2, 28.8, 0),
          new Vector3(83.5, 28.8, 0),
          new Vector3(83.5, 28.2, 0)
        ]
      },
      minAltitude: 0,
      maxAltitude: 18000,
      restrictions: [AirspaceRestriction.ALTITUDE_RESTRICTED],
      isActive: true
    });

    // Military Training Area
    this.addAirspaceZone({
      id: 'MILITARY_TRAINING',
      name: 'Military Training Area',
      type: AirspaceType.MILITARY,
      geometry: {
        type: 'POLYGON',
        coordinates: [
          new Vector3(85.0, 27.3, 0),
          new Vector3(85.5, 27.3, 0),
          new Vector3(85.5, 27.8, 0),
          new Vector3(85.0, 27.8, 0),
          new Vector3(85.0, 27.3, 0)
        ]
      },
      minAltitude: 0,
      maxAltitude: 15000,
      restrictions: [AirspaceRestriction.NO_ENTRY],
      isActive: true,
      operatingHours: {
        days: [1, 2, 3, 4, 5], // Monday to Friday
        startTime: '08:00',
        endTime: '17:00',
        timezone: 'Asia/Kathmandu'
      }
    });
  }

  private addAirspaceZone(zone: AirspaceZone): void {
    this.airspaceZones.set(zone.id, zone);
  }

  private buildSpatialIndex(): void {
    this.spatialIndex.clear();
    
    for (const zone of this.airspaceZones.values()) {
      const gridCells = this.getGridCells(zone.geometry);
      
      for (const cell of gridCells) {
        if (!this.spatialIndex.has(cell)) {
          this.spatialIndex.set(cell, []);
        }
        this.spatialIndex.get(cell)!.push(zone);
      }
    }
  }

  private getGridCells(geometry: AirspaceGeometry): string[] {
    const cells = new Set<string>();
    
    if (geometry.type === 'CIRCLE' && geometry.center && geometry.radius) {
      const minLon = geometry.center.x - geometry.radius;
      const maxLon = geometry.center.x + geometry.radius;
      const minLat = geometry.center.y - geometry.radius;
      const maxLat = geometry.center.y + geometry.radius;
      
      for (let lon = Math.floor(minLon / this.gridSize) * this.gridSize; 
           lon <= maxLon; 
           lon += this.gridSize) {
        for (let lat = Math.floor(minLat / this.gridSize) * this.gridSize; 
             lat <= maxLat; 
             lat += this.gridSize) {
          cells.add(`${Math.floor(lon / this.gridSize)},${Math.floor(lat / this.gridSize)}`);
        }
      }
    } else if (geometry.type === 'POLYGON') {
      const bounds = this.getPolygonBounds(geometry.coordinates);
      
      for (let lon = bounds.minLon; lon <= bounds.maxLon; lon += this.gridSize) {
        for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += this.gridSize) {
          cells.add(`${Math.floor(lon / this.gridSize)},${Math.floor(lat / this.gridSize)}`);
        }
      }
    }
    
    return Array.from(cells);
  }

  private getPolygonBounds(coordinates: Vector3[]): { minLon: number; maxLon: number; minLat: number; maxLat: number } {
    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    for (const coord of coordinates) {
      minLon = Math.min(minLon, coord.x);
      maxLon = Math.max(maxLon, coord.x);
      minLat = Math.min(minLat, coord.y);
      maxLat = Math.max(maxLat, coord.y);
    }
    
    return { minLon, maxLon, minLat, maxLat };
  }

  public update(position: Vector3, altitude: number): void {
    if (!this.isActive) return;

    const gridCell = `${Math.floor(position.x / this.gridSize)},${Math.floor(position.y / this.gridSize)}`;
    const nearbyZones = this.spatialIndex.get(gridCell) || [];
    
    let hasViolation = false;
    
    for (const zone of nearbyZones) {
      if (!zone.isActive) continue;
      
      if (this.isInsideAirspace(position, altitude, zone)) {
        const violation = this.checkViolation(position, altitude, zone);
        
        if (violation) {
          hasViolation = true;
          this.notifyViolationDetail(violation);
        }
      }
    }
    
    this.notifyViolation(hasViolation);
  }

  private isInsideAirspace(position: Vector3, altitude: number, zone: AirspaceZone): boolean {
    // Check altitude bounds
    if (altitude < zone.minAltitude || altitude > zone.maxAltitude) {
      return false;
    }
    
    // Check operating hours
    if (zone.operatingHours && !this.isWithinOperatingHours(zone.operatingHours)) {
      return false;
    }
    
    // Check geometry
    const geometry = zone.geometry;
    
    if (geometry.type === 'CIRCLE') {
      if (!geometry.center || !geometry.radius) return false;
      
      const distance = Math.sqrt(
        Math.pow(position.x - geometry.center.x, 2) +
        Math.pow(position.y - geometry.center.y, 2)
      );
      
      return distance <= geometry.radius;
    } else if (geometry.type === 'POLYGON') {
      return this.isPointInPolygon(position, geometry.coordinates);
    }
    
    return false;
  }

  private isPointInPolygon(point: Vector3, polygon: Vector3[]): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  private isWithinOperatingHours(hours: OperatingHours): boolean {
    const now = new Date();
    const day = now.getDay();
    
    if (!hours.days.includes(day)) {
      return false;
    }
    
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= hours.startTime && currentTime <= hours.endTime;
  }

  private checkViolation(position: Vector3, altitude: number, zone: AirspaceZone): AirspaceViolation | null {
    const restrictions = zone.restrictions;
    
    for (const restriction of restrictions) {
      let violationType: ViolationType;
      let severity: ViolationSeverity;
      
      switch (restriction) {
        case AirspaceRestriction.NO_ENTRY:
          violationType = ViolationType.ENTRY;
          severity = ViolationSeverity.CRITICAL;
          break;
        case AirspaceRestriction.CLEARANCE_REQUIRED:
          violationType = ViolationType.CLEARANCE;
          severity = ViolationSeverity.WARNING;
          break;
        case AirspaceRestriction.ALTITUDE_RESTRICTED:
          violationType = ViolationType.ALTITUDE;
          severity = ViolationSeverity.CAUTION;
          break;
        default:
          continue;
      }
      
      return {
        zone,
        position: position.clone(),
        altitude,
        violationType,
        severity,
        timestamp: new Date()
      };
    }
    
    return null;
  }

  public getAirspaceZones(): AirspaceZone[] {
    return Array.from(this.airspaceZones.values());
  }

  public getAirspaceZone(id: string): AirspaceZone | null {
    return this.airspaceZones.get(id) || null;
  }

  public getActiveZones(): AirspaceZone[] {
    return Array.from(this.activeZones).map(id => this.airspaceZones.get(id)!).filter(Boolean);
  }

  public onAirspaceViolation(callback: (violation: boolean) => void): void {
    this.violationCallbacks.add(callback);
  }

  public onAirspaceViolationDetail(callback: (violation: AirspaceViolation) => void): void {
    this.violationDetailCallbacks.add(callback);
  }

  private notifyViolation(violation: boolean): void {
    this.violationCallbacks.forEach(callback => callback(violation));
  }

  private notifyViolationDetail(violation: AirspaceViolation): void {
    this.violationDetailCallbacks.forEach(callback => callback(violation));
  }
}