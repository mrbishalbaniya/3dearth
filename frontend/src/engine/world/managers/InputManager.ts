import type { Scene } from '@babylonjs/core/scene';
import type { Lifecycle } from '../core/Lifecycle';
import type { EventSystem } from '../events/EventSystem';
import type { WorldEventMap } from '../events/WorldEventMap';

export class InputManager implements Lifecycle {
  private readonly scene: Scene;
  private readonly events: EventSystem<WorldEventMap>;
  private readonly keys = new Set<string>();
  private pointerLocked = false;
  private lastX = 0;
  private lastY = 0;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
    this.events.emit('input:key-down', { code: event.code });
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    this.events.emit('input:key-up', { code: event.code });
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const x = event.clientX;
    const y = event.clientY;
    const dx = this.pointerLocked ? event.movementX : x - this.lastX;
    const dy = this.pointerLocked ? event.movementY : y - this.lastY;

    this.lastX = x;
    this.lastY = y;

    this.events.emit('input:pointer-move', { x, y, dx, dy });
  };

  private readonly onWheel = (event: WheelEvent): void => {
    this.events.emit('input:pointer-wheel', { deltaY: event.deltaY });
  };

  constructor(scene: Scene, events: EventSystem<WorldEventMap>) {
    this.scene = scene;
    this.events = events;
  }

  public async initialize(): Promise<void> {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) {
      throw new Error('InputManager requires an active rendering canvas');
    }

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('wheel', this.onWheel, { passive: true });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });

    canvas.addEventListener('click', () => {
      if (!this.pointerLocked) {
        canvas.requestPointerLock();
      }
    });
  }

  public isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('wheel', this.onWheel);
  }
}
