/**
 * Texture loader for solar-system bodies — local optional, CDN fallback.
 */
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from "three";

const cache = new Map<string, Promise<Texture | null>>();
const loader = new TextureLoader();

function prep(tex: Texture, anisotropy = 4): Texture {
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = anisotropy;
  return tex;
}

/** Load a map; returns null on failure (caller uses solid color). */
export function loadBodyTexture(url: string): Promise<Texture | null> {
  const hit = cache.get(url);
  if (hit) return hit;

  const p = new Promise<Texture | null>((resolve) => {
    loader.load(
      url,
      (tex) => resolve(prep(tex)),
      undefined,
      () => resolve(null),
    );
  });
  cache.set(url, p);
  return p;
}

export function disposeBodyTextures(): void {
  for (const p of cache.values()) {
    void p.then((t) => t?.dispose());
  }
  cache.clear();
}
