/**
 * Plugin registry — register layers, tools, shaders, data sources without
 * modifying EarthEngine core.
 */
import type { EarthEngine } from "../core/EarthEngine";
import type {
  DataSourceDescriptor,
  EarthPlugin,
  EngineManager,
  PluginContext,
  ToolDescriptor,
} from "../core/types";

export class PluginManager implements EngineManager {
  readonly id = "plugin";
  private engine!: EarthEngine;
  private plugins = new Map<string, EarthPlugin>();
  private layers = new Map<string, () => unknown>();
  private controls = new Map<string, () => unknown>();
  private shaders = new Map<string, { vertex: string; fragment: string }>();
  private dataSources = new Map<string, DataSourceDescriptor>();
  private widgets = new Map<string, () => unknown>();
  private tools = new Map<string, ToolDescriptor>();

  init(engine: EarthEngine): void {
    this.engine = engine;
  }

  private context(): PluginContext {
    return {
      engine: this.engine,
      registerLayer: (id, factory) => this.layers.set(id, factory),
      registerControl: (id, factory) => this.controls.set(id, factory),
      registerShader: (id, source) => this.shaders.set(id, source),
      registerDataSource: (id, source) => this.dataSources.set(id, source),
      registerWidget: (id, factory) => this.widgets.set(id, factory),
      registerTool: (id, tool) => this.tools.set(id, tool),
    };
  }

  async register(plugin: EarthPlugin) {
    if (this.plugins.has(plugin.id)) {
      this.engine.logger.warn(this.id, `plugin ${plugin.id} already registered`);
      return;
    }
    await plugin.activate(this.context());
    this.plugins.set(plugin.id, plugin);
    this.engine.events.emit("plugin:register", { id: plugin.id });
    this.engine.logger.info(this.id, `activated ${plugin.id}@${plugin.version}`);
  }

  async unregister(id: string) {
    const p = this.plugins.get(id);
    if (!p) return;
    await p.deactivate?.(this.context());
    this.plugins.delete(id);
  }

  getLayer(id: string) {
    return this.layers.get(id)?.();
  }

  getTool(id: string) {
    return this.tools.get(id);
  }

  list() {
    return [...this.plugins.values()].map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
    }));
  }

  dispose(): void {
    for (const id of [...this.plugins.keys()]) {
      void this.unregister(id);
    }
    this.layers.clear();
    this.controls.clear();
    this.shaders.clear();
    this.dataSources.clear();
    this.widgets.clear();
    this.tools.clear();
  }
}
