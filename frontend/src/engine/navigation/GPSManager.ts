import { Vector3 } from '@babylonjs/core';

export interface GPSPosition {
  position: Vector3;
  altitude: number;
  heading: number;
  speed: number;
  accuracy: number;
  timestamp: Date;
}

export interface GPSSatellite {
  id: number;
  elevation: number;
  azimuth: number;
  signalStrength: number;
  isUsed: boolean;
}

export interface GPSStatus {
  isLocked: boolean;
  satelliteCount: number;
  usedSatellites: number;
  hdop: number;
  vdop: number;
  pdop: number;
  fixType: GPSFixType;
  lastUpdate: Date;
}

export enum GPSFixType {
  NO_FIX = 'NO_FIX',
  FIX_2D = 'FIX_2D',
  FIX_3D = 'FIX_3D',
  DGPS = 'DGPS',
  RTK_FLOAT = 'RTK_FLOAT',
  RTK_FIXED = 'RTK_FIXED'
}

export interface GPSConfig {
  updateRate: number;
  minSatellites: number;
  maxHdop: number;
  accuracyThreshold: number;
  enablePrediction: boolean;
  predictionTime: number;
}

export class GPSManager {
  private currentPosition: GPSPosition;
  private satellites: Map<number, GPSSatellite>;
  private status: GPSStatus;
  private config: GPSConfig;
  private positionHistory: GPSPosition[];
  private positionCallbacks: Set<(position: Vector3, heading: number, speed: number) => void>;
  private statusCallbacks: Set<(status: GPSStatus) => void>;
  private updateInterval: number;
  private isActive: boolean;
  private simulationMode: boolean;
  private simulatedTrack: Vector3[];
  private trackIndex: number;

  constructor(config: Partial<GPSConfig> = {}) {
    this.config = {
      updateRate: 10,
      minSatellites: 4,
      maxHdop: 2.5,
      accuracyThreshold: 10.0,
      enablePrediction: true,
      predictionTime: 1.0,
      ...config
    };

    this.satellites = new Map();
    this.positionHistory = [];
    this.positionCallbacks = new Set();
    this.statusCallbacks = new Set();
    this.updateInterval = 0;
    this.isActive = false;
    this.simulationMode = true;
    this.simulatedTrack = [];
    this.trackIndex = 0;

    this.currentPosition = {
      position: new Vector3(85.3591, 27.6966, 0),
      altitude: 4390,
      heading: 0,
      speed: 0,
      accuracy: 5.0,
      timestamp: new Date()
    };

    this.status = {
      isLocked: false,
      satelliteCount: 0,
      usedSatellites: 0,
      hdop: 99.9,
      vdop: 99.9,
      pdop: 99.9,
      fixType: GPSFixType.NO_FIX,
      lastUpdate: new Date()
    };

    this.initializeSimulation();
  }

  public initialize(): void {
    if (this.isActive) return;

    this.startGPSUpdates();
    this.simulateGPSAcquisition();
    this.isActive = true;
  }

  public shutdown(): void {
    if (!this.isActive) return;

    this.stopGPSUpdates();
    this.isActive = false;
  }
  private initializeSimulation(): void {
    this.simulatedTrack = [
      new Vector3(85.3591, 27.6966, 4390),
      new Vector3(85.3600, 27.7000, 4500),
      new Vector3(85.3620, 27.7050, 4800),
      new Vector3(85.3650, 27.7100, 5200),
      new Vector3(85.3680, 27.7150, 5600),
      new Vector3(85.3700, 27.7200, 6000),
      new Vector3(85.3720, 27.7250, 6400),
      new Vector3(85.3750, 27.7300, 6800),
      new Vector3(85.3780, 27.7350, 7200),
      new Vector3(85.3800, 27.7400, 7600)
    ];

    this.simulateSatellites();
  }

  private simulateSatellites(): void {
    const satelliteIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    for (const id of satelliteIds) {
      this.satellites.set(id, {
        id,
        elevation: 15 + Math.random() * 70,
        azimuth: Math.random() * 360,
        signalStrength: 20 + Math.random() * 30,
        isUsed: false
      });
    }
  }

  private startGPSUpdates(): void {
    const updatePeriod = 1000 / this.config.updateRate;
    
    this.updateInterval = window.setInterval(() => {
      this.updateGPSData();
    }, updatePeriod);
  }

