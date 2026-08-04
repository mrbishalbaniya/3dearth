import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { Lifecycle, Updatable } from '../core/Lifecycle';
import type { InputManager } from './InputManager';
import type { EventSystem } from '../events/EventSystem';
import type { WorldEventMap } from '../events/WorldEventMap';

export class CameraManager implements Lifecycle, Updatable {
  private readonly scene: Scene;
  private readonly input: InputManager;
  private readonly events: EventSystem<WorldEventMap>;
  private readonly moveSpeed: number;
  private camera!: UniversalCamera;

  constructor(
    scene: Scene,
    input: InputManager,
    events: EventSystem<WorldEventMap>,
    initialPosition: Vector3,
    initialTarget: Vector3,
    fov: number,
    near: number,
    far: number,
    speed: number,
    angularSensitivity: number
  ) {
    this.scene = scene;
    this.input = input;
    this.events = events;
    this.moveSpeed = speed;

    this.createCamera(initialPosition, initialTarget, fov, near, far, angularSensitivity);
  }

  private createCamera(
    initialPosition: Vector3,
    initialTarget: Vector3,
    fov: number,
    near: number,
    far: number,
    angularSensitivity: number
  ): void {
    this.camera = new UniversalCamera('world_camera', initialPosition.clone(), this.scene);
    this.camera.fov = fov;
    this.camera.minZ = near;
    this.camera.maxZ = far;
    this.camera.angularSensibility = angularSensitivity;
    this.camera.inertia = 0.75;
    this.camera.speed = 0;
    this.camera.setTarget(initialTarget.clone());
    this.scene.activeCamera = this.camera;
  }

  public async initialize(): Promise<void> {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) {
      throw new Error('CameraManager requires rendering canvas');
    }

    this.camera.attachControl(canvas, true);
  }

  public update(deltaTime: number): void {
    const forward = this.camera.getDirection(Vector3.Forward());
    const right = this.camera.getDirection(Vector3.Right());
    const up = Vector3.Up();
    const movement = Vector3.Zero();

    if (this.input.isKeyDown('KeyW')) {
      movement.addInPlace(forward);
    }
    if (this.input.isKeyDown('KeyS')) {
      movement.subtractInPlace(forward);
    }
    if (this.input.isKeyDown('KeyD')) {
      movement.addInPlace(right);
    }
    if (this.input.isKeyDown('KeyA')) {
      movement.subtractInPlace(right);
    }
    if (this.input.isKeyDown('Space')) {
      movement.addInPlace(up);
    }
    if (this.input.isKeyDown('ShiftLeft')) {
      movement.subtractInPlace(up);
    }

    if (movement.lengthSquared() > 0) {
      movement.normalize();
      const speedMultiplier = this.input.isKeyDown('ControlLeft') ? 3 : 1;
      this.camera.position.addInPlace(movement.scale(this.moveSpeed * deltaTime * 60 * speedMultiplier));
      this.events.emit('camera:moved', { position: this.camera.position.clone() });
    }
  }

  public getActiveCamera(): UniversalCamera {
    return this.camera;
  }

  public setPosition(position: Vector3): void {
    this.camera.position.copyFrom(position);
    this.events.emit('camera:moved', { position: this.camera.position.clone() });
  }

  public getPosition(): Vector3 {
    return this.camera.position.clone();
  }

  public dispose(): void {
    this.camera.detachControl();
    this.camera.dispose();
  }
}
