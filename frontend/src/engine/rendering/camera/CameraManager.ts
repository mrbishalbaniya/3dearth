import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '../../core/Logger';
import { Camera, CameraType } from '../../types/Core';

export class CameraManager {
  private scene: Scene;
  private logger: Logger;
  private cameras: Map<string, FreeCamera | ArcRotateCamera | UniversalCamera>;
  private activeCamera: FreeCamera | ArcRotateCamera | UniversalCamera | null = null;
  private defaultCameraId: string = 'main';

  constructor(scene: Scene) {
    this.scene = scene;
    this.logger = Logger.getInstance();
    this.cameras = new Map();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing Camera Manager', 'Camera');
    
    this.createDefaultCamera();
    
    this.logger.info('Camera Manager initialized', 'Camera');
  }

  private createDefaultCamera(): void {
    const defaultCamera = new UniversalCamera(this.defaultCameraId, new Vector3(0, 5, -10), this.scene);
    defaultCamera.setTarget(Vector3.Zero());
    defaultCamera.fov = Math.PI / 4;
    defaultCamera.minZ = 0.1;
    defaultCamera.maxZ = 1000;
    
    // Enable controls
    defaultCamera.attachToCanvas(this.scene.getEngine().getRenderingCanvas(), true);
    
    this.cameras.set(this.defaultCameraId, defaultCamera);
    this.setActiveCamera(this.defaultCameraId);
  }

  public createCamera(cameraData: Camera): FreeCamera | ArcRotateCamera | UniversalCamera {
    let camera: FreeCamera | ArcRotateCamera | UniversalCamera;

    const position = new Vector3(cameraData.position.x, cameraData.position.y, cameraData.position.z);
    const target = new Vector3(cameraData.target.x, cameraData.target.y, cameraData.target.z);

    switch (cameraData.type) {
      case CameraType.Perspective:
        camera = new UniversalCamera(cameraData.id, position, this.scene);
        camera.setTarget(target);
        break;
      
      case CameraType.Orthographic:
        camera = new FreeCamera(cameraData.id, position, this.scene);
        camera.setTarget(target);
        camera.mode = 1; // Orthographic mode
        break;
      
      default:
        camera = new UniversalCamera(cameraData.id, position, this.scene);
        camera.setTarget(target);
        break;
    }

    // Apply camera properties
    camera.fov = cameraData.fov;
    camera.minZ = cameraData.near;
    camera.maxZ = cameraData.far;

    // Configure camera controls
    this.setupCameraControls(camera);

    this.cameras.set(cameraData.id, camera);
    this.logger.debug(`Created camera: ${cameraData.id}`, 'Camera');
    
    return camera;
  }

  private setupCameraControls(camera: FreeCamera | ArcRotateCamera | UniversalCamera): void {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    // Attach controls to canvas
    camera.attachToCanvas(canvas, true);

    if (camera instanceof UniversalCamera) {
      // Configure movement speeds
      camera.speed = 0.5;
      camera.angularSensibility = 2000;
      
      // Enable collision detection
      camera.checkCollisions = true;
      camera.ellipsoid = new Vector3(1, 1, 1);
      
      // Configure key controls
      camera.keysUp.push(87); // W
      camera.keysDown.push(83); // S
      camera.keysLeft.push(65); // A
      camera.keysRight.push(68); // D
    } else if (camera instanceof ArcRotateCamera) {
      // Configure orbit controls
      camera.wheelPrecision = 50;
      camera.pinchPrecision = 200;
      camera.panningSensibility = 1000;
      camera.angularSensibilityX = 1000;
      camera.angularSensibilityY = 1000;
    }
  }

  public createArcRotateCamera(id: string, alpha: number, beta: number, radius: number, target: Vector3): ArcRotateCamera {
    const camera = new ArcRotateCamera(id, alpha, beta, radius, target, this.scene);
    
    // Configure arc rotate camera
    camera.fov = Math.PI / 4;
    camera.minZ = 0.1;
    camera.maxZ = 1000;
    
    // Set limits
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2;
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 100;
    
    this.setupCameraControls(camera);
    this.cameras.set(id, camera);
    
    return camera;
  }

  public createFlyCamera(id: string, position: Vector3): FreeCamera {
    const camera = new FreeCamera(id, position, this.scene);
    
    // Configure for flight
    camera.speed = 2.0;
    camera.angularSensibility = 1500;
    camera.fov = Math.PI / 3;
    camera.minZ = 0.1;
    camera.maxZ = 10000;
    
    this.setupCameraControls(camera);
    this.cameras.set(id, camera);
    
    return camera;
  }

