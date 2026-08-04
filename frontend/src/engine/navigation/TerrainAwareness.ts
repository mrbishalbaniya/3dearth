import { Vector3 } from '@babylonjs/core';

export interface TerrainData {
  elevation: number;
  position: Vector3;
  gradient: number;
  type: TerrainType;
}

export interface TerrainAlert {
  type: AlertType;
  severity: AlertSeverity;
  position: Vector3;
  elevation: number;
  clearance: number;
  message: string;
  timestamp: Date;
}

export interface ObstacleData {
  id: string;
  name: string;
  position: Vector3;
  height: number;
  type: ObstacleType;
  isActive: boolean;
}

export enum TerrainType {
  MOUNTAIN = 'MOUNTAIN',
  HILL = 'HILL',
  VALLEY = 'VALLEY',
  PLATEAU = 'PLATEAU',
  GLACIER = 'GLACIER',
  LAKE = 'LAKE',
  RIVER = 'RIVER'
}

export enum AlertType {
  TERRAIN_AHEAD = 'TERRAIN_AHEAD',
  TERRAIN_BELOW = 'TERRAIN_BELOW',
  OBSTACLE_AHEAD = 'OBSTACLE_AHEAD',
  MINIMUM_SAFE_ALTITUDE = 'MSA',
  GROUND_PROXIMITY = 'GPWS'
}

export enum AlertSeverity {
  INFO = 'INFO',
  CAUTION = 'CAUTION',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export enum ObstacleType {
  TOWER = 'TOWER',
  BUILDING = 'BUILDING',
  ANTENNA = 'ANTENNA',
  MOUNTAIN_PEAK = 'MOUNTAIN_PEAK',
  POWER_LINE = 'POWER_LINE',
  BRIDGE = 'BRIDGE'
}

export class TerrainAwareness {
  private terrainDatabase: Map<string, TerrainData>;
  private obstacleDatabase: Map<string, ObstacleData>;
  private activeAlerts: Map<string, TerrainAlert>;
  private alertCallbacks: Set<(alert: boolean) => void>;
  private detailCallbacks: Set<(alert: TerrainAlert) => void>;
  private lookAheadDistance: number;
  private minimumClearance: number;
  private gridSize: number;
  private isActive: boolean;

  constructor() {
    this.terrainDatabase = new Map();
    this.obstacleDatabase = new Map();
    this.activeAlerts = new Map();
    this.alertCallbacks = new Set();
    this.detailCallbacks = new Set();
    this.lookAheadDistance = 10000;
    this.minimumClearance = 1000;
    this.gridSize = 0.01;
    this.isActive = false;

    this.loadNepalTerrain();
    this.loadNepalObstacles();
  }

  public initialize(): void {
    if (this.isActive) return;
    this.isActive = true;
  }

