import type { BufferGeometry, Material, Object3D, Texture } from "three";

type Disposable = { dispose: () => void };

function isDisposable(value: unknown): value is Disposable {
  return (
    typeof value === "object" &&
    value !== null &&
    "dispose" in value &&
    typeof (value as Disposable).dispose === "function"
  );
}

/** Safely dispose geometry, materials, and textures. */
export function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    const mesh = child as Object3D & {
      geometry?: BufferGeometry;
      material?: Material | Material[];
    };

    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    if (mesh.material) {
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const material of materials) {
        disposeMaterial(material);
      }
    }
  });
}

export function disposeMaterial(material: Material): void {
  const record = material as Material & Record<string, unknown>;

  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value && typeof value === "object" && "isTexture" in (value as object)) {
      (value as Texture).dispose();
    }
  }

  material.dispose();
}

export function disposeTextures(textures: Array<Texture | null | undefined>): void {
  for (const texture of textures) {
    if (texture && isDisposable(texture)) {
      texture.dispose();
    }
  }
}