  public setActiveCamera(cameraId: string): boolean {
    const camera = this.cameras.get(cameraId);
    if (!camera) {
      this.logger.warning(`Camera not found: ${cameraId}`, 'Camera');
      return false;
    }

    this.activeCamera = camera;
    this.scene.activeCamera = camera;
    
    this.logger.debug(`Set active camera: ${cameraId}`, 'Camera');
    return true;
  }

  public getActiveCamera(): FreeCamera | ArcRotateCamera | UniversalCamera | null {
    return this.activeCamera;
  }

  public getCamera(cameraId: string): FreeCamera | ArcRotateCamera | UniversalCamera | undefined {
    return this.cameras.get(cameraId);
  }

  public removeCamera(cameraId: string): void {
    const camera = this.cameras.get(cameraId);
    if (camera) {
      if (this.activeCamera === camera) {
        // Switch to default camera if removing active camera
        if (cameraId !== this.defaultCameraId) {
          this.setActiveCamera(this.defaultCameraId);
        }
      }
      
      camera.dispose();
      this.cameras.delete(cameraId);
      this.logger.debug(`Removed camera: ${cameraId}`, 'Camera');
    }
  }

  public setCameraPosition(cameraId: string, position: Vector3): void {
    const camera = this.cameras.get(cameraId);
    if (camera) {
      camera.position = position.clone();
    }
  }

  public setCameraTarget(cameraId: string, target: Vector3): void {
    const camera = this.cameras.get(cameraId);
    if (camera && 'setTarget' in camera) {
      camera.setTarget(target);
    }
  }

  public setCameraFov(cameraId: string, fov: number): void {
    const camera = this.cameras.get(cameraId);
    if (camera) {
      camera.fov = fov;
    }
  }

  public animateCameraTo(cameraId: string, targetPosition: Vector3, targetLookAt: Vector3, duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      const camera = this.cameras.get(cameraId);
      if (!camera) {
        resolve();
        return;
      }

      const startPosition = camera.position.clone();
      const startLookAt = camera.getTarget().clone();
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing
        const easedProgress = progress * progress * (3 - 2 * progress);

        // Interpolate position
        const currentPosition = Vector3.Lerp(startPosition, targetPosition, easedProgress);
        camera.position = currentPosition;

        // Interpolate look at
        const currentLookAt = Vector3.Lerp(startLookAt, targetLookAt, easedProgress);
        if ('setTarget' in camera) {
          camera.setTarget(currentLookAt);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  public enableCameraControls(cameraId: string, enabled: boolean): void {
    const camera = this.cameras.get(cameraId);
    if (camera) {
      const canvas = this.scene.getEngine().getRenderingCanvas();
      if (enabled && canvas) {
        camera.attachToCanvas(canvas, true);
      } else {
        camera.detachControl();
      }
    }
  }

  public setCameraSpeed(cameraId: string, speed: number): void {
    const camera = this.cameras.get(cameraId);
    if (camera && 'speed' in camera) {
      camera.speed = speed;
    }
  }

  public update(deltaTime: number): void {
    // Update camera-specific logic
    for (const camera of this.cameras.values()) {
      if (camera instanceof UniversalCamera) {
        // Handle universal camera updates
        this.updateUniversalCamera(camera, deltaTime);
      }
    }
  }

  private updateUniversalCamera(camera: UniversalCamera, deltaTime: number): void {
    // Implement smooth camera movement, collision response, etc.
    // This is where you'd add camera shake, follow behavior, etc.
  }

  public handleResize(width: number, height: number): void {
    // Babylon.js automatically handles camera aspect ratio updates
    this.logger.debug(`Camera manager handled resize: ${width}x${height}`, 'Camera');
  }

  public getAllCameras(): (FreeCamera | ArcRotateCamera | UniversalCamera)[] {
    return Array.from(this.cameras.values());
  }

  public getCameraNames(): string[] {
    return Array.from(this.cameras.keys());
  }

  public dispose(): void {
    this.logger.info('Disposing Camera Manager', 'Camera');
    
    for (const camera of this.cameras.values()) {
      camera.dispose();
    }
    
    this.cameras.clear();
    this.activeCamera = null;
  }
}