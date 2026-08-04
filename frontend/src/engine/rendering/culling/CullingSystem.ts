import { Scene } from '@babylonjs/core/scene';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { Frustum } from '@babylonjs/core/Maths/math.frustum';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '../../core/Logger';

export class CullingSystem {
  private scene: Scene;
  private logger: Logger;
  private enabled: boolean = true;
  private frustumCullingEnabled: boolean = true;
  private occlusionCullingEnabled: boolean = false;
  private distanceCullingEnabled: boolean = true;
  private maxRenderDistance: number = 1000;
  private culledMeshes: Set<AbstractMesh>;
  private visibleMeshes: Set<AbstractMesh>;
  private occlusionQueries: Map<AbstractMesh, WebGLQuery>;

  constructor(scene: Scene) {
    this.scene = scene;
    this.logger = Logger.getInstance();
    this.culledMeshes = new Set();
    this.visibleMeshes = new Set();
    this.occlusionQueries = new Map();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing Culling System', 'Culling');
    
    this.setupCulling();
    
    this.logger.info('Culling System initialized', 'Culling');
  }

  private setupCulling(): void {
    // Register culling callback
    this.scene.registerBeforeRender(() => {
      if (this.enabled) {
        this.performCulling();
      }
    });
  }

  public performCulling(): void {
    if (!this.scene.activeCamera) {
      return;
    }

    const camera = this.scene.activeCamera;
    const meshes = this.scene.meshes;
    
    // Clear previous frame data
    this.culledMeshes.clear();
    this.visibleMeshes.clear();

    // Get camera frustum
    const frustumPlanes = this.getFrustumPlanes(camera);

    for (const mesh of meshes) {
      if (!mesh.isEnabled() || !mesh.isVisible) {
        continue;
      }

      let shouldCull = false;

      // Distance culling
      if (this.distanceCullingEnabled) {
        shouldCull = this.performDistanceCulling(mesh, camera);
      }

      // Frustum culling
      if (!shouldCull && this.frustumCullingEnabled) {
        shouldCull = this.performFrustumCulling(mesh, frustumPlanes);
      }

      // Occlusion culling
      if (!shouldCull && this.occlusionCullingEnabled) {
        shouldCull = this.performOcclusionCulling(mesh);
      }

      if (shouldCull) {
        this.culledMeshes.add(mesh);
        mesh.setEnabled(false);
      } else {
        this.visibleMeshes.add(mesh);
        mesh.setEnabled(true);
      }
    }
  }

  private getFrustumPlanes(camera: Camera): any[] {
    const viewMatrix = camera.getViewMatrix();
    const projectionMatrix = camera.getProjectionMatrix();
    const viewProjectionMatrix = viewMatrix.multiply(projectionMatrix);
    
    return Frustum.GetPlanes(viewProjectionMatrix);
  }

  private performDistanceCulling(mesh: AbstractMesh, camera: Camera): boolean {
    const meshPosition = mesh.getAbsolutePosition();
    const cameraPosition = camera.position;
    const distance = cameraPosition.subtract(meshPosition).length();
    
    return distance > this.maxRenderDistance;
  }

  private performFrustumCulling(mesh: AbstractMesh, frustumPlanes: any[]): boolean {
    const boundingInfo = mesh.getBoundingInfo();
    if (!boundingInfo) {
      return false;
    }

    // Check if bounding sphere is outside any frustum plane
    const boundingSphere = boundingInfo.boundingSphere;
    
    for (const plane of frustumPlanes) {
      const distance = plane.dotCoordinate(boundingSphere.center);
      if (distance < -boundingSphere.radius) {
        return true; // Completely outside this plane
      }
    }
    
    return false; // At least partially inside frustum
  }