  public shutdown(): void {
    this.isActive = false;
    this.activeAlerts.clear();
  }
  private loadNepalTerrain(): void {
    const terrainPoints = [
      { pos: new Vector3(86.9250, 27.9881, 0), elevation: 8849, type: TerrainType.MOUNTAIN, gradient: 45 },
      { pos: new Vector3(86.9240, 27.9870, 0), elevation: 8700, type: TerrainType.MOUNTAIN, gradient: 40 },
      { pos: new Vector3(86.9260, 27.9890, 0), elevation: 8600, type: TerrainType.MOUNTAIN, gradient: 38 },
      { pos: new Vector3(83.8931, 28.5169, 0), elevation: 8091, type: TerrainType.MOUNTAIN, gradient: 42 },
      { pos: new Vector3(83.9478, 28.4969, 0), elevation: 6993, type: TerrainType.MOUNTAIN, gradient: 35 },
      { pos: new Vector3(85.8357, 28.0960, 0), elevation: 8516, type: TerrainType.MOUNTAIN, gradient: 44 },
      { pos: new Vector3(86.6608, 27.9617, 0), elevation: 8201, type: TerrainType.MOUNTAIN, gradient: 41 },
      { pos: new Vector3(85.3591, 27.6966, 0), elevation: 1400, type: TerrainType.VALLEY, gradient: 5 },
      { pos: new Vector3(83.9819, 28.2008, 0), elevation: 827, type: TerrainType.VALLEY, gradient: 8 },
      { pos: new Vector3(86.7319, 27.6869, 0), elevation: 2845, type: TerrainType.PLATEAU, gradient: 15 },
      { pos: new Vector3(84.7278, 28.2297, 0), elevation: 6654, type: TerrainType.MOUNTAIN, gradient: 39 },
      { pos: new Vector3(85.7472, 27.8881, 0), elevation: 7162, type: TerrainType.MOUNTAIN, gradient: 37 },
      { pos: new Vector3(84.5639, 28.6961, 0), elevation: 8167, type: TerrainType.MOUNTAIN, gradient: 43 },
      { pos: new Vector3(86.5500, 28.0942, 0), elevation: 7864, type: TerrainType.MOUNTAIN, gradient: 40 },
      { pos: new Vector3(85.1661, 27.9700, 0), elevation: 5500, type: TerrainType.HILL, gradient: 25 },
      { pos: new Vector3(84.8347, 27.8389, 0), elevation: 4200, type: TerrainType.HILL, gradient: 20 },
      { pos: new Vector3(85.5400, 27.7500, 0), elevation: 3800, type: TerrainType.HILL, gradient: 18 },
      { pos: new Vector3(83.7228, 28.7806, 0), elevation: 2743, type: TerrainType.PLATEAU, gradient: 12 },
      { pos: new Vector3(84.4294, 27.6783, 0), elevation: 125, type: TerrainType.VALLEY, gradient: 3 },
      { pos: new Vector3(87.2639, 26.5711, 0), elevation: 92, type: TerrainType.VALLEY, gradient: 2 }
    ];

    for (const point of terrainPoints) {
      const gridKey = this.getGridKey(point.pos);
      this.terrainDatabase.set(gridKey, {
        elevation: point.elevation,
        position: point.pos,
        gradient: point.gradient,
        type: point.type
      });
    }

    this.interpolateTerrainData();
  }

  private loadNepalObstacles(): void {
    const obstacles = [
      {
        id: 'TOWER_KTM_001',
        name: 'Kathmandu TV Tower',
        position: new Vector3(85.3200, 27.7100, 0),
        height: 200,
        type: ObstacleType.TOWER,
        isActive: true
      },
      {
        id: 'ANTENNA_PKR_001',
        name: 'Pokhara Radio Antenna',
        position: new Vector3(84.0000, 28.2200, 0),
        height: 150,
        type: ObstacleType.ANTENNA,
        isActive: true
      },
      {
        id: 'PEAK_EVT_001',
        name: 'Mount Everest',
        position: new Vector3(86.9250, 27.9881, 0),
        height: 8849,
        type: ObstacleType.MOUNTAIN_PEAK,
        isActive: true
      },
      {
        id: 'PEAK_ANN_001',
        name: 'Annapurna I',
        position: new Vector3(83.8931, 28.5169, 0),
        height: 8091,
        type: ObstacleType.MOUNTAIN_PEAK,
        isActive: true
      },
      {
        id: 'PEAK_MAN_001',
        name: 'Manaslu',
        position: new Vector3(84.5639, 28.6961, 0),
        height: 8167,
        type: ObstacleType.MOUNTAIN_PEAK,
        isActive: true
      },
      {
        id: 'PEAK_CHO_001',
        name: 'Cho Oyu',
        position: new Vector3(86.6608, 27.9617, 0),
        height: 8201,
        type: ObstacleType.MOUNTAIN_PEAK,
        isActive: true
      },
      {
        id: 'PEAK_DHU_001',
        name: 'Dhaulagiri',
        position: new Vector3(83.4933, 28.6961, 0),
        height: 8167,
        type: ObstacleType.MOUNTAIN_PEAK,
        isActive: true
      },
      {
        id: 'BRIDGE_BAG_001',
        name: 'Bagmati Bridge',
        position: new Vector3(85.3240, 27.7172, 0),
        height: 50,
        type: ObstacleType.BRIDGE,
        isActive: true
      },
      {
        id: 'POWERLINE_KTM_001',
        name: 'Kathmandu Power Lines',
        position: new Vector3(85.3400, 27.6800, 0),
        height: 80,
        type: ObstacleType.POWER_LINE,
        isActive: true
      },
      {
        id: 'BUILDING_KTM_001',
        name: 'Kathmandu High Rise',
        position: new Vector3(85.3150, 27.7050, 0),
        height: 120,
        type: ObstacleType.BUILDING,
        isActive: true
      }
    ];

    for (const obstacle of obstacles) {
      this.obstacleDatabase.set(obstacle.id, obstacle);
    }
  }
  private interpolateTerrainData(): void {
    const bounds = this.getNepalBounds();
    const step = this.gridSize / 2;

    for (let lon = bounds.minLon; lon <= bounds.maxLon; lon += step) {
      for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += step) {
        const position = new Vector3(lon, lat, 0);
        const gridKey = this.getGridKey(position);

        if (!this.terrainDatabase.has(gridKey)) {
          const elevation = this.interpolateElevation(position);
          const gradient = this.calculateGradient(position);
          const type = this.classifyTerrain(elevation, gradient);

          this.terrainDatabase.set(gridKey, {
            elevation,
            position,
            gradient,
            type
          });
        }
      }
    }
  }

