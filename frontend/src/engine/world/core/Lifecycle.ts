export interface Lifecycle {
  initialize(): Promise<void>;
  dispose(): void;
}

export interface Updatable {
  update(deltaTime: number): void;
}

export interface FixedUpdatable {
  fixedUpdate(fixedDeltaTime: number): void;
}

export interface Renderable {
  render(): void;
}
