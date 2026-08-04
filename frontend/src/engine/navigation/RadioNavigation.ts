import { Vector3 } from '@babylonjs/core';

export interface VORStation {
  id: string;
  name: string;
  identifier: string;
  position: Vector3;
  frequency: number;
  variation: number;
  range: number;
  isActive: boolean;
  type: VORType;
  declination: number;
}

export interface DMEStation {
  id: string;
  name: string;
  identifier: string;
  position: Vector3;
  frequency: number;
  range: number;
  isActive: boolean;
  associatedVOR?: string;
}

export interface NDBStation {
  id: string;
  name: string;
  identifier: string;
  position: Vector3;
  frequency: number;
  range: number;
  isActive: boolean;
  power: number;
}

export interface ILSData {
  id: string;
  runway: string;
  airport: string;
  localizerFreq: number;
  glideslopeFreq: number;
  localizerCourse: number;
  glideslopeAngle: number;
  position: Vector3;
  decisionHeight: number;
  category: ILSCategory;
  isActive: boolean;
  outerMarker?: MarkerBeacon;
  middleMarker?: MarkerBeacon;
  innerMarker?: MarkerBeacon;
}

export interface MarkerBeacon {
  position: Vector3;
  frequency: number;
  identifier: string;
  type: MarkerType;
}

export interface RadioNavState {
  selectedVOR?: string;
  selectedDME?: string;
  selectedNDB?: string;
  selectedILS?: string;
  obs: number;
  course: number;
  radial: number;
  distance: number;
  bearing: number;
  cdi: number;
  gsi: number;
  toFrom: ToFromFlag;
  isDMEValid: boolean;
  isVORValid: boolean;
  isNDBValid: boolean;
  isILSValid: boolean;
}

export enum VORType {
  VOR = 'VOR',
  VORDME = 'VORDME',
  VORTAC = 'VORTAC'
}

export enum ILSCategory {
  CAT_I = 'CAT_I',
  CAT_II = 'CAT_II',
  CAT_III = 'CAT_III'
}

export enum MarkerType {
  OUTER = 'OUTER',
  MIDDLE = 'MIDDLE',
  INNER = 'INNER'
}

export enum ToFromFlag {
  TO = 'TO',
  FROM = 'FROM',
  OFF = 'OFF'
}

export class RadioNavigation {
  private vorStations: Map<string, VORStation>;
  private dmeStations: Map<string, DMEStation>;
  private ndbStations: Map<string, NDBStation>;
  private ilsStations: Map<string, ILSData>;
  private navState: RadioNavState;
  private aircraftPosition: Vector3;
  private aircraftHeading: number;
  private isActive: boolean;
  private updateInterval: number;

  constructor() {
    this.vorStations = new Map();
    this.dmeStations = new Map();
    this.ndbStations = new Map();
    this.ilsStations = new Map();
    
    this.navState = {
      obs: 0,
      course: 0,
      radial: 0,
      distance: 0,
      bearing: 0,
      cdi: 0,
      gsi: 0,
      toFrom: ToFromFlag.OFF,
      isDMEValid: false,
      isVORValid: false,
      isNDBValid: false,
      isILSValid: false
    };

    this.aircraftPosition = Vector3.Zero();
    this.aircraftHeading = 0;
    this.isActive = false;
    this.updateInterval = 0;

    this.loadNepalNavigation();
  }

  public initialize(): void {
    if (this.isActive) return;
    this.startUpdateLoop();
    this.isActive = true;
  }

  public shutdown(): void {
    if (!this.isActive) return;
    this.stopUpdateLoop();
    this.isActive = false;
  }