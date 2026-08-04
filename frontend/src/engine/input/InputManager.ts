import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { InputType } from '../types/Events';

export interface KeyboardState {
  keys: Map<string, boolean>;
  keysPressed: Map<string, boolean>;
  keysReleased: Map<string, boolean>;
}

export interface MouseState {
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  buttons: Map<number, boolean>;
  buttonsPressed: Map<number, boolean>;
  buttonsReleased: Map<number, boolean>;
  wheelDelta: number;
}

export interface TouchState {
  touches: Map<number, { x: number; y: number; startX: number; startY: number }>;
  touchesStarted: Map<number, { x: number; y: number }>;
  touchesEnded: Map<number, { x: number; y: number }>;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private logger: Logger;
  private eventBus: EventBus;
  private keyboardState: KeyboardState;
  private mouseState: MouseState;
  private touchState: TouchState;
  private gamepadState: Map<number, Gamepad>;
  private initialized: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.logger = Logger.getInstance();
    this.eventBus = EventBus.getInstance();
    
    this.keyboardState = {
      keys: new Map(),
      keysPressed: new Map(),
      keysReleased: new Map()
    };
    
    this.mouseState = {
      x: 0,
      y: 0,
      deltaX: 0,
      deltaY: 0,
      buttons: new Map(),
      buttonsPressed: new Map(),
      buttonsReleased: new Map(),
      wheelDelta: 0
    };
    
    this.touchState = {
      touches: new Map(),
      touchesStarted: new Map(),
      touchesEnded: new Map()
    };
    
