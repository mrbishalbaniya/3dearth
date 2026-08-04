import { Camera } from '@babylonjs/core/Cameras/camera';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Plane } from '@babylonjs/core/Maths/math.plane';
import { BoundingBox } from '../types/TerrainTypes';

export class FrustumCuller {
  private frustumPlanes: Plane[] = [];
  private viewProjectionMatrix = Matrix.Zero();

  public updateFrustum(camera: Camera): void {
    const viewMatrix = camera.getViewMatrix();
    const projectionMatrix = camera.getProjectionMatrix();
    
    viewMatrix.multiplyToRef(projectionMatrix, this.viewProjectionMatrix);
    this.extractFrustumPlanes(this.viewProjectionMatrix);
  }

  private extractFrustumPlanes(matrix: Matrix): void {
    const m = matrix.m;
    
    this.frustumPlanes = [
      // Left plane
      new Plane(
        m[3] + m[0],
        m[7] + m[4],
        m[11] + m[8],
        m[15] + m[12]
      ),
      // Right plane
      new Plane(
        m[3] - m[0],
        m[7] - m[4],
        m[11] - m[8],
        m[15] - m[12]
      ),
      // Bottom plane
      new Plane(
        m[3] + m[1],
        m[7] + m[5],
        m[11] + m[9],
        m[15] + m[13]
      ),
      // Top plane
      new Plane(
        m[3] - m[1],
        m[7] - m[5],
        m[11] - m[9],
        m[15] - m[13]
      ),
      // Near plane
      new Plane(
        m[2],
        m[6],
        m[10],
        m[14]
      ),
      // Far plane
      new Plane(
        m[3] - m[2],
        m[7] - m[6],
        m[11] - m[10],
        m[15] - m[14]
      )
    ];

    // Normalize planes
    for (const plane of this.frustumPlanes) {
      plane.normalize();
    }
  }

  public isBoxInFrustum(bounds: BoundingBox): boolean {
    const min = new Vector3(bounds.min.x, bounds.min.y, bounds.min.z);
    const max = new Vector3(bounds.max.x, bounds.max.y, bounds.max.z);

    for (const plane of this.frustumPlanes) {
      // Get positive vertex (farthest in direction of plane normal)
      const positiveVertex = new Vector3(
        plane.normal.x >= 0 ? max.x : min.x,
        plane.normal.y >= 0 ? max.y : min.y,
        plane.normal.z >= 0 ? max.z : min.z
      );

      // If positive vertex is behind plane, box is completely outside
      if (plane.dotCoordinate(positiveVertex) < 0) {
        return false;
      }
    }

    return true;
  }

  public isSphereInFrustum(center: Vector3, radius: number): boolean {
    for (const plane of this.frustumPlanes) {
      if (plane.dotCoordinate(center) < -radius) {
        return false;
      }
    }
    return true;
  }

  public isPointInFrustum(point: Vector3): boolean {
    for (const plane of this.frustumPlanes) {
      if (plane.dotCoordinate(point) < 0) {
        return false;
      }
    }
    return true;
  }

  public getFrustumPlanes(): Plane[] {
    return this.frustumPlanes;
  }

  public getBoxIntersection(bounds: BoundingBox): 'inside' | 'intersecting' | 'outside' {
    const min = new Vector3(bounds.min.x, bounds.min.y, bounds.min.z);
    const max = new Vector3(bounds.max.x, bounds.max.y, bounds.max.z);
    let intersecting = false;

    for (const plane of this.frustumPlanes) {
      // Get positive and negative vertices
      const positiveVertex = new Vector3(
        plane.normal.x >= 0 ? max.x : min.x,
        plane.normal.y >= 0 ? max.y : min.y,
        plane.normal.z >= 0 ? max.z : min.z
      );

      const negativeVertex = new Vector3(
        plane.normal.x >= 0 ? min.x : max.x,
        plane.normal.y >= 0 ? min.y : max.y,
        plane.normal.z >= 0 ? min.z : max.z
      );

      if (plane.dotCoordinate(positiveVertex) < 0) {
        return 'outside';
      }

      if (plane.dotCoordinate(negativeVertex) < 0) {
        intersecting = true;
      }
    }

    return intersecting ? 'intersecting' : 'inside';
  }

  public calculateDistance(point: Vector3): number {
    const cameraPosition = this.extractCameraPosition();
    return Vector3.Distance(cameraPosition, point);
  }

  private extractCameraPosition(): Vector3 {
    const invMatrix = Matrix.Invert(this.viewProjectionMatrix);
    return Vector3.TransformCoordinates(Vector3.Zero(), invMatrix);
  }
}