  private stopGPSUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = 0;
    }
  }

  private updateGPSData(): void {
    this.updateSatelliteStatus();
    this.updatePosition();
    this.updateStatus();
    this.notifyCallbacks();
  }

  private updateSatelliteStatus(): void {
    let usedCount = 0;
    const currentTime = Date.now();

    for (const [id, satellite] of this.satellites) {
      satellite.elevation += (Math.random() - 0.5) * 2;
      satellite.azimuth = (satellite.azimuth + Math.random() * 2) % 360;
      satellite.signalStrength += (Math.random() - 0.5) * 5;
      
      satellite.elevation = Math.max(5, Math.min(85, satellite.elevation));
      satellite.signalStrength = Math.max(10, Math.min(50, satellite.signalStrength));
      
      satellite.isUsed = satellite.elevation > 15 && 
                       satellite.signalStrength > 25 && 
                       usedCount < 12;
      
      if (satellite.isUsed) {
        usedCount++;
      }
    }

    this.status.satelliteCount = this.satellites.size;
    this.status.usedSatellites = usedCount;
  }

  private updatePosition(): void {
    if (this.simulationMode && this.simulatedTrack.length > 0) {
      const targetPosition = this.simulatedTrack[this.trackIndex % this.simulatedTrack.length];
      
      const previousPosition = this.currentPosition.position.clone();
      
      this.currentPosition.position.x += (targetPosition.x - this.currentPosition.position.x) * 0.1;
      this.currentPosition.position.y += (targetPosition.y - this.currentPosition.position.y) * 0.1;
      this.currentPosition.altitude += (targetPosition.z - this.currentPosition.altitude) * 0.1;
      
      const distance = Vector3.Distance(previousPosition, this.currentPosition.position);
      if (distance < 0.001) {
        this.trackIndex++;
      }
      
      this.currentPosition.heading = this.calculateHeading(previousPosition, this.currentPosition.position);
      this.currentPosition.speed = this.calculateSpeed(distance);
      this.currentPosition.timestamp = new Date();
    }

    this.addPositionToHistory();
  }

  private calculateHeading(from: Vector3, to: Vector3): number {
    const deltaLon = to.x - from.x;
    const deltaLat = to.y - from.y;
    
    let heading = Math.atan2(deltaLon, deltaLat) * (180 / Math.PI);
    if (heading < 0) heading += 360;
    
    return heading;
  }

  private calculateSpeed(distance: number): number {
    const timeInterval = 1000 / this.config.updateRate;
    const distanceKm = distance * 111;
    return (distanceKm / (timeInterval / 1000)) * 3.6;
  }
  private updateStatus(): void {
    const usedSats = this.status.usedSatellites;
    
    if (usedSats >= this.config.minSatellites) {
      this.status.isLocked = true;
      this.status.fixType = usedSats >= 4 ? GPSFixType.FIX_3D : GPSFixType.FIX_2D;
    } else {
      this.status.isLocked = false;
      this.status.fixType = GPSFixType.NO_FIX;
    }

    this.status.hdop = Math.max(0.5, 5.0 - (usedSats * 0.3));
    this.status.vdop = this.status.hdop * 1.2;
    this.status.pdop = Math.sqrt(this.status.hdop * this.status.hdop + this.status.vdop * this.status.vdop);

    this.currentPosition.accuracy = this.status.hdop * 2.0;
    this.status.lastUpdate = new Date();
  }

  private simulateGPSAcquisition(): void {
    let acquisitionTime = 0;
    const maxAcquisitionTime = 30000;
    
    const acquisitionInterval = setInterval(() => {
      acquisitionTime += 1000;
      
      const progress = Math.min(acquisitionTime / maxAcquisitionTime, 1.0);
      const targetSatellites = Math.floor(progress * 12);
      
      let currentUsed = 0;
      for (const satellite of this.satellites.values()) {
        if (currentUsed < targetSatellites) {
          satellite.isUsed = satellite.elevation > 15;
          if (satellite.isUsed) currentUsed++;
        }
      }
      
      if (acquisitionTime >= maxAcquisitionTime) {
        clearInterval(acquisitionInterval);
      }
    }, 1000);
  }

  private addPositionToHistory(): void {
    this.positionHistory.push({ ...this.currentPosition });
    
    const maxHistorySize = 100;
    if (this.positionHistory.length > maxHistorySize) {
      this.positionHistory.shift();
    }
  }

  private notifyCallbacks(): void {
    this.positionCallbacks.forEach(callback => 
      callback(this.currentPosition.position, this.currentPosition.heading, this.currentPosition.speed)
    );
    
    this.statusCallbacks.forEach(callback => 
      callback(this.status)
    );
  }

  public update(): void {
    if (!this.isActive) return;
  }

  public getPosition(): GPSPosition {
    return { ...this.currentPosition };
  }

  public getStatus(): GPSStatus {
    return { ...this.status };
  }

  public getSatellites(): GPSSatellite[] {
    return Array.from(this.satellites.values());
  }

  public getUsedSatellites(): GPSSatellite[] {
    return Array.from(this.satellites.values()).filter(sat => sat.isUsed);
  }

  public isLocked(): boolean {
    return this.status.isLocked;
  }

  public getAccuracy(): number {
    return this.currentPosition.accuracy;
  }

  public getPredictedPosition(timeAhead: number): Vector3 {
    if (!this.config.enablePrediction || this.positionHistory.length < 2) {
      return this.currentPosition.position.clone();
    }

    const recent = this.positionHistory.slice(-2);
    const deltaTime = (recent[1].timestamp.getTime() - recent[0].timestamp.getTime()) / 1000;
    
    if (deltaTime <= 0) return this.currentPosition.position.clone();

    const velocity = new Vector3(
      (recent[1].position.x - recent[0].position.x) / deltaTime,
      (recent[1].position.y - recent[0].position.y) / deltaTime,
      0
    );

    return this.currentPosition.position.add(velocity.scale(timeAhead));
  }
  public setPosition(position: Vector3, altitude: number = 0): void {
    this.currentPosition.position.copyFrom(position);
    this.currentPosition.altitude = altitude;
    this.currentPosition.timestamp = new Date();
  }

  public setSimulatedTrack(track: Vector3[]): void {
    this.simulatedTrack = [...track];
    this.trackIndex = 0;
  }

  public enableSimulation(enabled: boolean): void {
    this.simulationMode = enabled;
  }

  public setActive(active: boolean): void {
    if (active && !this.isActive) {
      this.initialize();
    } else if (!active && this.isActive) {
      this.shutdown();
    }
  }

  public onPositionUpdate(callback: (position: Vector3, heading: number, speed: number) => void): void {
    this.positionCallbacks.add(callback);
  }

  public onStatusUpdate(callback: (status: GPSStatus) => void): void {
    this.statusCallbacks.add(callback);
  }

  public offPositionUpdate(callback: (position: Vector3, heading: number, speed: number) => void): void {
    this.positionCallbacks.delete(callback);
  }

  public offStatusUpdate(callback: (status: GPSStatus) => void): void {
    this.statusCallbacks.delete(callback);
  }

  public getPositionHistory(): GPSPosition[] {
    return [...this.positionHistory];
  }

  public clearHistory(): void {
    this.positionHistory = [];
  }

  public getDistanceTraveled(): number {
    if (this.positionHistory.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < this.positionHistory.length; i++) {
      const prev = this.positionHistory[i - 1].position;
      const curr = this.positionHistory[i].position;
      totalDistance += Vector3.Distance(prev, curr) * 111000;
    }

    return totalDistance;
  }

  public getAverageSpeed(): number {
    if (this.positionHistory.length < 2) return 0;

    const speeds = this.positionHistory.map(pos => pos.speed);
    const sum = speeds.reduce((a, b) => a + b, 0);
    return sum / speeds.length;
  }

  public getMaxSpeed(): number {
    if (this.positionHistory.length === 0) return 0;

    return Math.max(...this.positionHistory.map(pos => pos.speed));
  }

  public resetGPS(): void {
    this.status.isLocked = false;
    this.status.fixType = GPSFixType.NO_FIX;
    this.status.usedSatellites = 0;
    this.clearHistory();
    this.simulateGPSAcquisition();
  }

  public updateConfig(config: Partial<GPSConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.isActive) {
      this.stopGPSUpdates();
      this.startGPSUpdates();
    }
  }

  public getConfig(): GPSConfig {
    return { ...this.config };
  }
}