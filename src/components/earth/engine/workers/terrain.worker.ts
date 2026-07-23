/// <reference lib="webworker" />
/**
 * Terrain worker — decode Terrarium-style RGB buffers to Float32 heights.
 */
export type {};

function terrariumToMeters(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

self.onmessage = (ev: MessageEvent) => {
  const { id, type, payload } = ev.data as {
    id: number;
    type: string;
    payload: unknown;
  };
  try {
    if (type !== "decodeTerrarium") {
      throw new Error(`Unknown terrain task: ${type}`);
    }
    const { rgba, width, height } = payload as {
      rgba: Uint8ClampedArray | Uint8Array;
      width: number;
      height: number;
    };
    const out = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      out[i] = terrariumToMeters(rgba[o], rgba[o + 1], rgba[o + 2]);
    }
    self.postMessage({ id, ok: true, result: out }, [out.buffer]);
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
