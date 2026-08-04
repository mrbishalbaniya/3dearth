import type { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';

interface DebugOverlayProvider {
  getLoadedChunks: () => number;
  getCameraPosition: () => Vector3;
}

export class DebugOverlay {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly provider: DebugOverlayProvider;
  private readonly root: HTMLDivElement;
  private readonly stats = new Map<string, HTMLDivElement>();
  private readonly updateIntervalMs: number;
  private running = false;
  private lastUpdate = 0;

  constructor(engine: Engine, scene: Scene, provider: DebugOverlayProvider, updateIntervalMs: number) {
    this.engine = engine;
    this.scene = scene;
    this.provider = provider;
    this.updateIntervalMs = updateIntervalMs;

    this.root = document.createElement('div');
    this.root.style.position = 'fixed';
    this.root.style.top = '12px';
    this.root.style.right = '12px';
    this.root.style.zIndex = '9999';
    this.root.style.padding = '10px 12px';
    this.root.style.borderRadius = '8px';
    this.root.style.background = 'rgba(6, 10, 16, 0.78)';
    this.root.style.backdropFilter = 'blur(8px)';
    this.root.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    this.root.style.fontSize = '12px';
    this.root.style.lineHeight = '1.45';
    this.root.style.color = '#cfe6ff';
    this.root.style.minWidth = '250px';

    this.createRow('FPS');
    this.createRow('Draw Calls');
    this.createRow('Mesh Count');
    this.createRow('GPU Memory');
    this.createRow('Loaded Chunks');
    this.createRow('Camera Position');
  }

  private createRow(label: string): void {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.gap = '12px';

    const key = document.createElement('span');
    key.textContent = label;
    key.style.color = '#8fb4d9';

    const value = document.createElement('span');
    value.textContent = '-';
    value.style.color = '#e8f4ff';

    row.appendChild(key);
    row.appendChild(value);
    this.root.appendChild(row);
    this.stats.set(label, value);
  }

  public mount(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    document.body.appendChild(this.root);
  }

  public unmount(): void {
    this.running = false;
    this.root.remove();
  }

  public update(): void {
    if (!this.running) {
      return;
    }

    const now = performance.now();
    if (now - this.lastUpdate < this.updateIntervalMs) {
      return;
    }
    this.lastUpdate = now;

    const fps = this.engine.getFps();
    const drawCallsRaw = (this.engine as unknown as { drawCalls?: number }).drawCalls;
    const drawCalls = typeof drawCallsRaw === 'number' ? drawCallsRaw : this.scene.getActiveMeshes().length;
    const meshCount = this.scene.meshes.length;
    const gpuMemoryMB = this.computeGpuMemoryMB();
    const loadedChunks = this.provider.getLoadedChunks();
    const camera = this.provider.getCameraPosition();

    this.setValue('FPS', fps.toFixed(1));
    this.setValue('Draw Calls', String(drawCalls));
    this.setValue('Mesh Count', String(meshCount));
    this.setValue('GPU Memory', `${gpuMemoryMB.toFixed(2)} MB`);
    this.setValue('Loaded Chunks', String(loadedChunks));
    this.setValue(
      'Camera Position',
      `${camera.x.toFixed(1)}, ${camera.y.toFixed(1)}, ${camera.z.toFixed(1)}`
    );
  }

  private setValue(key: string, value: string): void {
    const cell = this.stats.get(key);
    if (cell) {
      cell.textContent = value;
    }
  }

  private computeGpuMemoryMB(): number {
    let bytes = 0;

    for (const texture of this.scene.textures) {
      if (!texture.isReady()) {
        continue;
      }
      const size = texture.getSize();
      const width = size.width || 0;
      const height = size.height || 0;
      const channels = 4;
      let faces = 1;
      if (texture.isCube) {
        faces = 6;
      }
      bytes += width * height * channels * faces;
    }

    return bytes / (1024 * 1024);
  }
}