  private getNepalBounds(): { minLon: number; maxLon: number; minLat: number; maxLat: number } {
    return {
      minLon: 80.0,
      maxLon: 88.2,
      minLat: 26.3,
      maxLat: 30.5
    };
  }

  private interpolateElevation(position: Vector3): number {
    const nearbyPoints = this.getNearbyTerrainPoints(position, 0.5);
    
    if (nearbyPoints.length === 0) {
      return this.estimateElevationByRegion(position);
    }

    let totalWeight = 0;
    let weightedElevation = 0;

    for (const point of nearbyPoints) {
      const distance = this.calculateDistance(position, point.position);
      const weight = 1 / Math.max(distance, 0.001);
      
      totalWeight += weight;
      weightedElevation += point.elevation * weight;
    }

    return totalWeight > 0 ? weightedElevation / totalWeight : 0;
  }

  private estimateElevationByRegion(position: Vector3): number {
    if (position.x >= 86.5 && position.y >= 27.5) return 6000;
    if (position.x >= 83.5 && position.x <= 84.5 && position.y >= 28.0) return 5000;
    if (position.y >= 28.5) return 4000;
    if (position.y <= 27.0) return 500;
    return 2000;
  }

  private getNearbyTerrainPoints(position: Vector3, radius: number): TerrainData[] {
    const nearby: TerrainData[] = [];

    for (const terrainData of this.terrainDatabase.values()) {
      const distance = this.calculateDistance(position, terrainData.position);
      if (distance <= radius) {
        nearby.push(terrainData);
      }
    }

    return nearby;
  }

  private calculateGradient(position: Vector3): number {
    const step = 0.01;
    const centerElevation = this.getTerrainElevation(position);
    
    const eastElevation = this.getTerrainElevation(new Vector3(position.x + step, position.y, 0));
    const westElevation = this.getTerrainElevation(new Vector3(position.x - step, position.y, 0));
    const northElevation = this.getTerrainElevation(new Vector3(position.x, position.y + step, 0));
    const southElevation = this.getTerrainElevation(new Vector3(position.x, position.y - step, 0));

    const slopeX = (eastElevation - westElevation) / (2 * step * 111000);
    const slopeY = (northElevation - southElevation) / (2 * step * 111000);

    return Math.atan(Math.sqrt(slopeX * slopeX + slopeY * slopeY)) * (180 / Math.PI);
  }

  private classifyTerrain(elevation: number, gradient: number): TerrainType {
    if (elevation > 6000) return TerrainType.MOUNTAIN;
    if (elevation > 3000 && gradient > 20) return TerrainType.MOUNTAIN;
    if (elevation > 1500 && gradient > 10) return TerrainType.HILL;
    if (elevation > 3000) return TerrainType.PLATEAU;
    if (elevation < 500) return TerrainType.VALLEY;
    return TerrainType.HILL;
  }