  private performOcclusionCulling(mesh: AbstractMesh): boolean {
    // Basic occlusion culling implementation
    // In a full implementation, this would use occlusion queries
    const engine = this.scene.getEngine();
    const gl = engine._gl;
    
    if (!gl || !gl.createQuery) {
      return false; // Occlusion queries not supported
    }

    let query = this.occlusionQueries.get(mesh);
    
    if (!query) {
      query = gl.createQuery();
      if (query) {
        this.occlusionQueries.set(mesh, query);
      } else {
        return false;
      }
    }

    // Start occlusion query
    gl.beginQuery(gl.ANY_SAMPLES_PASSED, query);
    
    // Render bounding box or simplified geometry
    this.renderOcclusionProxy(mesh);
    
    // End query
    gl.endQuery(gl.ANY_SAMPLES_PASSED);
    
    // Check result from previous frame
    if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
      const samples = gl.getQueryParameter(query, gl.QUERY_RESULT);
      return samples === 0; // Occluded if no samples passed
    }
    
    return false; // Don't cull if we don't have results yet
  }

  private renderOcclusionProxy(mesh: AbstractMesh): void {
    // Render a simplified version of the mesh for occlusion testing
    // This could be the bounding box or a low-poly version
    const boundingInfo = mesh.getBoundingInfo();
    if (!boundingInfo) return;

    // In a full implementation, you would render the bounding box
    // or a simplified mesh here using a simple shader
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled) {
      // Re-enable all meshes
      for (const mesh of this.culledMeshes) {
        mesh.setEnabled(true);
      }
      this.culledMeshes.clear();
    }
  }

  public setFrustumCullingEnabled(enabled: boolean): void {
    this.frustumCullingEnabled = enabled;
  }

  public setOcclusionCullingEnabled(enabled: boolean): void {
    this.occlusionCullingEnabled = enabled;
    
    if (!enabled) {
      // Clean up occlusion queries
      const gl = this.scene.getEngine()._gl;
      if (gl) {
        for (const query of this.occlusionQueries.values()) {
          gl.deleteQuery(query);
        }
      }
      this.occlusionQueries.clear();
    }
  }

  public setDistanceCullingEnabled(enabled: boolean): void {
    this.distanceCullingEnabled = enabled;
  }

  public setMaxRenderDistance(distance: number): void {
    this.maxRenderDistance = Math.max(0, distance);
  }

  public getCulledMeshCount(): number {
    return this.culledMeshes.size;
  }

  public getVisibleMeshCount(): number {
    return this.visibleMeshes.size;
  }

  public getCullingStats(): {
    totalMeshes: number;
    visibleMeshes: number;
    culledMeshes: number;
    cullingRatio: number;
  } {
    const totalMeshes = this.scene.meshes.length;
    const visibleMeshes = this.visibleMeshes.size;
    const culledMeshes = this.culledMeshes.size;
    const cullingRatio = totalMeshes > 0 ? culledMeshes / totalMeshes : 0;

    return {
      totalMeshes,
      visibleMeshes,
      culledMeshes,
      cullingRatio
    };
  }

  public forceCullMesh(mesh: AbstractMesh): void {
    this.culledMeshes.add(mesh);
    this.visibleMeshes.delete(mesh);
    mesh.setEnabled(false);
  }

  public forceShowMesh(mesh: AbstractMesh): void {
    this.visibleMeshes.add(mesh);
    this.culledMeshes.delete(mesh);
    mesh.setEnabled(true);
  }

  public isMeshCulled(mesh: AbstractMesh): boolean {
    return this.culledMeshes.has(mesh);
  }

  public isMeshVisible(mesh: AbstractMesh): boolean {
    return this.visibleMeshes.has(mesh);
  }

  public dispose(): void {
    this.logger.info('Disposing Culling System', 'Culling');
    
    // Clean up occlusion queries
    const gl = this.scene.getEngine()._gl;
    if (gl) {
      for (const query of this.occlusionQueries.values()) {
        gl.deleteQuery(query);
      }
    }
    
    this.occlusionQueries.clear();
    this.culledMeshes.clear();
    this.visibleMeshes.clear();
  }
}