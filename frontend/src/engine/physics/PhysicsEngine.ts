import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { PhysicsImpostor } from '@babylonjs/core/Physics/physicsImpostor';
import { CannonJSPlugin } from '@babylonjs/core/Physics/Plugins/cannonJSPlugin';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { PhysicsEventType } from '../types/Events';

export interface PhysicsBodyConfig {
  mass: number;
  restitution: number;
  friction: number;
  linearDamping: number;
  angularDamping: number;
  kinematic: boolean;
  trigger: boolean;
}

export interface RaycastResult {
  hit: boolean;
  hitPoint?: Vector3;
  hitNormal?: Vector3;
  distance: number;
  mesh?: AbstractMesh;
}

export class PhysicsEngine {
  private scene: Scene | null = null;
  private physicsPlugin: CannonJSPlugin | null = null;
  private logger: Logger;
  private eventBus: EventBus;
  private physicsBodies: Map<string, PhysicsImpostor>;
  private gravity: Vector3;
  private timeStep: number;
  private maxSubSteps: number;
  private enabled: boolean = true;

  constructor() {
    this.logger = Logger.getInstance();
    this.eventBus = EventBus.getInstance();
    this.physicsBodies = new Map();
    this.gravity = new Vector3(0, -9.81, 0);
    this.timeStep = 1 / 60;
    this.maxSubSteps = 10;
  }

  public async initialize(scene: Scene): Promise<void> {
    this.logger.info('Initializing Physics Engine', 'Physics');
    
    this.scene = scene;
    
    try {
      // Import Cannon.js
      const CANNON = await import('cannon-es');
      
      // Create physics plugin
      this.physicsPlugin = new CannonJSPlugin(true, 10, CANNON);
      
      // Enable physics in scene
      this.scene.enablePhysics(this.gravity, this.physicsPlugin);
      
      this.setupCollisionEvents();
      
      this.logger.info('Physics Engine initialized', 'Physics');
    } catch (error) {
      this.logger.error('Failed to initialize Physics Engine', 'Physics', error);
      throw error;
    }
  }

  private setupCollisionEvents(): void {
    if (!this.scene) return;

    this.scene.registerBeforeRender(() => {
      if (this.enabled) {
        this.update(this.timeStep);
      }
    });
  }

  public createRigidBody(mesh: AbstractMesh, config: Partial<PhysicsBodyConfig> = {}): PhysicsImpostor {
    const defaultConfig: PhysicsBodyConfig = {
      mass: 1,
      restitution: 0.5,
      friction: 0.5,
      linearDamping: 0.1,
      angularDamping: 0.1,
      kinematic: false,
      trigger: false
    };

    const finalConfig = { ...defaultConfig, ...config };
    
    // Determine impostor type based on mesh
    let impostorType = PhysicsImpostor.BoxImpostor;
    
    if (mesh.name.includes('sphere')) {
      impostorType = PhysicsImpostor.SphereImpostor;
    } else if (mesh.name.includes('cylinder')) {
      impostorType = PhysicsImpostor.CylinderImpostor;
    } else if (mesh.name.includes('mesh') || finalConfig.mass === 0) {
      impostorType = PhysicsImpostor.MeshImpostor;
    }

    const impostor = new PhysicsImpostor(mesh, impostorType, {
      mass: finalConfig.mass,
      restitution: finalConfig.restitution,
      friction: finalConfig.friction
    });

    // Set additional properties
    if (impostor.physicsBody) {
      impostor.physicsBody.material.friction = finalConfig.friction;
      impostor.physicsBody.material.restitution = finalConfig.restitution;
      impostor.physicsBody.linearDamping = finalConfig.linearDamping;
      impostor.physicsBody.angularDamping = finalConfig.angularDamping;
      
      if (finalConfig.kinematic) {
        impostor.physicsBody.type = 2; // KINEMATIC
      }
    }

    // Set up collision events
    impostor.registerOnPhysicsCollide([impostor], (main, collided) => {
      this.handleCollision(main, collided, finalConfig.trigger);
    });

    this.physicsBodies.set(mesh.id, impostor);
    
    this.logger.debug(`Created physics body for: ${mesh.name}`, 'Physics');
    
    return impostor;
  }

