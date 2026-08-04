import { Camera } from '@babylonjs/core/Cameras/camera';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Quaternion } from '@babylonjs/core/Maths/math.quaternion';
import { Matrix } from '@babylonjs/core/Maths/math.matrix';
import { Scene } from '@babylonjs/core/scene';
import { AircraftState, FlightData } from '../types/AircraftTypes';
import { Logger } from '../../../core/Logger';

export type CockpitViewType = 'pilot' | 'copilot' | 'overhead' | 'external' | 'chase' | 'tower';

export interface CockpitViewConfig {
  position: Vector3;
  rotation: Vector3;
  fov: number;
  nearClip: number;
  farClip: number;
  allowUserControl: boolean;
  headBobIntensity: number;
  vibrationIntensity: number;
}

export class CockpitCamera {
  private scene: Scene;
  private camera: UniversalCamera;
  private basePosition: Vector3;
  private baseRotation: Vector3;
  private currentView: CockpitViewType = 'pilot';
  private logger = Logger.getInstance();
  
  private viewConfigs: Map<CockpitViewType, CockpitViewConfig>;
  private headBobTime = 0;
  private vibrationTime = 0;
  private gForceEffect = 0;
  private speedEffect = 0;
  
  // Camera shake and effects
  private turbulenceShake = Vector3.Zero();
  private engineVibration = Vector3.Zero();
  private gForceOffset = Vector3.Zero();
  private headBobOffset = Vector3.Zero();
  
  // User input tracking
  private userLookOffset = Vector3.Zero();
  private mouseSensitivity = 0.002;
  private keyboardSensitivity = 1.0;
  
  constructor(scene: Scene, initialPosition: Vector3 = new Vector3(0, 1.5, -2)) {
    this.scene = scene;
    this.basePosition = initialPosition.clone();
    this.baseRotation = Vector3.Zero();
    
    // Create camera
    this.camera = new UniversalCamera('cockpitCamera', this.basePosition, scene);
    this.camera.setTarget(Vector3.Forward());
    this.camera.fov = Math.PI / 3; // 60 degrees
    this.camera.minZ = 0.1;
    this.camera.maxZ = 100000;
    
    this.initializeViewConfigs();
    this.setupControls();
  }

  private initializeViewConfigs(): void {
    this.viewConfigs = new Map([
      ['pilot', {
        position: new Vector3(-0.5, 1.5, -2),
        rotation: new Vector3(0, 0, 0),
        fov: Math.PI / 3,
        nearClip: 0.1,
        farClip: 100000,
        allowUserControl: true,
        headBobIntensity: 1.0,
        vibrationIntensity: 1.0
      }],
      ['copilot', {
        position: new Vector3(0.5, 1.5, -2),
        rotation: new Vector3(0, 0, 0),
        fov: Math.PI / 3,
        nearClip: 0.1,
        farClip: 100000,
        allowUserControl: true,
        headBobIntensity: 1.0,
        vibrationIntensity: 1.0
      }],
      ['overhead', {
        position: new Vector3(0, 2.2, -1.5),
        rotation: new Vector3(-Math.PI / 6, 0, 0),
        fov: Math.PI / 2.5,
        nearClip: 0.1,
        farClip: 100000,
        allowUserControl: false,
        headBobIntensity: 0.5,
        vibrationIntensity: 0.8
      }],
      ['external', {
        position: new Vector3(0, 2, 10),
        rotation: new Vector3(0, Math.PI, 0),
        fov: Math.PI / 3,
        nearClip: 1,
        farClip: 100000,
        allowUserControl: true,
        headBobIntensity: 0,
        vibrationIntensity: 0
      }],
      ['chase', {
        position: new Vector3(0, 3, 15),
        rotation: new Vector3(-Math.PI / 12, Math.PI, 0),
        fov: Math.PI / 3,
        nearClip: 1,
        farClip: 100000,
        allowUserControl: true,
        headBobIntensity: 0,
        vibrationIntensity: 0.2
      }],
      ['tower', {
        position: new Vector3(0, 50, 0),
        rotation: new Vector3(-Math.PI / 4, 0, 0),
        fov: Math.PI / 4,
        nearClip: 1,
        farClip: 100000,
        allowUserControl: true,
        headBobIntensity: 0,
        vibrationIntensity: 0
      }]
    ]);
  }