    this.gamepadState = new Map();
  }

  public initialize(): void {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing Input Manager', 'Input');
    
    this.setupKeyboardEvents();
    this.setupMouseEvents();
    this.setupTouchEvents();
    this.setupGamepadEvents();
    
    this.initialized = true;
    this.logger.info('Input Manager initialized', 'Input');
  }

  private setupKeyboardEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    window.addEventListener('blur', this.handleWindowBlur.bind(this));
  }

  private setupMouseEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('wheel', this.handleMouseWheel.bind(this));
    this.canvas.addEventListener('contextmenu', this.preventDefault.bind(this));
    
    // Handle mouse leave to reset state
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
  }

  private setupTouchEvents(): void {
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchcancel', this.handleTouchCancel.bind(this));
  }

  private setupGamepadEvents(): void {
    window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.code;
    
    if (!this.keyboardState.keys.get(key)) {
      this.keyboardState.keysPressed.set(key, true);
    }
    
    this.keyboardState.keys.set(key, true);
    
    this.eventBus.emit('input', {
      type: 'input',
      timestamp: Date.now(),
      inputType: InputType.KeyDown,
      data: { key, code: event.code, keyCode: event.keyCode }
    });
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.code;
    
    this.keyboardState.keys.set(key, false);
    this.keyboardState.keysReleased.set(key, true);
    
    this.eventBus.emit('input', {
      type: 'input',
      timestamp: Date.now(),
      inputType: InputType.KeyUp,
      data: { key, code: event.code, keyCode: event.keyCode }
    });
  }

  private handleWindowBlur(): void {
    // Clear all key states when window loses focus
    this.keyboardState.keys.clear();
    this.keyboardState.keysPressed.clear();
    this.keyboardState.keysReleased.clear();
  }

  private handleMouseDown(event: MouseEvent): void {
    const button = event.button;
    const rect = this.canvas.getBoundingClientRect();
    
    this.mouseState.x = event.clientX - rect.left;
    this.mouseState.y = event.clientY - rect.top;
    
    if (!this.mouseState.buttons.get(button)) {
      this.mouseState.buttonsPressed.set(button, true);
    }
    
    this.mouseState.buttons.set(button, true);
    
    this.eventBus.emit('input', {
      type: 'input',
      timestamp: Date.now(),
      inputType: InputType.MouseDown,
      data: { button, x: this.mouseState.x, y: this.mouseState.y }
    });
  }

  private handleMouseUp(event: MouseEvent): void {
    const button = event.button;
    const rect = this.canvas.getBoundingClientRect();
    
    this.mouseState.x = event.clientX - rect.left;
    this.mouseState.y = event.clientY - rect.top;
    
    this.mouseState.buttons.set(button, false);
    this.mouseState.buttonsReleased.set(button, true);
    
    this.eventBus.emit('input', {
      type: 'input',
      timestamp: Date.now(),
      inputType: InputType.MouseUp,
      data: { button, x: this.mouseState.x, y: this.mouseState.y }
    });
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const newX = event.clientX - rect.left;
    const newY = event.clientY - rect.top;
    
    this.mouseState.deltaX = newX - this.mouseState.x;
    this.mouseState.deltaY = newY - this.mouseState.y;
    this.mouseState.x = newX;
    this.mouseState.y = newY;
    
    this.eventBus.emit('input', {
      type: 'input',
      timestamp: Date.now(),
      inputType: InputType.MouseMove,
      data: { 
        x: this.mouseState.x, 
        y: this.mouseState.y, 
        deltaX: this.mouseState.deltaX, 
        deltaY: this.mouseState.deltaY 
      }
    });
  }

  private handleMouseWheel(event: WheelEvent): void {
    event.preventDefault();
    this.mouseState.wheelDelta = event.deltaY;
    
    this.eventBus.emit('input', {
      type: 'input',
      timestamp: Date.now(),
      inputType: InputType.MouseMove,
      data: { wheelDelta: this.mouseState.wheelDelta }
    });
  }

  private handleMouseLeave(): void {
    this.mouseState.deltaX = 0;
    this.mouseState.deltaY = 0;
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      this.touchState.touches.set(touch.identifier, { x, y, startX: x, startY: y });
      this.touchState.touchesStarted.set(touch.identifier, { x, y });
    }
    
    this.eventBus.emit('input', {
      type: 'input',
      timestamp: Date.now(),
      inputType: InputType.TouchStart,
      data: { touches: Array.from(this.touchState.touches.values()) }
    });
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      this.touchState.touchesEnded.set(touch.identifier, { x, y });
      this.touchState.touches.delete(touch.identifier);
    }
    
    this.eventBus.emit('input', {
      type: 'input',
      timestamp: Date.now(),
      inputType: InputType.TouchEnd,
      data: { touches: Array.from(this.touchState.touches.values()) }
    });
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const existingTouch = this.touchState.touches.get(touch.identifier);
      if (existingTouch) {
        existingTouch.x = x;
        existingTouch.y = y;
      }
    }
    
    this.eventBus.emit('input', {
      type: 'input',
      timestamp: Date.now(),
      inputType: InputType.TouchMove,
      data: { touches: Array.from(this.touchState.touches.values()) }
    });
  }

  private handleTouchCancel(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touchState.touches.delete(touch.identifier);
    }
  }

  private handleGamepadConnected(event: GamepadEvent): void {
    this.gamepadState.set(event.gamepad.index, event.gamepad);
    
    this.eventBus.emit('input', {
      type: 'input',
      timestamp: Date.now(),
      inputType: InputType.GamepadConnected,
      data: { gamepadIndex: event.gamepad.index, gamepad: event.gamepad }
    });
  }

  private handleGamepadDisconnected(event: GamepadEvent): void {
    this.gamepadState.delete(event.gamepad.index);
    
    this.eventBus.emit('input', {
      type: 'input',
      timestamp: Date.now(),
      inputType: InputType.GamepadDisconnected,
      data: { gamepadIndex: event.gamepad.index }
    });
  }

  private preventDefault(event: Event): void {
    event.preventDefault();
  }

  public update(deltaTime: number): void {
    // Clear frame-specific states
    this.keyboardState.keysPressed.clear();
    this.keyboardState.keysReleased.clear();
    this.mouseState.buttonsPressed.clear();
    this.mouseState.buttonsReleased.clear();
    this.mouseState.deltaX = 0;
    this.mouseState.deltaY = 0;
    this.mouseState.wheelDelta = 0;
    this.touchState.touchesStarted.clear();
    this.touchState.touchesEnded.clear();
    
    // Update gamepad state
    this.updateGamepads();
  }

  private updateGamepads(): void {
    const gamepads = navigator.getGamepads();
    
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (gamepad) {
        this.gamepadState.set(gamepad.index, gamepad);
      }
    }
  }

  public isKeyDown(key: string): boolean {
    return this.keyboardState.keys.get(key) || false;
  }

  public isKeyPressed(key: string): boolean {
    return this.keyboardState.keysPressed.get(key) || false;
  }

  public isKeyReleased(key: string): boolean {
    return this.keyboardState.keysReleased.get(key) || false;
  }

  public isMouseButtonDown(button: number): boolean {
    return this.mouseState.buttons.get(button) || false;
  }

  public isMouseButtonPressed(button: number): boolean {
    return this.mouseState.buttonsPressed.get(button) || false;
  }

  public isMouseButtonReleased(button: number): boolean {
    return this.mouseState.buttonsReleased.get(button) || false;
  }

  public getMousePosition(): { x: number; y: number } {
    return { x: this.mouseState.x, y: this.mouseState.y };
  }

  public getMouseDelta(): { deltaX: number; deltaY: number } {
    return { deltaX: this.mouseState.deltaX, deltaY: this.mouseState.deltaY };
  }

  public getWheelDelta(): number {
    return this.mouseState.wheelDelta;
  }

  public getTouches(): Array<{ x: number; y: number; startX: number; startY: number }> {
    return Array.from(this.touchState.touches.values());
  }

  public getGamepad(index: number): Gamepad | undefined {
    return this.gamepadState.get(index);
  }

  public getConnectedGamepads(): Gamepad[] {
    return Array.from(this.gamepadState.values());
  }

  public setPointerLock(enabled: boolean): void {
    if (enabled) {
      this.canvas.requestPointerLock();
    } else {
      document.exitPointerLock();
    }
  }

  public isPointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  public dispose(): void {
    this.logger.info('Disposing Input Manager', 'Input');
    
    // Remove all event listeners
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    window.removeEventListener('blur', this.handleWindowBlur.bind(this));
    
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('wheel', this.handleMouseWheel.bind(this));
    this.canvas.removeEventListener('contextmenu', this.preventDefault.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
    
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
    
    this.initialized = false;
  }
}