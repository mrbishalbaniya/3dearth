/**
 * Shared helpers for instanced small-body belts.
 */
export function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export interface RockSeed {
  a: number;
  phase: number;
  inc: number;
  size: number;
}

export function makeBeltSeeds(
  count: number,
  innerAu: number,
  outerAu: number,
  minSize: number,
  maxSize: number,
  seedOffset: number,
  incAmp: number,
): RockSeed[] {
  const out: RockSeed[] = [];
  for (let i = 0; i < count; i++) {
    const k = i + seedOffset;
    out.push({
      a: innerAu + hash(k) * (outerAu - innerAu),
      phase: hash(k + 17) * Math.PI * 2,
      inc: (hash(k + 91) - 0.5) * incAmp,
      size: minSize + hash(k + 3) * (maxSize - minSize),
    });
  }
  return out;
}