  private handleCollision(main: PhysicsImpostor, collided: PhysicsImpostor, isTrigger: boolean): void {
    const eventType = isTrigger ? PhysicsEventType.Trigger : PhysicsEventType.Collision;
    
    this.eventBus.emit('physics', {
      type: 'physics',
      timestamp: Date.now(),
      eventType,
      bodyA: main.object?.id,
      bodyB: collided.object?.id,
      contactPoint: main.getObjectCenter()
    });
  }

  public removeRigidBody(meshId: string): void {
    const impostor = this.physicsBodies.get(meshId);
    if (impostor) {
      impostor.dispose();
      this.physicsBodies.delete(meshId);
      
      this.logger.debug(`Removed physics body: ${meshId}`, 'Physics');
    }
  }

  public getPhysicsBody(meshId: string): PhysicsImpostor | undefined {
    return this.physicsBodies.get(meshId);
  }

  public setGravity(gravity: Vector3): void {
    this.gravity = gravity.clone();
    if (this.scene && this.scene.getPhysicsEngine()) {
      this.scene.getPhysicsEngine()!.setGravity(this.gravity);
    }
  }

  public getGravity(): Vector3 {
    return this.gravity.clone();
  }

  public applyForce(meshId: string, force: Vector3, position?: Vector3): void {
    const impostor = this.physicsBodies.get(meshId);
    if (impostor && impostor.physicsBody) {
      const worldPosition = position || impostor.getObjectCenter();
      impostor.applyImpulse(force, worldPosition);
    }
  }

  public applyTorque(meshId: string, torque: Vector3): void {
    const impostor = this.physicsBodies.get(meshId);
    if (impostor && impostor.physicsBody) {
      impostor.physicsBody.torque.x += torque.x;
      impostor.physicsBody.torque.y += torque.y;
      impostor.physicsBody.torque.z += torque.z;
    }
  }

  public setVelocity(meshId: string, velocity: Vector3): void {
    const impostor = this.physicsBodies.get(meshId);
    if (impostor) {
      impostor.setLinearVelocity(velocity);
    }
  }

  public getVelocity(meshId: string): Vector3 | null {
    const impostor = this.physicsBodies.get(meshId);
    if (impostor) {
      return impostor.getLinearVelocity();
    }
    return null;
  }

  public setAngularVelocity(meshId: string, angularVelocity: Vector3): void {
    const impostor = this.physicsBodies.get(meshId);
    if (impostor) {
      impostor.setAngularVelocity(angularVelocity);
    }
  }

  public getAngularVelocity(meshId: string): Vector3 | null {
    const impostor = this.physicsBodies.get(meshId);
    if (impostor) {
      return impostor.getAngularVelocity();
    }
    return null;
  }

  public raycast(origin: Vector3, direction: Vector3, maxDistance: number = 100): RaycastResult {
    if (!this.scene) {
      return { hit: false, distance: maxDistance };
    }

    const ray = new Ray(origin, direction, maxDistance);
    const hit = this.scene.pickWithRay(ray);

    if (hit && hit.hit && hit.pickedMesh) {
      return {
        hit: true,
        hitPoint: hit.pickedPoint || undefined,
        hitNormal: hit.getNormal() || undefined,
        distance: hit.distance,
        mesh: hit.pickedMesh
      };
    }

    return { hit: false, distance: maxDistance };
  }

