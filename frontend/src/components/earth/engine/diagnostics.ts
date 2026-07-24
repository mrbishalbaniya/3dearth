/**
 * Engine self-diagnostics for tests / CI smoke checks.
 */
import { EarthEngine } from "./core/EarthEngine";
import { EventBus } from "./core/EventBus";
import { GeoAnalytics } from "./analytics/GeoAnalytics";
import { QuadTree } from "./spatial/indexes";

export function runEngineDiagnostics(): {
  ok: boolean;
  checks: Array<{ name: string; pass: boolean; detail?: string }>;
} {
  const checks: Array<{ name: string; pass: boolean; detail?: string }> = [];

  try {
    const bus = new EventBus();
    let fired = false;
    bus.on("engine:ready", () => {
      fired = true;
    });
    bus.emit("engine:ready", { version: "test" });
    checks.push({ name: "EventBus", pass: fired });
  } catch (e) {
    checks.push({ name: "EventBus", pass: false, detail: String(e) });
  }

  try {
    const d = GeoAnalytics.distanceMeters(0, 0, 0, 1);
    checks.push({
      name: "GeoAnalytics.distance",
      pass: d > 100_000 && d < 120_000,
      detail: `${Math.round(d)} m`,
    });
  } catch (e) {
    checks.push({ name: "GeoAnalytics.distance", pass: false, detail: String(e) });
  }

  try {
    const qt = new QuadTree<{ n: number }>({
      minX: -180,
      maxX: 180,
      minY: -90,
      maxY: 90,
    });
    qt.insert({
      id: "a",
      minX: 10,
      maxX: 11,
      minY: 20,
      maxY: 21,
      data: { n: 1 },
    });
    const hits = qt.query({ minX: 9, maxX: 12, minY: 19, maxY: 22 });
    checks.push({ name: "QuadTree.query", pass: hits.length === 1 });
  } catch (e) {
    checks.push({ name: "QuadTree.query", pass: false, detail: String(e) });
  }

  try {
    const eng = EarthEngine.create().init();
    checks.push({ name: "EarthEngine.init", pass: eng.isReady });
    eng.dispose();
    checks.push({ name: "EarthEngine.dispose", pass: !eng.isReady });
  } catch (e) {
    checks.push({ name: "EarthEngine.init", pass: false, detail: String(e) });
  }

  return { ok: checks.every((c) => c.pass), checks };
}
