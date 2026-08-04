import { ControlInputs } from '../types/AircraftTypes';

export class FlightControls {
  private inputs: ControlInputs = {
    throttle: 0,
    elevator: 0,
    aileron: 0,
    rudder: 0,
    flaps: 0,
    brakes: 0,
    landingGear: false
  };

  private keyStates: { [key: string]: boolean } = {};
  private mouseDelta = { x: 0, y: 0 };
  private wheelDelta = 0;

  constructor() {
    this.bindEvents();
  }

  private bindEvents(): void {
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse events
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('wheel', this.handleWheel.bind(this));
    
    // Prevent context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.keyStates[event.code] = true;
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keyStates[event.code] = false;
  }

  private handleMouseMove(event: MouseEvent): void {
    if (event.buttons === 1) { // Left mouse button
      this.mouseDelta.x = event.movementX * 0.001;
      this.mouseDelta.y = event.movementY * 0.001;
    }
  }

  private handleWheel(event: WheelEvent): void {
    this.wheelDelta = -event.deltaY * 0.001;
  }

  public update(deltaTime: number): ControlInputs {
    // Throttle control (Shift/Ctrl or mouse wheel)
    if (this.keyStates['ShiftLeft'] || this.keyStates['ShiftRight']) {
      this.inputs.throttle = Math.min(1, this.inputs.throttle + deltaTime * 0.5);
    } else if (this.keyStates['ControlLeft'] || this.keyStates['ControlRight']) {
      this.inputs.throttle = Math.max(0, this.inputs.throttle - deltaTime * 0.5);
    }
    
    if (Math.abs(this.wheelDelta) > 0.001) {
      this.inputs.throttle = Math.max(0, Math.min(1, this.inputs.throttle + this.wheelDelta));
      this.wheelDelta = 0;
    }

    // Elevator control (W/S keys or mouse Y)
    let elevatorInput = 0;
    if (this.keyStates['KeyW']) elevatorInput += 1;
    if (this.keyStates['KeyS']) elevatorInput -= 1;
    if (Math.abs(this.mouseDelta.y) > 0.001) {
      elevatorInput += this.mouseDelta.y * 10;
    }
    this.inputs.elevator = Math.max(-1, Math.min(1, elevatorInput));

    // Aileron control (A/D keys or arrow keys or mouse X)
    let aileronInput = 0;
    if (this.keyStates['KeyA'] || this.keyStates['ArrowLeft']) aileronInput -= 1;
    if (this.keyStates['KeyD'] || this.keyStates['ArrowRight']) aileronInput += 1;
    if (Math.abs(this.mouseDelta.x) > 0.001) {
      aileronInput += this.mouseDelta.x * 10;
    }
    this.inputs.aileron = Math.max(-1, Math.min(1, aileronInput));

    // Rudder control (Q/E keys)
    let rudderInput = 0;
    if (this.keyStates['KeyQ']) rudderInput -= 1;
    if (this.keyStates['KeyE']) rudderInput += 1;
    this.inputs.rudder = Math.max(-1, Math.min(1, rudderInput));

    // Flaps control (F key - toggle)
    if (this.keyStates['KeyF']) {
      this.inputs.flaps = this.inputs.flaps > 0.5 ? 0 : 1;
      this.keyStates['KeyF'] = false; // Prevent continuous toggling
    }

    // Brakes control (B key or Space)
    this.inputs.brakes = (this.keyStates['KeyB'] || this.keyStates['Space']) ? 1 : 0;

    // Landing gear control (G key - toggle)
    if (this.keyStates['KeyG']) {
      this.inputs.landingGear = !this.inputs.landingGear;
      this.keyStates['KeyG'] = false; // Prevent continuous toggling
    }

    // Reset mouse deltas
    this.mouseDelta.x *= 0.9;
    this.mouseDelta.y *= 0.9;

    return { ...this.inputs };
  }

  public getInputs(): ControlInputs {
    return { ...this.inputs };
  }

  public setInput(input: Partial<ControlInputs>): void {
    Object.assign(this.inputs, input);
  }

  public dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    document.removeEventListener('wheel', this.handleWheel.bind(this));
  }
}