  private getGridKey(position: Vector3): string {
    const gridX = Math.floor(position.x / this.gridSize);
    const gridY = Math.floor(position.y / this.gridSize);
    return `${gridX},${gridY}`;
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) +
      Math.pow(pos1.y - pos2.y, 2)
    );
  }
  public update(position: Vector3, altitude: number): void {
    if (!this.isActive) return;

    this.clearExpiredAlerts();
    this.checkTerrainAhead(position, altitude);
    this.checkTerrainBelow(position, altitude);
    this.checkObstacles(position, altitude);
    this.checkMinimumSafeAltitude(position, altitude);
    this.checkGroundProximity(position, altitude);

    const hasAlerts = this.activeAlerts.size > 0;
    this.notifyAlertStatus(hasAlerts);
  }

  private clearExpiredAlerts(): void {
    const now = new Date();
    const expiredAlerts: string[] = [];

    for (const [id, alert] of this.activeAlerts) {
      if (now.getTime() - alert.timestamp.getTime() > 10000) {
        expiredAlerts.push(id);
      }
    }

    for (const id of expiredAlerts) {
      this.activeAlerts.delete(id);
    }
  }

  private checkTerrainAhead(position: Vector3, altitude: number): void {
    const lookAheadPoints = this.generateLookAheadPoints(position, 5);

    for (const point of lookAheadPoints) {
      const terrainElevation = this.getTerrainElevation(point);
      const clearance = altitude - terrainElevation;

      if (clearance < this.minimumClearance) {
        this.createAlert(
          'TERRAIN_AHEAD',
          AlertType.TERRAIN_AHEAD,
          clearance < 500 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
          point,
          terrainElevation,
          clearance,
          `Terrain ahead: ${Math.round(clearance)}ft clearance`
        );
      }
    }
  }

  private checkTerrainBelow(position: Vector3, altitude: number): void {
    const terrainElevation = this.getTerrainElevation(position);
    const clearance = altitude - terrainElevation;

    if (clearance < this.minimumClearance) {
      this.createAlert(
        'TERRAIN_BELOW',
        AlertType.TERRAIN_BELOW,
        clearance < 300 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        position,
        terrainElevation,
        clearance,
        `Low terrain clearance: ${Math.round(clearance)}ft`
      );
    }
  }

  private checkObstacles(position: Vector3, altitude: number): void {
    for (const obstacle of this.obstacleDatabase.values()) {
      if (!obstacle.isActive) continue;

      const distance = this.calculateDistance(position, obstacle.position) * 111000;
      
      if (distance < this.lookAheadDistance) {
        const obstacleTop = this.getTerrainElevation(obstacle.position) + obstacle.height;
        const clearance = altitude - obstacleTop;

        if (clearance < this.minimumClearance && distance < 5000) {
          this.createAlert(
            `OBSTACLE_${obstacle.id}`,
            AlertType.OBSTACLE_AHEAD,
            clearance < 200 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
            obstacle.position,
            obstacleTop,
            clearance,
            `${obstacle.name}: ${Math.round(clearance)}ft clearance`
          );
        }
      }
    }
  }

  private checkMinimumSafeAltitude(position: Vector3, altitude: number): void {
    const msa = this.calculateMinimumSafeAltitude(position);
    
    if (altitude < msa) {
      this.createAlert(
        'MSA_VIOLATION',
        AlertType.MINIMUM_SAFE_ALTITUDE,
        altitude < msa - 500 ? AlertSeverity.CRITICAL : AlertSeverity.CAUTION,
        position,
        msa,
        altitude - msa,
        `Below MSA: ${Math.round(msa)}ft required`
      );
    }
  }

  private checkGroundProximity(position: Vector3, altitude: number): void {
    const groundElevation = this.getTerrainElevation(position);
    const agl = altitude - groundElevation;

    if (agl < 500) {
      this.createAlert(
        'GPWS',
        AlertType.GROUND_PROXIMITY,
        agl < 200 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        position,
        groundElevation,
        agl,
        `Ground proximity: ${Math.round(agl)}ft AGL`
      );
    }
  }
  private generateLookAheadPoints(position: Vector3, count: number): Vector3[] {
    const points: Vector3[] = [];
    const stepSize = this.lookAheadDistance / count / 111000;

    for (let i = 1; i <= count; i++) {
      const lookAheadPoint = new Vector3(
        position.x + (stepSize * i),
        position.y,
        0
      );
      points.push(lookAheadPoint);
    }

    return points;
  }

  public getTerrainElevation(position: Vector3): number {
    const gridKey = this.getGridKey(position);
    const terrainData = this.terrainDatabase.get(gridKey);

    if (terrainData) {
      return terrainData.elevation;
    }

    return this.interpolateElevation(position);
  }

  private calculateMinimumSafeAltitude(position: Vector3): number {
    const radius = 0.1;
    let maxElevation = 0;

    for (const terrainData of this.terrainDatabase.values()) {
      const distance = this.calculateDistance(position, terrainData.position);
      if (distance <= radius) {
        maxElevation = Math.max(maxElevation, terrainData.elevation);
      }
    }

    for (const obstacle of this.obstacleDatabase.values()) {
      const distance = this.calculateDistance(position, obstacle.position);
      if (distance <= radius) {
        const obstacleTop = this.getTerrainElevation(obstacle.position) + obstacle.height;
        maxElevation = Math.max(maxElevation, obstacleTop);
      }
    }

    return maxElevation + 1000;
  }

  private createAlert(
    id: string,
    type: AlertType,
    severity: AlertSeverity,
    position: Vector3,
    elevation: number,
    clearance: number,
    message: string
  ): void {
    const alert: TerrainAlert = {
      type,
      severity,
      position: position.clone(),
      elevation,
      clearance,
      message,
      timestamp: new Date()
    };

    this.activeAlerts.set(id, alert);
    this.notifyAlertDetails(alert);
  }

  private notifyAlertStatus(hasAlerts: boolean): void {
    for (const callback of this.alertCallbacks) {
      callback(hasAlerts);
    }
  }

  private notifyAlertDetails(alert: TerrainAlert): void {
    for (const callback of this.detailCallbacks) {
      callback(alert);
    }
  }

  public onAlert(callback: (hasAlert: boolean) => void): void {
    this.alertCallbacks.add(callback);
  }

  public onAlertDetails(callback: (alert: TerrainAlert) => void): void {
    this.detailCallbacks.add(callback);
  }

  public removeAlertCallback(callback: (hasAlert: boolean) => void): void {
    this.alertCallbacks.delete(callback);
  }

  public removeAlertDetailsCallback(callback: (alert: TerrainAlert) => void): void {
    this.detailCallbacks.delete(callback);
  }

  public getActiveAlerts(): TerrainAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAlertsCount(): number {
    return this.activeAlerts.size;
  }

  public getCriticalAlertsCount(): number {
    let count = 0;
    for (const alert of this.activeAlerts.values()) {
      if (alert.severity === AlertSeverity.CRITICAL) {
        count++;
      }
    }
    return count;
  }

  public clearAllAlerts(): void {
    this.activeAlerts.clear();
  }

  public setLookAheadDistance(distance: number): void {
    this.lookAheadDistance = Math.max(1000, Math.min(20000, distance));
  }

  public setMinimumClearance(clearance: number): void {
    this.minimumClearance = Math.max(100, Math.min(5000, clearance));
  }

  public getObstacle(id: string): ObstacleData | undefined {
    return this.obstacleDatabase.get(id);
  }

  public getAllObstacles(): ObstacleData[] {
    return Array.from(this.obstacleDatabase.values());
  }

  public getObstaclesInRange(position: Vector3, range: number): ObstacleData[] {
    const obstacles: ObstacleData[] = [];

    for (const obstacle of this.obstacleDatabase.values()) {
      const distance = this.calculateDistance(position, obstacle.position) * 111000;
      if (distance <= range) {
        obstacles.push(obstacle);
      }
    }

    return obstacles;
  }

  public getTerrainType(position: Vector3): TerrainType {
    const gridKey = this.getGridKey(position);
    const terrainData = this.terrainDatabase.get(gridKey);
    return terrainData?.type || TerrainType.VALLEY;
  }

  public getTerrainGradient(position: Vector3): number {
    const gridKey = this.getGridKey(position);
    const terrainData = this.terrainDatabase.get(gridKey);
    return terrainData?.gradient || 0;
  }

  public predictTerrainAhead(position: Vector3, distance: number, points: number = 10): TerrainData[] {
    const predictions: TerrainData[] = [];
    const step = distance / points / 111000;

    for (let i = 1; i <= points; i++) {
      const predictedPosition = new Vector3(
        position.x + (step * i),
        position.y,
        0
      );

      const elevation = this.getTerrainElevation(predictedPosition);
      const gradient = this.getTerrainGradient(predictedPosition);
      const type = this.getTerrainType(predictedPosition);

      predictions.push({
        elevation,
        position: predictedPosition,
        gradient,
        type
      });
    }

    return predictions;
  }
}