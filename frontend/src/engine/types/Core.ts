export enum ComponentTypeEnum {
  TRANSFORM = 'transform',
  PHYSICS = 'physics',
  RENDER = 'render',
  MESH = 'mesh',
  CAMERA = 'camera',
  AUDIO = 'audio',
  INPUT = 'input',
  AI = 'ai',
  NETWORK = 'network',
  ANIMATION = 'animation',
  COLLISION = 'collision',
  AIRCRAFT = 'aircraft',
  COCKPIT_CAMERA = 'cockpit_camera',
  LIGHT = 'light',
  SCRIPT = 'script',
  COLLIDER = 'collider',
  RIGIDBODY = 'rigidbody',
  PARTICLE = 'particle',
  UI = 'ui',
  TERRAIN = 'terrain',
  WATER = 'water',
  WEATHER = 'weather'
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export interface EntityData {
  id: string;
  name: string;
  active: boolean;
  transform: Transform;
  components: Map<ComponentTypeEnum, any>;
}

export interface SystemData {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  requiredComponents: ComponentTypeEnum[];
}

export interface WorldData {
  entities: Map<string, EntityData>;
  systems: Map<string, SystemData>;
  deltaTime: number;
  totalTime: number;
}