  public spherecast(center: Vector3, radius: number): AbstractMesh[] {
    if (!this.scene) {
      return [];
    }

    const hitMeshes: AbstractMesh[] = [];
    
    for (const mesh of this.scene.meshes) {
      if (!mesh.getBoundingInfo()) continue;
      
      const meshCenter = mesh.getBoundingInfo().boundingSphere.center;
      const meshRadius = mesh.getBoundingInfo().boundingSphere.radius;
      const distance = center.subtract(meshCenter).length();
      
      if (distance <= radius + meshRadius) {
        hitMeshes.push(mesh);
      }
    }
    
    return hitMeshes;
  }

  public setBodyKinematic(meshId: string, kinematic: boolean): void {
    const impostor = this.physicsBodies.get(meshId);
    if (impostor && impostor.physicsBody) {
      impostor.physicsBody.type = kinematic ? 2 : 1; // KINEMATIC : DYNAMIC
    }
  }

  public setBodyPosition(meshId: string, position: Vector3): void {
    const impostor = this.physicsBodies.get(meshId);
    if (impostor && impostor.object) {
      impostor.object.position = position.clone();
      impostor.setPhysicsBodyTransformation();
    }
  }

  public setBodyRotation(meshId: string, rotation: Vector3): void {
    const impostor = this.physicsBodies.get(meshId);
    if (impostor && impostor.object) {
      impostor.object.rotation = rotation.clone();
      impostor.setPhysicsBodyTransformation();
    }
  }

  public freezeBody(meshId: string, freeze: boolean): void {
    const impostor = this.physicsBodies.get(meshId);
    if (impostor && impostor.physicsBody) {
      if (freeze) {
        impostor.physicsBody.velocity.set(0, 0, 0);
        impostor.physicsBody.angularVelocity.set(0, 0, 0);
        impostor.physicsBody.fixedRotation = true;
      } else {
        impostor.physicsBody.fixedRotation = false;
      }
    }
  }

  public createJoint(bodyA: string, bodyB: string, jointType: string, options: any = {}): void {
    const impostorA = this.physicsBodies.get(bodyA);
    const impostorB = this.physicsBodies.get(bodyB);
    
    if (!impostorA || !impostorB) {
      this.logger.warning(`Cannot create joint: bodies not found`, 'Physics');
      return;
    }

    // Joint creation would be implemented based on specific requirements
    this.logger.debug(`Created ${jointType} joint between ${bodyA} and ${bodyB}`, 'Physics');
  }

  public update(deltaTime: number): void {
    if (!this.enabled || !this.scene) {
      return;
    }

    // Physics update is handled automatically by Babylon.js physics engine
    // This method can be used for custom physics logic
    
    // Update physics bodies that need special handling
    for (const [id, impostor] of this.physicsBodies) {
      if (impostor.object) {
        // Custom physics updates can go here
        this.updatePhysicsBody(id, impostor, deltaTime);
      }
    }
  }

  private updatePhysicsBody(id: string, impostor: PhysicsImpostor, deltaTime: number): void {
    // Custom per-body physics updates
    // This could include applying continuous forces, checking states, etc.
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (this.scene && this.scene.getPhysicsEngine()) {
      if (enabled) {
        this.scene.getPhysicsEngine()!.setTimeStep(this.timeStep);
      } else {
        this.scene.getPhysicsEngine()!.setTimeStep(0);
      }
    }
  }

  public pause(): void {
    this.setEnabled(false);
  }

  public resume(): void {
    this.setEnabled(true);
  }

  public getBodyCount(): number {
    return this.physicsBodies.size;
  }

  public getAllBodies(): PhysicsImpostor[] {
    return Array.from(this.physicsBodies.values());
  }

  public dispose(): void {
    this.logger.info('Disposing Physics Engine', 'Physics');
    
    // Dispose all physics bodies
    for (const impostor of this.physicsBodies.values()) {
      impostor.dispose();
    }
    
    this.physicsBodies.clear();
    
    // Dispose physics plugin
    if (this.physicsPlugin) {
      this.physicsPlugin.dispose();
      this.physicsPlugin = null;
    }
    
    this.scene = null;
  }
}

// Import Ray class
import { Ray } from '@babylonjs/core/Culling/ray';