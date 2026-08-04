import { Vector3 } from '@babylonjs/core';

export interface Airport {
  icao: string;
  iata?: string;
  name: string;
  position: Vector3;
  elevation: number;
  runways: Runway[];
  taxiways: Taxiway[];
  parking: ParkingStand[];
  communications: Communication[];
  type: AirportType;
  isActive: boolean;
  hasCustoms: boolean;
  hasFuel: boolean;
  operatingHours?: OperatingHours;
  services: AirportService[];
}

export interface Runway {
  id: string;
  name: string;
  startPosition: Vector3;
  endPosition: Vector3;
  length: number;
  width: number;
  surface: SurfaceType;
  heading: number;
  ils?: ILSData;
  lighting: RunwayLighting;
  isActive: boolean;
}

export interface Taxiway {
  id: string;
  name: string;
  centerline: Vector3[];
  width: number;
  surface: SurfaceType;
  lighting: TaxiwayLighting;
  isActive: boolean;
}

export interface ParkingStand {
  id: string;
  name: string;
  position: Vector3;
  heading: number;
  type: ParkingType;
  aircraftCategory: AircraftCategory[];
  hasGPU: boolean;
  hasAirStart: boolean;
  hasFuel: boolean;
}

export interface Communication {
  name: string;
  frequency: string;
  type: CommunicationType;
  operatingHours?: string;
}

export interface ILSData {
  frequency: string;
  course: number;
  glideslopeAngle: number;
  category: ILSCategory;
}

export enum AirportType {
  INTERNATIONAL = 'INTERNATIONAL',
  DOMESTIC = 'DOMESTIC',
  REGIONAL = 'REGIONAL',
  AIRSTRIP = 'AIRSTRIP',
  HELIPORT = 'HELIPORT',
  MILITARY = 'MILITARY'
}

export enum SurfaceType {
  ASPHALT = 'ASPHALT',
  CONCRETE = 'CONCRETE',
  GRASS = 'GRASS',
  DIRT = 'DIRT',
  GRAVEL = 'GRAVEL'
}

export enum RunwayLighting {
  NONE = 'NONE',
  LOW_INTENSITY = 'LOW_INTENSITY',
  MEDIUM_INTENSITY = 'MEDIUM_INTENSITY',
  HIGH_INTENSITY = 'HIGH_INTENSITY'
}

export enum TaxiwayLighting {
  NONE = 'NONE',
  BLUE_EDGE = 'BLUE_EDGE',
  GREEN_CENTERLINE = 'GREEN_CENTERLINE'
}

export enum ParkingType {
  GATE = 'GATE',
  RAMP = 'RAMP',
  HANGAR = 'HANGAR',
  CARGO = 'CARGO',
  GA = 'GA'
}

export enum AircraftCategory {
  LIGHT = 'LIGHT',
  MEDIUM = 'MEDIUM',
  HEAVY = 'HEAVY',
  HELICOPTER = 'HELICOPTER'
}

export enum CommunicationType {
  TOWER = 'TOWER',
  GROUND = 'GROUND',
  APPROACH = 'APPROACH',
  DEPARTURE = 'DEPARTURE',
  ATIS = 'ATIS',
  UNICOM = 'UNICOM'
}

export enum ILSCategory {
  CAT_I = 'CAT_I',
  CAT_II = 'CAT_II',
  CAT_III = 'CAT_III'
}

export enum AirportService {
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  CATERING = 'CATERING',
  CUSTOMS = 'CUSTOMS',
  GROUND_HANDLING = 'GROUND_HANDLING',
  PASSENGER_SERVICES = 'PASSENGER_SERVICES'
}
export interface OperatingHours {
  open24Hours: boolean;
  schedule?: {
    day: number;
    openTime: string;
    closeTime: string;
  }[];
}

export class AirportDatabase {
  private airports: Map<string, Airport>;
  private icaoIndex: Map<string, Airport>;
  private iataIndex: Map<string, Airport>;
  private spatialIndex: Map<string, Airport[]>;
  private gridSize: number;
  private isLoaded: boolean;

