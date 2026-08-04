import { Vector3 } from '@babylonjs/core';

export interface ObstacleInfo {
  id: string;
  name: string;
  position: Vector3;
  height: number;
  elevation: number;
  type: ObstacleType;
  category: ObstacleCategory;
  isActive: boolean;
  lightingConfig: LightingConfig;
  frequency?: number;
  callsign?: string;
  owner?: string;
  constructionDate?: Date;
  lastInspection?: Date;
}

export interface LightingConfig {
  hasLighting: boolean;
  lightType: LightType;
  operatingHours: OperatingHours;
  intensity: number;
  flashPattern?: FlashPattern;
}

export interface OperatingHours {
  isActive: boolean;
  startTime?: string;
  endTime?: string;
  isDuskToDawn?: boolean;
}

export enum ObstacleType {
  COMMUNICATION_TOWER = 'COMMUNICATION_TOWER',
  RADIO_TOWER = 'RADIO_TOWER',
  TV_TOWER = 'TV_TOWER',
  CELL_TOWER = 'CELL_TOWER',
  POWER_LINE = 'POWER_LINE',
  TRANSMISSION_LINE = 'TRANSMISSION_LINE',
  ANTENNA = 'ANTENNA',
  BUILDING = 'BUILDING',
  HIGH_RISE = 'HIGH_RISE',
  BRIDGE = 'BRIDGE',
  MOUNTAIN_PEAK = 'MOUNTAIN_PEAK',
  WIND_TURBINE = 'WIND_TURBINE',
  CHIMNEY = 'CHIMNEY',
  CRANE = 'CRANE',
  WATER_TOWER = 'WATER_TOWER'
}

export enum ObstacleCategory {
  NATURAL = 'NATURAL',
  ARTIFICIAL = 'ARTIFICIAL',
  TEMPORARY = 'TEMPORARY',
  PERMANENT = 'PERMANENT'
}

export enum LightType {
  NONE = 'NONE',
  RED_OBSTRUCTION = 'RED_OBSTRUCTION',
  WHITE_STROBE = 'WHITE_STROBE',
  DUAL_LIGHTING = 'DUAL_LIGHTING',
  LED_MEDIUM_INTENSITY = 'LED_MEDIUM_INTENSITY',
  LED_HIGH_INTENSITY = 'LED_HIGH_INTENSITY'
}

export enum FlashPattern {
  STEADY = 'STEADY',
  SLOW_FLASH = 'SLOW_FLASH',
  MEDIUM_FLASH = 'MEDIUM_FLASH',
  FAST_FLASH = 'FAST_FLASH'
}

export class ObstacleDatabase {
  private obstacles: Map<string, ObstacleInfo>;
  private spatialIndex: Map<string, Set<string>>;
  private gridSize: number;
  private isActive: boolean;

  constructor() {
    this.obstacles = new Map();
    this.spatialIndex = new Map();
    this.gridSize = 0.01;
    this.isActive = false;

    this.loadNepalObstacles();
  }

  public initialize(): void {
    if (this.isActive) return;
    this.buildSpatialIndex();
    this.isActive = true;
  }

