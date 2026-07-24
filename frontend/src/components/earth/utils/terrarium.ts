/** Terrarium RGB → elevation meters (Mapzen / AWS / Seascape). */
export function terrariumToMeters(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}