  constructor() {
    this.airports = new Map();
    this.icaoIndex = new Map();
    this.iataIndex = new Map();
    this.spatialIndex = new Map();
    this.gridSize = 0.1;
    this.isLoaded = false;

    this.loadNepalAirports();
  }

  public initialize(): void {
    if (this.isLoaded) return;
    this.buildSpatialIndex();
    this.isLoaded = true;
  }

  private loadNepalAirports(): void {
    const airports: Airport[] = [
      {
        icao: 'VNKT',
        iata: 'KTM',
        name: 'Tribhuvan International Airport',
        position: new Vector3(85.3591, 27.6966, 0),
        elevation: 4390,
        type: AirportType.INTERNATIONAL,
        isActive: true,
        hasCustoms: true,
        hasFuel: true,
        runways: [
          {
            id: 'RWY02',
            name: '02/20',
            startPosition: new Vector3(85.3510, 27.6890, 0),
            endPosition: new Vector3(85.3672, 27.7042, 0),
            length: 3050,
            width: 45,
            surface: SurfaceType.ASPHALT,
            heading: 20,
            ils: {
              frequency: '109.50',
              course: 20,
              glideslopeAngle: 3.0,
              category: ILSCategory.CAT_I
            },
            lighting: RunwayLighting.HIGH_INTENSITY,
            isActive: true
          }
        ],
        taxiways: [
          {
            id: 'TWY_A',
            name: 'Taxiway A',
            centerline: [
              new Vector3(85.3591, 27.6966, 0),
              new Vector3(85.3600, 27.6980, 0)
            ],
            width: 23,
            surface: SurfaceType.ASPHALT,
            lighting: TaxiwayLighting.BLUE_EDGE,
            isActive: true
          }
        ],
        parking: [
          {
            id: 'GATE_1',
            name: 'Gate 1',
            position: new Vector3(85.3580, 27.6950, 0),
            heading: 200,
            type: ParkingType.GATE,
            aircraftCategory: [AircraftCategory.MEDIUM],
            hasGPU: true,
            hasAirStart: true,
            hasFuel: true
          }
        ],
        communications: [
          {
            name: 'Kathmandu Tower',
            frequency: '118.1',
            type: CommunicationType.TOWER
          },
          {
            name: 'Ground Control',
            frequency: '121.9',
            type: CommunicationType.GROUND
          },
          {
            name: 'Approach Control',
            frequency: '124.9',
            type: CommunicationType.APPROACH
          }
        ],
        services: [
          AirportService.FUEL,
          AirportService.CUSTOMS,
          AirportService.GROUND_HANDLING,
          AirportService.PASSENGER_SERVICES
        ]
      },
      {
        icao: 'VNPK',
        iata: 'PKR',
        name: 'Pokhara Regional Airport',
        position: new Vector3(83.9819, 28.2008, 0),
        elevation: 2712,
        type: AirportType.DOMESTIC,
        isActive: true,
        hasCustoms: false,
        hasFuel: true,
        runways: [
          {
            id: 'RWY12',
            name: '12/30',
            startPosition: new Vector3(83.9750, 28.1980, 0),
            endPosition: new Vector3(83.9888, 28.2036, 0),
            length: 1981,
            width: 30,
            surface: SurfaceType.ASPHALT,
            heading: 120,
            lighting: RunwayLighting.MEDIUM_INTENSITY,
            isActive: true
          }
        ],
        taxiways: [
          {
            id: 'TWY_B',
            name: 'Taxiway B',
            centerline: [
              new Vector3(83.9819, 28.2008, 0),
              new Vector3(83.9830, 28.2020, 0)
            ],
            width: 18,
            surface: SurfaceType.ASPHALT,
            lighting: TaxiwayLighting.BLUE_EDGE,
            isActive: true
          }
        ],
        parking: [
          {
            id: 'APRON_1',
            name: 'Apron 1',
            position: new Vector3(83.9810, 28.2000, 0),
            heading: 300,
            type: ParkingType.RAMP,
            aircraftCategory: [AircraftCategory.LIGHT, AircraftCategory.MEDIUM],
            hasGPU: false,
            hasAirStart: false,
            hasFuel: true
          }
        ],
        communications: [
          {
            name: 'Pokhara Tower',
            frequency: '118.5',
            type: CommunicationType.TOWER
          }
        ],
        services: [AirportService.FUEL, AirportService.GROUND_HANDLING]
      },
      {
        icao: 'VNLK',
        iata: 'LUA',
        name: 'Tenzing-Hillary Airport',
        position: new Vector3(86.7319, 27.6869, 0),
        elevation: 9334,
        type: AirportType.REGIONAL,
        isActive: true,
        hasCustoms: true,
        hasFuel: false,
        runways: [
          {
            id: 'RWY06',
            name: '06/24',
            startPosition: new Vector3(86.7280, 27.6860, 0),
            endPosition: new Vector3(86.7358, 27.6878, 0),
            length: 527,
            width: 20,
            surface: SurfaceType.ASPHALT,
            heading: 60,
            lighting: RunwayLighting.NONE,
            isActive: true
          }
        ],
        taxiways: [],
        parking: [
          {
            id: 'RAMP_1',
            name: 'Main Ramp',
            position: new Vector3(86.7330, 27.6870, 0),
            heading: 240,
            type: ParkingType.RAMP,
            aircraftCategory: [AircraftCategory.LIGHT],
            hasGPU: false,
            hasAirStart: false,
            hasFuel: false
          }
        ],
        communications: [
          {
            name: 'Lukla Radio',
            frequency: '118.3',
            type: CommunicationType.UNICOM
          }
        ],
        services: [AirportService.GROUND_HANDLING]
      },
      {
        icao: 'VNBW',
        iata: 'BWA',
        name: 'Bharatpur Airport',
        position: new Vector3(84.4294, 27.6783, 0),
        elevation: 415,
        type: AirportType.DOMESTIC,
        isActive: true,
        hasCustoms: false,
        hasFuel: true,
        runways: [
          {
            id: 'RWY03',
            name: '03/21',
            startPosition: new Vector3(84.4250, 27.6760, 0),
            endPosition: new Vector3(84.4338, 27.6806, 0),
            length: 1500,
            width: 30,
            surface: SurfaceType.ASPHALT,
            heading: 30,
            lighting: RunwayLighting.LOW_INTENSITY,
            isActive: true
          }
        ],
        taxiways: [],
        parking: [
          {
            id: 'APRON_A',
            name: 'Apron A',
            position: new Vector3(84.4290, 27.6790, 0),
            heading: 210,
            type: ParkingType.RAMP,
            aircraftCategory: [AircraftCategory.LIGHT],
            hasGPU: false,
            hasAirStart: false,
            hasFuel: true
          }
        ],
        communications: [
          {
            name: 'Bharatpur Radio',
            frequency: '118.7',
            type: CommunicationType.UNICOM
          }
        ],
        services: [AirportService.FUEL]
      },
      {
        icao: 'VNJM',
        iata: 'JMO',
        name: 'Jomsom Airport',
        position: new Vector3(83.7228, 28.7806, 0),
        elevation: 8976,
        type: AirportType.REGIONAL,
        isActive: true,
        hasCustoms: false,
        hasFuel: false,
        runways: [
          {
            id: 'RWY10',
            name: '10/28',
            startPosition: new Vector3(83.7200, 28.7800, 0),
            endPosition: new Vector3(83.7256, 28.7812, 0),
            length: 732,
            width: 20,
            surface: SurfaceType.GRAVEL,
            heading: 100,
            lighting: RunwayLighting.NONE,
            isActive: true
          }
        ],
        taxiways: [],
        parking: [
          {
            id: 'STAND_1',
            name: 'Stand 1',
            position: new Vector3(83.7240, 28.7810, 0),
            heading: 280,
            type: ParkingType.RAMP,
            aircraftCategory: [AircraftCategory.LIGHT],
            hasGPU: false,
            hasAirStart: false,
            hasFuel: false
          }
        ],
        communications: [
          {
            name: 'Jomsom Radio',
            frequency: '118.9',
            type: CommunicationType.UNICOM
          }
        ],
        services: []
      },
      {
        icao: 'VNBP',
        name: 'Bhadrapur Airport',
        position: new Vector3(87.2639, 26.5711, 0),
        elevation: 302,
        type: AirportType.DOMESTIC,
        isActive: true,
        hasCustoms: false,
        hasFuel: true,
        runways: [
          {
            id: 'RWY09',
            name: '09/27',
            startPosition: new Vector3(87.2600, 26.5700, 0),
            endPosition: new Vector3(87.2678, 26.5722, 0),
            length: 1500,
            width: 30,
            surface: SurfaceType.ASPHALT,
            heading: 90,
            lighting: RunwayLighting.LOW_INTENSITY,
            isActive: true
          }
        ],
        taxiways: [],
        parking: [
          {
            id: 'RAMP_A',
            name: 'Ramp A',
            position: new Vector3(87.2650, 26.5715, 0),
            heading: 270,
            type: ParkingType.RAMP,
            aircraftCategory: [AircraftCategory.LIGHT, AircraftCategory.MEDIUM],
            hasGPU: false,
            hasAirStart: false,
            hasFuel: true
          }
        ],
        communications: [
          {
            name: 'Bhadrapur Radio',
            frequency: '119.1',
            type: CommunicationType.UNICOM
          }
        ],
        services: [AirportService.FUEL]
      },
      {
        icao: 'VNBG',
        name: 'Baglung Airport',
        position: new Vector3(83.5975, 28.2158, 0),
        elevation: 3300,
        type: AirportType.REGIONAL,
        isActive: true,
        hasCustoms: false,
        hasFuel: false,
        runways: [
          {
            id: 'RWY15',
            name: '15/33',
            startPosition: new Vector3(83.5960, 28.2140, 0),
            endPosition: new Vector3(83.5990, 28.2176, 0),
            length: 800,
            width: 20,
            surface: SurfaceType.GRASS,
            heading: 150,
            lighting: RunwayLighting.NONE,
            isActive: true
          }
        ],
        taxiways: [],
        parking: [
          {
            id: 'GRASS_1',
            name: 'Grass Stand 1',
            position: new Vector3(83.5980, 28.2165, 0),
            heading: 330,
            type: ParkingType.RAMP,
            aircraftCategory: [AircraftCategory.LIGHT],
            hasGPU: false,
            hasAirStart: false,
            hasFuel: false
          }
        ],
        communications: [
          {
            name: 'Baglung Radio',
            frequency: '119.3',
            type: CommunicationType.UNICOM
          }
        ],
        services: []
      }
    ];

    for (const airport of airports) {
      this.addAirport(airport);
    }
  }
  private addAirport(airport: Airport): void {
    this.airports.set(airport.icao, airport);
    this.icaoIndex.set(airport.icao, airport);
    
    if (airport.iata) {
      this.iataIndex.set(airport.iata, airport);
    }
  }

