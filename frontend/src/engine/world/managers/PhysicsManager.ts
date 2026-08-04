import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Lifecycle, FixedUpdatable } from '../core/Lifecycle';

export interface PhysicsBody {
  id: string;
  mesh: AbstractMesh;
  velocity: Vector3;
  acceleration: Vector3;
  mass: number;
  drag: number;
  useGravity: boolean;
}

export class PhysicsManager implements Lifecycle, FixedUpdatable {
  private readonly gravity: Vector3;
  private readonly defaultDrag: number;
  private readonly bodies = new Map<string, PhysicsBody>();

  constructor(gravity: Vector3, drag: number) {
    this.gravity = gravity.clone();
    this.defaultDrag = drag;
  }

  public async initialize(): Promise<void> {
    return Promise.resolve();
  }

  public registerBody(
    id: string,
    mesh: AbstractMesh,
    mass = 1,
    drag = this.defaultDrag,
    useGravity = true
  ): PhysicsBody {
    const body: PhysicsBody = {
      id,
      mesh,
      velocity: Vector3.Zero(),
      acceleration: Vector3.Zero(),
      mass: Math.max(0.0001, mass),
      drag: Math.max(0, drag),
      useGravity,
    };

    this.bodies.set(id, body);
    return body;
  }

  public unregisterBody(id: string): void {
    this.bodies.delete(id);
  }

  public getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }

  public applyForce(id: string, force: Vector3): void {
    const body = this.bodies.get(id);
    if (!body) {
      return;
    }
    body.acceleration.addInPlace(force.scale(1 / body.mass));
  }

  public fixedUpdate(fixedDeltaTime: number): void {
    const dt = fixedDeltaTime;

    for (const body of this.bodies.values()) {
      if (body.useGravity) {
        body.acceleration.addInPlace(this.gravity);
      }

      if (body.drag > 0 && body.velocity.lengthSquared() > 0) {
        const dragForce = body.velocity.scale(-body.drag);
        body.acceleration.addInPlace(dragForce);
      }

      body.velocity.addInPlace(body.acceleration.scale(dt));
      body.mesh.position.addInPlace(body.velocity.scale(dt));
      body.acceleration.setAll(0);

      if (body.mesh.position.y < 0) {
        body.mesh.position.y = 0;
        if (body.velocity.y < 0) {
          body.velocity.y *= -0.12;
        }
      }
    }
  }

  public dispose(): void {
    this.bodies.clear();
  }
}