  private setupControls(): void {
    // Mouse look controls
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === 4 && this.isUserControlAllowed()) { // POINTERMOVE
        const event = pointerInfo.event as PointerEvent;
        if (event.buttons === 2) { // Right mouse button
          this.userLookOffset.y += event.movementX * this.mouseSensitivity;
          this.userLookOffset.x += event.movementY * this.mouseSensitivity;
          
          // Clamp vertical look
          this.userLookOffset.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.userLookOffset.x));
        }
      }
    });

    // Keyboard controls
    this.scene.registerBeforeRender(() => {
      if (this.isUserControlAllowed()) {
        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
        
        // Reset user look with R key
        if (this.scene.actionManager?.isActionTriggered('KeyR')) {
          this.userLookOffset = Vector3.Zero();
        }
      }
    });
  }

  public update(
    aircraftState: AircraftState,
    flightData: FlightData,
    deltaTime: number,
    turbulenceIntensity: number = 0
  ): void {
    this.headBobTime += deltaTime;
    this.vibrationTime += deltaTime;
    
    // Calculate effects
    this.updateTurbulenceEffect(turbulenceIntensity, deltaTime);
    this.updateEngineVibration(flightData.airspeed, deltaTime);
    this.updateGForceEffect(flightData.gForce, deltaTime);
    this.updateHeadBob(flightData.airspeed, deltaTime);
    
    // Apply camera transformation
    this.applyCameraTransform(aircraftState);
  }

  private updateTurbulenceEffect(intensity: number, deltaTime: number): void {
    const config = this.viewConfigs.get(this.currentView)!;
    const effectStrength = intensity * config.vibrationIntensity;
    
    if (effectStrength > 0) {
      this.turbulenceShake.x = (Math.random() - 0.5) * effectStrength * 0.02;
      this.turbulenceShake.y = (Math.random() - 0.5) * effectStrength * 0.02;
      this.turbulenceShake.z = (Math.random() - 0.5) * effectStrength * 0.01;
    } else {
      this.turbulenceShake = Vector3.Lerp(this.turbulenceShake, Vector3.Zero(), deltaTime * 5);
    }
  }

  private updateEngineVibration(rpm: number, deltaTime: number): void {
    const config = this.viewConfigs.get(this.currentView)!;
    const vibrationFreq = (rpm / 60) * 2 * Math.PI; // Convert RPM to rad/s
    const vibrationAmplitude = Math.min(rpm / 2000, 1) * config.vibrationIntensity * 0.001;
    
    this.engineVibration.x = Math.sin(this.vibrationTime * vibrationFreq) * vibrationAmplitude;
    this.engineVibration.y = Math.cos(this.vibrationTime * vibrationFreq * 1.1) * vibrationAmplitude * 0.5;
    this.engineVibration.z = Math.sin(this.vibrationTime * vibrationFreq * 0.8) * vibrationAmplitude * 0.3;
  }

  private updateGForceEffect(gForce: number, deltaTime: number): void {
    this.gForceEffect = gForce;
    
    // G-force induced camera offset
    const gOffset = (gForce - 1) * 0.1;
    this.gForceOffset.z = Math.max(-0.2, Math.min(0.1, gOffset));
    
    // Tunnel vision effect could be applied here by changing FOV
    const baseFov = this.viewConfigs.get(this.currentView)!.fov;
    const gFovEffect = Math.max(0.8, Math.min(1.2, 1 + (gForce - 1) * 0.05));
    this.camera.fov = baseFov * gFovEffect;
  }

  private updateHeadBob(airspeed: number, deltaTime: number): void {
    const config = this.viewConfigs.get(this.currentView)!;
    
    if (config.headBobIntensity > 0 && airspeed < 30) { // Ground operations
      const bobFrequency = Math.max(0.5, airspeed / 10);
      const bobAmplitude = (30 - airspeed) / 30 * config.headBobIntensity * 0.002;
      
      this.headBobOffset.y = Math.sin(this.headBobTime * bobFrequency * Math.PI * 2) * bobAmplitude;
      this.headBobOffset.x = Math.cos(this.headBobTime * bobFrequency * Math.PI) * bobAmplitude * 0.3;
    } else {
      this.headBobOffset = Vector3.Lerp(this.headBobOffset, Vector3.Zero(), deltaTime * 3);
    }
  }

  private applyCameraTransform(aircraftState: AircraftState): void {
    const config = this.viewConfigs.get(this.currentView)!;
    
    // Base position and rotation
    let position = config.position.clone();
    let rotation = config.rotation.clone();
    
    // Add user look offset if allowed
    if (config.allowUserControl) {
      rotation.x += this.userLookOffset.x;
      rotation.y += this.userLookOffset.y;
    }
    
    // Add all effects
    position.addInPlace(this.turbulenceShake);
    position.addInPlace(this.engineVibration);
    position.addInPlace(this.gForceOffset);
    position.addInPlace(this.headBobOffset);
    
    // Convert aircraft quaternion to matrix for transformation
    const aircraftMatrix = Matrix.FromQuaternion(
      new Quaternion(
        aircraftState.orientation.x,
        aircraftState.orientation.y,
        aircraftState.orientation.z,
        aircraftState.orientation.w
      )
    );
    
    // Transform camera position to world space
    const worldPosition = Vector3.TransformCoordinates(position, aircraftMatrix);
    worldPosition.addInPlace(new Vector3(
      aircraftState.position.x,
      aircraftState.position.y,
      aircraftState.position.z
    ));
    
    // Apply camera transform
    this.camera.position = worldPosition;
    
    // Calculate look direction
    const forward = Vector3.Forward();
    const rotationMatrix = Matrix.RotationYawPitchRoll(rotation.y, rotation.x, rotation.z);
    const lookDirection = Vector3.TransformCoordinates(forward, rotationMatrix);
    const worldLookDirection = Vector3.TransformCoordinates(lookDirection, aircraftMatrix);
    
    this.camera.setTarget(worldPosition.add(worldLookDirection));
  }

  private isUserControlAllowed(): boolean {
    const config = this.viewConfigs.get(this.currentView);
    return config ? config.allowUserControl : false;
  }

  // Public methods
  public setView(viewType: CockpitViewType): void {
    if (this.viewConfigs.has(viewType)) {
      this.currentView = viewType;
      this.userLookOffset = Vector3.Zero(); // Reset user look when changing views
      
      const config = this.viewConfigs.get(viewType)!;
      this.camera.fov = config.fov;
      this.camera.minZ = config.nearClip;
      this.camera.maxZ = config.farClip;
      
      this.logger.debug(`Switched to ${viewType} view`);
    }
  }

  public getCurrentView(): CockpitViewType {
    return this.currentView;
  }

  public getCamera(): UniversalCamera {
    return this.camera;
  }

  public resetUserLook(): void {
    this.userLookOffset = Vector3.Zero();
  }

  public setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = Math.max(0.0001, Math.min(0.01, sensitivity));
  }

  public setKeyboardSensitivity(sensitivity: number): void {
    this.keyboardSensitivity = Math.max(0.1, Math.min(5.0, sensitivity));
  }

  public cycleView(): void {
    const viewTypes: CockpitViewType[] = ['pilot', 'copilot', 'overhead', 'external', 'chase', 'tower'];
    const currentIndex = viewTypes.indexOf(this.currentView);
    const nextIndex = (currentIndex + 1) % viewTypes.length;
    this.setView(viewTypes[nextIndex]);
  }

  public setCustomView(position: Vector3, rotation: Vector3): void {
    this.viewConfigs.set('pilot', {
      position: position.clone(),
      rotation: rotation.clone(),
      fov: Math.PI / 3,
      nearClip: 0.1,
      farClip: 100000,
      allowUserControl: true,
      headBobIntensity: 1.0,
      vibrationIntensity: 1.0
    });
    
    if (this.currentView === 'pilot') {
      // Force update
      this.setView('pilot');
    }
  }

  public enableFreeLook(enable: boolean): void {
    const config = this.viewConfigs.get(this.currentView);
    if (config) {
      config.allowUserControl = enable;
    }
  }

  public setEffectIntensity(headBob: number, vibration: number): void {
    for (const config of this.viewConfigs.values()) {
      config.headBobIntensity = Math.max(0, Math.min(2, headBob));
      config.vibrationIntensity = Math.max(0, Math.min(2, vibration));
    }
  }

  public getViewConfig(viewType: CockpitViewType): CockpitViewConfig | null {
    return this.viewConfigs.get(viewType) || null;
  }

  public dispose(): void {
    if (this.camera) {
      this.camera.dispose();
    }
  }
}