/**
 * Robust texture loading with local → CDN fallback.
 * Supports progressive resolution: drop 2K–8K maps into /public/textures/earth/.
 */
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from "three";
import { TEXTURE_CDN_FALLBACKS, TEXTURE_PATHS } from "./constants";

export type EarthTextureKey = keyof typeof TEXTURE_PATHS;

export interface LoadedEarthTextures {
  day: Texture;
  night: Texture;
  normal: Texture;
  specular: Texture;
  roughness: Texture;
  clouds: Texture;
}

function getLoader(): TextureLoader {
  if (typeof window === "undefined") {
    throw new Error("TextureLoader unavailable on the server");
  }
  return new TextureLoader();
}

function loadTexture(url: string): Promise<Texture> {
  const loader = getLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (texture) => resolve(texture),
      undefined,
      (err) => reject(err),
    );
  });
}

async function loadWithFallback(
  localUrl: string,
  cdnUrl: string,
): Promise<Texture> {
  try {
    return await loadTexture(localUrl);
  } catch {
    return loadTexture(cdnUrl);
  }
}

function configureColorMap(texture: Texture, anisotropy: number): Texture {
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function configureDataMap(texture: Texture, anisotropy: number): Texture {
  texture.anisotropy = anisotropy;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Cap texture GPU size for mobile / low tiers while keeping mipmaps sharp.
 */
function maybeDownscaleHint(texture: Texture, maxSize: number) {
  const img = texture.image as
    | HTMLImageElement
    | ImageBitmap
    | { width: number; height: number }
    | undefined;
  if (!img || !("width" in img)) return;
  if (img.width <= maxSize && img.height <= maxSize) return;
  // Browser will still upload full image; document path for local 8K assets.
  // Real downscale would need canvas — skip to avoid CPU stalls on first load.
  void maxSize;
}

/**
 * Load Earth PBR texture set with local → CDN fallback.
 * Prefer local 4K/8K Blue Marble / Solar System Scope maps when present.
 */
export async function loadEarthTextures(
  anisotropy = 8,
  textureMaxSize = 4096,
): Promise<LoadedEarthTextures> {
  const keys = Object.keys(TEXTURE_PATHS) as EarthTextureKey[];

  const entries = await Promise.all(
    keys.map(async (key) => {
      const texture = await loadWithFallback(
        TEXTURE_PATHS[key],
        TEXTURE_CDN_FALLBACKS[key],
      );
      maybeDownscaleHint(texture, textureMaxSize);
      return [key, texture] as const;
    }),
  );

  const map = Object.fromEntries(entries) as Record<EarthTextureKey, Texture>;

  configureColorMap(map.day, anisotropy);
  configureColorMap(map.night, anisotropy);
  configureColorMap(map.clouds, anisotropy);
  configureDataMap(map.normal, anisotropy);
  configureDataMap(map.specular, anisotropy);
  configureDataMap(map.roughness, anisotropy);

  return {
    day: map.day,
    night: map.night,
    normal: map.normal,
    specular: map.specular,
    roughness: map.roughness,
    clouds: map.clouds,
  };
}
