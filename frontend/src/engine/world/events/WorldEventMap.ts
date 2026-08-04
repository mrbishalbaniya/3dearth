import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';

export type WorldEventMap = {
  'engine:initialized': undefined;
  'engine:started': undefined;
  'engine:stopped': undefined;
  'engine:resized': { width: number; height: number };
  'engine:error': { error: Error };
  'config:changed': { key: string; value: unknown };
  'time:hour-changed': { hour: number };
  'time:day-changed': { day: number };
  'weather:changed': { preset: string };
  'input:key-down': { code: string };
  'input:key-up': { code: string };
  'input:pointer-move': { x: number; y: number; dx: number; dy: number };
  'input:pointer-wheel': { deltaY: number };
  'chunk:loaded': { key: string };
  'chunk:unloaded': { key: string };
  'asset:loaded': { id: string; type: string };
  'vehicle:spawned': { id: string; mesh: AbstractMesh };
  'vehicle:removed': { id: string };
  'camera:moved': { position: Vector3 };
};