  private buildSpatialIndex(): void {
    this.spatialIndex.clear();
    
    for (const airport of this.airports.values()) {
      const gridCell = this.getGridCell(airport.position);
      
      if (!this.spatialIndex.has(gridCell)) {
        this.spatialIndex.set(gridCell, []);
      }
      
      this.spatialIndex.get(gridCell)!.push(airport);
    }
  }

  private getGridCell(position: Vector3): string {
    const gridX = Math.floor(position.x / this.gridSize);
    const gridY = Math.floor(position.y / this.gridSize);
    return `${gridX},${gridY}`;
  }

  public getAirportByICAO(icao: string): Airport | null {
    return this.icaoIndex.get(icao.toUpperCase()) || null;
  }

  public getAirportByIATA(iata: string): Airport | null {
    return this.iataIndex.get(iata.toUpperCase()) || null;
  }

  public getAllAirports(): Airport[] {
    return Array.from(this.airports.values());
  }

  public getActiveAirports(): Airport[] {
    return Array.from(this.airports.values()).filter(airport => airport.isActive);
  }

  public getAirportsByType(type: AirportType): Airport[] {
    return Array.from(this.airports.values()).filter(airport => airport.type === type);
  }

  public getNearbyAirports(position: Vector3, radius: number = 1.0): Airport[] {
    const gridCells = this.getNearbyCells(position, radius);
    const nearbyAirports = new Set<Airport>();
    
    for (const cell of gridCells) {
      const airports = this.spatialIndex.get(cell) || [];
      
      for (const airport of airports) {
        const distance = this.calculateDistance(position, airport.position);
        if (distance <= radius) {
          nearbyAirports.add(airport);
        }
      }
    }
    
    return Array.from(nearbyAirports);
  }