  public shutdown(): void {
    this.isActive = false;
    this.obstacles.clear();
    this.spatialIndex.clear();
  }
  private loadNepalObstacles(): void {
    const obstacleData = [
      {
        id: 'NPL_KTM_TV_001',
        name: 'Kathmandu TV Tower',
        position: new Vector3(85.3200, 27.7100, 0),
        height: 200,
        elevation: 1350,
        type: ObstacleType.TV_TOWER,
        category: ObstacleCategory.PERMANENT,
        isActive: true,
        lightingConfig: {
          hasLighting: true,
          lightType: LightType.RED_OBSTRUCTION,
          operatingHours: { isActive: true, isDuskToDawn: true },
          intensity: 32,
          flashPattern: FlashPattern.SLOW_FLASH
        },
        frequency: 89.2,
        callsign: 'NTV',
        owner: 'Nepal Television Corporation'
      },
      {
        id: 'NPL_KTM_RADIO_001',
        name: 'Radio Nepal Tower',
        position: new Vector3(85.3150, 27.7050, 0),
        height: 150,
        elevation: 1340,
        type: ObstacleType.RADIO_TOWER,
        category: ObstacleCategory.PERMANENT,
        isActive: true,
        lightingConfig: {
          hasLighting: true,
          lightType: LightType.RED_OBSTRUCTION,
          operatingHours: { isActive: true, isDuskToDawn: true },
          intensity: 32,
          flashPattern: FlashPattern.MEDIUM_FLASH
        },
        frequency: 792,
        callsign: 'RADIO_NEPAL',
        owner: 'Radio Nepal'
      },
      {
        id: 'NPL_PKR_CELL_001',
        name: 'Pokhara Cell Tower',
        position: new Vector3(84.0000, 28.2200, 0),
        height: 80,
        elevation: 820,
        type: ObstacleType.CELL_TOWER,
        category: ObstacleCategory.PERMANENT,
        isActive: true,
        lightingConfig: {
          hasLighting: false,
          lightType: LightType.NONE,
          operatingHours: { isActive: false },
          intensity: 0
        },
        owner: 'Ncell'
      },
      {
        id: 'NPL_KTM_POWER_001',
        name: 'Kathmandu Transmission Lines',
        position: new Vector3(85.3400, 27.6800, 0),
        height: 80,
        elevation: 1300,
        type: ObstacleType.TRANSMISSION_LINE,
        category: ObstacleCategory.PERMANENT,
        isActive: true,
        lightingConfig: {
          hasLighting: false,
          lightType: LightType.NONE,
          operatingHours: { isActive: false },
          intensity: 0
        },
        owner: 'Nepal Electricity Authority'
      },
      {
        id: 'NPL_EVEREST_PEAK',
        name: 'Mount Everest',
        position: new Vector3(86.9250, 27.9881, 0),
        height: 8849,
        elevation: 0,
        type: ObstacleType.MOUNTAIN_PEAK,
        category: ObstacleCategory.NATURAL,
        isActive: true,
        lightingConfig: {
          hasLighting: false,
          lightType: LightType.NONE,
          operatingHours: { isActive: false },
          intensity: 0
        }
      },
      {
        id: 'NPL_ANNAPURNA_PEAK',
        name: 'Annapurna I',
        position: new Vector3(83.8931, 28.5169, 0),
        height: 8091,
        elevation: 0,
        type: ObstacleType.MOUNTAIN_PEAK,
        category: ObstacleCategory.NATURAL,
        isActive: true,
        lightingConfig: {
          hasLighting: false,
          lightType: LightType.NONE,
          operatingHours: { isActive: false },
          intensity: 0
        }
      },
      {
        id: 'NPL_MANASLU_PEAK',
        name: 'Manaslu',
        position: new Vector3(84.5639, 28.6961, 0),
        height: 8167,
        elevation: 0,
        type: ObstacleType.MOUNTAIN_PEAK,
        category: ObstacleCategory.NATURAL,
        isActive: true,
        lightingConfig: {
          hasLighting: false,
          lightType: LightType.NONE,
          operatingHours: { isActive: false },
          intensity: 0
        }
      },
      {
        id: 'NPL_CHOOYOU_PEAK',
        name: 'Cho Oyu',
        position: new Vector3(86.6608, 27.9617, 0),
        height: 8201,
        elevation: 0,
        type: ObstacleType.MOUNTAIN_PEAK,
        category: ObstacleCategory.NATURAL,
        isActive: true,
        lightingConfig: {
          hasLighting: false,
          lightType: LightType.NONE,
          operatingHours: { isActive: false },
          intensity: 0
        }
      },
      {
        id: 'NPL_KTM_BRIDGE_001',
        name: 'Bagmati Bridge',
        position: new Vector3(85.3240, 27.7172, 0),
        height: 50,
        elevation: 1320,
        type: ObstacleType.BRIDGE,
        category: ObstacleCategory.PERMANENT,
        isActive: true,
        lightingConfig: {
          hasLighting: true,
          lightType: LightType.WHITE_STROBE,
          operatingHours: { isActive: true, isDuskToDawn: true },
          intensity: 20,
          flashPattern: FlashPattern.FAST_FLASH
        },
        owner: 'Department of Roads'
      },
      {
        id: 'NPL_KTM_BUILDING_001',
        name: 'Kathmandu Corporate Tower',
        position: new Vector3(85.3150, 27.7050, 0),
        height: 120,
        elevation: 1370,
        type: ObstacleType.HIGH_RISE,
        category: ObstacleCategory.PERMANENT,
        isActive: true,
        lightingConfig: {
          hasLighting: true,
          lightType: LightType.LED_MEDIUM_INTENSITY,
          operatingHours: { isActive: true, isDuskToDawn: true },
          intensity: 125,
          flashPattern: FlashPattern.MEDIUM_FLASH
        },
        owner: 'Kathmandu Holdings'
      }
    ];

    for (const data of obstacleData) {
      const obstacle: ObstacleInfo = {
        ...data,
        constructionDate: data.id.includes('PEAK') ? undefined : new Date('2020-01-01'),
        lastInspection: data.id.includes('PEAK') ? undefined : new Date('2024-06-01')
      };

      this.obstacles.set(obstacle.id, obstacle);
    }
  }

