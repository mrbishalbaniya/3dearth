import { GameEngine } from '../core/GameEngine';
import { Scene, SceneManager } from '../scene';
import { Entity } from '../ecs/Entity';
import { TransformComponent, MeshComponent } from '../ecs/Component';
import { RenderSystem } from '../ecs/System';
import { 
  Vector3, 
  Color3, 
  FreeCamera, 
  HemisphericLight, 
  MeshBuilder, 
  StandardMaterial,
  Animation,
  Scene as BabylonScene
} from '@babylonjs/core';
import { Logger } from '../core/Logger';

export class BasicDemo {
  private engine: GameEngine;
  private scene: Scene;
  private logger = Logger.getInstance();
  
  private cubeEntity: Entity | null = null;
  private sphereEntity: Entity | null = null;
  private groundEntity: Entity | null = null;

  constructor() {
    this.engine = GameEngine.getInstance();
  }

  public async initialize(): Promise<void> {
    if (!this.engine.isInitialized()) {
      throw new Error('GameEngine must be initialized before running demo');
    }

    await this.createScene();
    await this.setupCamera();
    await this.setupLighting();
    await this.createEntities();
    await this.setupAnimations();
    
    this.logger.info('BasicDemo initialized');
  }

  private async createScene(): Promise<void> {
    const sceneManager = SceneManager.getInstance();
    
    this.scene = sceneManager.createScene({
      name: 'BasicDemo',
      clearColor: { r: 0.2, g: 0.2, b: 0.3, a: 1.0 },
      ambientColor: { r: 0.1, g: 0.1, b: 0.1 },
      fogEnabled: false
    });

    await this.scene.load();
    await sceneManager.activateScene('BasicDemo');

    // Add render system
    const renderSystem = new RenderSystem();
    this.scene.getWorld().addSystem(renderSystem);
  }

  private async setupCamera(): Promise<void> {
    const babylonScene = this.scene.getBabylonScene();
    
    const camera = new FreeCamera('camera', new Vector3(0, 5, -10), babylonScene);
    camera.setTarget(Vector3.Zero());
    
    const canvas = babylonScene.getEngine().getRenderingCanvas();
    if (canvas) {
      camera.attachToCanvas(canvas, true);
    }
  }

  private async setupLighting(): Promise<void> {
    const babylonScene = this.scene.getBabylonScene();
    
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), babylonScene);
    light.intensity = 0.7;
    light.diffuse = new Color3(1, 1, 0.9);
    light.specular = new Color3(0.9, 0.9, 0.8);
  }

  private async createEntities(): Promise<void> {
    await this.createCube();
    await this.createSphere();
    await this.createGround();
  }

  private async createCube(): Promise<void> {
    const babylonScene = this.scene.getBabylonScene();
    
    // Create Babylon.js mesh
    const box = MeshBuilder.CreateBox('box', { size: 2 }, babylonScene);
    box.position.x = -3;
    box.position.y = 1;
    
    // Create material
    const material = new StandardMaterial('boxMaterial', babylonScene);
    material.diffuseColor = new Color3(1, 0, 1);
    material.specularColor = new Color3(0.5, 0.6, 0.87);
    box.material = material;
    
    // Create entity with components
    this.cubeEntity = this.scene.createEntity('Cube');
    
    const transform = new TransformComponent();
    transform.setPosition(-3, 1, 0);
    this.cubeEntity.addComponent(transform);
    
    const mesh = new MeshComponent();
    mesh.setMesh('box');
    mesh.setMaterial('boxMaterial');
    this.cubeEntity.addComponent(mesh);
  }

  private async createSphere(): Promise<void> {
    const babylonScene = this.scene.getBabylonScene();
    
    // Create Babylon.js mesh
    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2 }, babylonScene);
    sphere.position.x = 3;
    sphere.position.y = 1;
    
    // Create material
    const material = new StandardMaterial('sphereMaterial', babylonScene);
    material.diffuseColor = new Color3(0, 1, 0);
    material.specularColor = new Color3(0.5, 0.6, 0.87);
    sphere.material = material;
    
    // Create entity with components
    this.sphereEntity = this.scene.createEntity('Sphere');
    
    const transform = new TransformComponent();
    transform.setPosition(3, 1, 0);
    this.sphereEntity.addComponent(transform);
    
    const mesh = new MeshComponent();
    mesh.setMesh('sphere');
    mesh.setMaterial('sphereMaterial');
    this.sphereEntity.addComponent(mesh);
  }

  private async createGround(): Promise<void> {
    const babylonScene = this.scene.getBabylonScene();
    
    // Create Babylon.js mesh
    const ground = MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, babylonScene);
    
    // Create material
    const material = new StandardMaterial('groundMaterial', babylonScene);
    material.diffuseColor = new Color3(0.4, 0.4, 0.4);
    material.specularColor = new Color3(0.4, 0.4, 0.4);
    ground.material = material;
    
    // Create entity with components
    this.groundEntity = this.scene.createEntity('Ground');
    
    const transform = new TransformComponent();
    transform.setPosition(0, 0, 0);
    this.groundEntity.addComponent(transform);
    
    const mesh = new MeshComponent();
    mesh.setMesh('ground');
    mesh.setMaterial('groundMaterial');
    this.groundEntity.addComponent(mesh);
  }

  private async setupAnimations(): Promise<void> {
    const babylonScene = this.scene.getBabylonScene();
    
    if (this.cubeEntity) {
      this.animateCube(babylonScene);
    }
    
    if (this.sphereEntity) {
      this.animateSphere(babylonScene);
    }
  }

  private animateCube(scene: BabylonScene): void {
    const box = scene.getMeshByName('box');
    if (!box) return;

    // Rotation animation
    const rotationAnimation = Animation.CreateAndStartAnimation(
      'boxRotation',
      box,
      'rotation.y',
      30,
      120,
      0,
      Math.PI * 2,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );
  }

  private animateSphere(scene: BabylonScene): void {
    const sphere = scene.getMeshByName('sphere');
    if (!sphere) return;

    // Bouncing animation
    const bouncingAnimation = Animation.CreateAndStartAnimation(
      'sphereBounce',
      sphere,
      'position.y',
      30,
      60,
      1,
      4,
      Animation.ANIMATIONLOOPMODE_YOYO
    );
  }

  public start(): void {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    this.scene.activate();
    this.logger.info('BasicDemo started');
  }

  public stop(): void {
    if (this.scene && this.scene.isActive()) {
      this.scene.deactivate();
      this.logger.info('BasicDemo stopped');
    }
  }

  public async destroy(): Promise<void> {
    if (this.scene) {
      await this.scene.destroy();
    }
    
    this.cubeEntity = null;
    this.sphereEntity = null;
    this.groundEntity = null;
    
    this.logger.info('BasicDemo destroyed');
  }

  public getScene(): Scene {
    return this.scene;
  }

  public getEntities(): { cube: Entity | null; sphere: Entity | null; ground: Entity | null } {
    return {
      cube: this.cubeEntity,
      sphere: this.sphereEntity,
      ground: this.groundEntity
    };
  }

  public getCubeEntity(): Entity | null {
    return this.cubeEntity;
  }

  public getSphereEntity(): Entity | null {
    return this.sphereEntity;
  }

  public getGroundEntity(): Entity | null {
    return this.groundEntity;
  }
}