  private getNearbyCells(position: Vector3, radius: number): string[] {
    const cells = new Set<string>();
    const gridRadius = Math.ceil(radius / this.gridSize);
    
    const centerX = Math.floor(position.x / this.gridSize);
    const centerY = Math.floor(position.y / this.gridSize);
    
    for (let x = centerX - gridRadius; x <= centerX + gridRadius; x++) {
      for (let y = centerY - gridRadius; y <= centerY + gridRadius; y++) {
        cells.add(`${x},${y}`);
      }
    }
    
    return Array.from(cells);
  }
  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) +
      Math.pow(pos1.y - pos2.y, 2)
    );
  }

  public getClosestAirport(position: Vector3): Airport | null {
    let closestAirport: Airport | null = null;
    let closestDistance = Infinity;
    
    for (const airport of this.airports.values()) {
      const distance = this.calculateDistance(position, airport.position);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestAirport = airport;
      }
    }
    
    return closestAirport;
  }

  public getRunway(airportIcao: string, runwayId: string): Runway | null {
    const airport = this.getAirportByICAO(airportIcao);
    if (!airport) return null;
    
    return airport.runways.find(runway => runway.id === runwayId) || null;
  }

  public getActiveRunways(airportIcao: string): Runway[] {
    const airport = this.getAirportByICAO(airportIcao);
    if (!airport) return [];
    
    return airport.runways.filter(runway => runway.isActive);
  }

  public getParkingStands(airportIcao: string, category?: AircraftCategory): ParkingStand[] {
    const airport = this.getAirportByICAO(airportIcao);
    if (!airport) return [];
    
    if (!category) {
      return airport.parking;
    }
    
    return airport.parking.filter(stand => 
      stand.aircraftCategory.includes(category)
    );
  }

  public getCommunication(airportIcao: string, type: CommunicationType): Communication | null {
    const airport = this.getAirportByICAO(airportIcao);
    if (!airport) return null;
    
    return airport.communications.find(comm => comm.type === type) || null;
  }

  public hasService(airportIcao: string, service: AirportService): boolean {
    const airport = this.getAirportByICAO(airportIcao);
    if (!airport) return false;
    
    return airport.services.includes(service);
  }

  public searchAirports(query: string): Airport[] {
    const searchTerm = query.toLowerCase();
    
    return Array.from(this.airports.values()).filter(airport => 
      airport.icao.toLowerCase().includes(searchTerm) ||
      (airport.iata && airport.iata.toLowerCase().includes(searchTerm)) ||
      airport.name.toLowerCase().includes(searchTerm)
    );
  }

  public isAirportOpen(icao: string): boolean {
    const airport = this.getAirportByICAO(icao);
    if (!airport || !airport.isActive) return false;
    
    if (!airport.operatingHours || airport.operatingHours.open24Hours) {
      return true;
    }
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const schedule = airport.operatingHours.schedule?.find(s => s.day === currentDay);
    
    if (!schedule) return false;
    
    return currentTime >= schedule.openTime && currentTime <= schedule.closeTime;
  }
}