  private buildSpatialIndex(): void {
    this.spatialIndex.clear();

    for (const [id, obstacle] of this.obstacles) {
      const gridKey = this.getGridKey(obstacle.position);
      
      if (!this.spatialIndex.has(gridKey)) {
        this.spatialIndex.set(gridKey, new Set());
      }
      
      this.spatialIndex.get(gridKey)!.add(id);
    }
  }

  private getGridKey(position: Vector3): string {
    const gridX = Math.floor(position.x / this.gridSize);
    const gridY = Math.floor(position.y / this.gridSize);
    return `${gridX},${gridY}`;
  }

  public getObstacle(id: string): ObstacleInfo | undefined {
    return this.obstacles.get(id);
  }

  public getAllObstacles(): ObstacleInfo[] {
    return Array.from(this.obstacles.values());
  }

  public getActiveObstacles(): ObstacleInfo[] {
    return Array.from(this.obstacles.values()).filter(obs => obs.isActive);
  }

  public getObstaclesByType(type: ObstacleType): ObstacleInfo[] {
    return Array.from(this.obstacles.values()).filter(obs => obs.type === type);
  }

  public getObstaclesByCategory(category: ObstacleCategory): ObstacleInfo[] {
    return Array.from(this.obstacles.values()).filter(obs => obs.category === category);
  }
  public getObstaclesInRange(center: Vector3, radius: number): ObstacleInfo[] {
    const obstacles: ObstacleInfo[] = [];
    const radiusInDegrees = radius / 111000;

    const minX = center.x - radiusInDegrees;
    const maxX = center.x + radiusInDegrees;
    const minY = center.y - radiusInDegrees;
    const maxY = center.y + radiusInDegrees;

    const gridKeys = this.getGridKeysInBounds(minX, maxX, minY, maxY);

    for (const gridKey of gridKeys) {
      const obstacleIds = this.spatialIndex.get(gridKey);
      if (!obstacleIds) continue;

      for (const id of obstacleIds) {
        const obstacle = this.obstacles.get(id);
        if (!obstacle || !obstacle.isActive) continue;

        const distance = this.calculateDistance(center, obstacle.position);
        if (distance <= radiusInDegrees) {
          obstacles.push(obstacle);
        }
      }
    }

    return obstacles;
  }

  public getObstaclesAboveHeight(minHeight: number): ObstacleInfo[] {
    return Array.from(this.obstacles.values()).filter(obs => 
      obs.isActive && obs.height >= minHeight
    );
  }

  public getLitObstacles(): ObstacleInfo[] {
    return Array.from(this.obstacles.values()).filter(obs => 
      obs.isActive && obs.lightingConfig.hasLighting
    );
  }

  public getObstaclesWithFrequency(): ObstacleInfo[] {
    return Array.from(this.obstacles.values()).filter(obs => 
      obs.isActive && obs.frequency !== undefined
    );
  }

  private getGridKeysInBounds(minX: number, maxX: number, minY: number, maxY: number): string[] {
    const keys: string[] = [];

    const minGridX = Math.floor(minX / this.gridSize);
    const maxGridX = Math.floor(maxX / this.gridSize);
    const minGridY = Math.floor(minY / this.gridSize);
    const maxGridY = Math.floor(maxY / this.gridSize);

    for (let x = minGridX; x <= maxGridX; x++) {
      for (let y = minGridY; y <= maxGridY; y++) {
        keys.push(`${x},${y}`);
      }
    }

    return keys;
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) +
      Math.pow(pos1.y - pos2.y, 2)
    );
  }

  public findNearestObstacle(position: Vector3, maxDistance: number = 50000): ObstacleInfo | null {
    let nearestObstacle: ObstacleInfo | null = null;
    let nearestDistance = Infinity;

    const obstacles = this.getObstaclesInRange(position, maxDistance);

    for (const obstacle of obstacles) {
      const distance = this.calculateDistance(position, obstacle.position) * 111000;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestObstacle = obstacle;
      }
    }

    return nearestObstacle;
  }

  public findObstaclesByOwner(owner: string): ObstacleInfo[] {
    return Array.from(this.obstacles.values()).filter(obs => 
      obs.owner && obs.owner.toLowerCase().includes(owner.toLowerCase())
    );
  }

  public findObstaclesByCallsign(callsign: string): ObstacleInfo[] {
    return Array.from(this.obstacles.values()).filter(obs => 
      obs.callsign && obs.callsign.toLowerCase().includes(callsign.toLowerCase())
    );
  }

  public getObstacleHeight(id: string): number {
    const obstacle = this.obstacles.get(id);
    return obstacle ? obstacle.height + obstacle.elevation : 0;
  }

  public isObstacleLit(id: string, currentTime?: Date): boolean {
    const obstacle = this.obstacles.get(id);
    if (!obstacle || !obstacle.lightingConfig.hasLighting) return false;

    const config = obstacle.lightingConfig;
    if (!config.operatingHours.isActive) return false;

    if (config.operatingHours.isDuskToDawn) {
      const now = currentTime || new Date();
      const hour = now.getHours();
      return hour < 6 || hour > 18;
    }

    return true;
  }

  public addObstacle(obstacle: ObstacleInfo): void {
    this.obstacles.set(obstacle.id, obstacle);
    
    const gridKey = this.getGridKey(obstacle.position);
    if (!this.spatialIndex.has(gridKey)) {
      this.spatialIndex.set(gridKey, new Set());
    }
    this.spatialIndex.get(gridKey)!.add(obstacle.id);
  }

  public removeObstacle(id: string): boolean {
    const obstacle = this.obstacles.get(id);
    if (!obstacle) return false;

    this.obstacles.delete(id);

    const gridKey = this.getGridKey(obstacle.position);
    const gridSet = this.spatialIndex.get(gridKey);
    if (gridSet) {
      gridSet.delete(id);
      if (gridSet.size === 0) {
        this.spatialIndex.delete(gridKey);
      }
    }

    return true;
  }

  public updateObstacle(id: string, updates: Partial<ObstacleInfo>): boolean {
    const obstacle = this.obstacles.get(id);
    if (!obstacle) return false;

    if (updates.position && !updates.position.equals(obstacle.position)) {
      const oldGridKey = this.getGridKey(obstacle.position);
      const newGridKey = this.getGridKey(updates.position);

      if (oldGridKey !== newGridKey) {
        const oldGridSet = this.spatialIndex.get(oldGridKey);
        if (oldGridSet) {
          oldGridSet.delete(id);
          if (oldGridSet.size === 0) {
            this.spatialIndex.delete(oldGridKey);
          }
        }

        if (!this.spatialIndex.has(newGridKey)) {
          this.spatialIndex.set(newGridKey, new Set());
        }
        this.spatialIndex.get(newGridKey)!.add(id);
      }
    }

    Object.assign(obstacle, updates);
    return true;
  }

  public getObstacleCount(): number {
    return this.obstacles.size;
  }

  public getActiveObstacleCount(): number {
    return Array.from(this.obstacles.values()).filter(obs => obs.isActive).length;
  }

  public exportObstacles(): ObstacleInfo[] {
    return Array.from(this.obstacles.values());
  }

  public importObstacles(obstacles: ObstacleInfo[]): void {
    this.obstacles.clear();
    this.spatialIndex.clear();

    for (const obstacle of obstacles) {
      this.addObstacle(obstacle);
    }
  }
}