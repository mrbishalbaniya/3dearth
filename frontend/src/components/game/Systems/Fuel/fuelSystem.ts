/**
 * Fuel system — tanks, pumps, selector, starvation, imbalance.
 * Aircraft mass decreases as fuel burns (coupled via SystemsBus).
 */

import type { FuelSystemState, FuelTankState } from "../types";

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function createFuelSystem(capacityKg: number, fillFrac = 0.85): FuelSystemState {
  const total = capacityKg * fillFrac;
  // Light aircraft: mostly wing tanks; jets get a center tank share
  const hasCenter = capacityKg >= 500;
  const tanks: FuelTankState[] = hasCenter
    ? [
        {
          id: "left",
          capacityKg: capacityKg * 0.35,
          qtyKg: total * 0.35,
          pumpOn: true,
        },
        {
          id: "right",
          capacityKg: capacityKg * 0.35,
          qtyKg: total * 0.35,
          pumpOn: true,
        },
        {
          id: "center",
          capacityKg: capacityKg * 0.3,
          qtyKg: total * 0.3,
          pumpOn: true,
        },
      ]
    : [
        {
          id: "left",
          capacityKg: capacityKg * 0.5,
          qtyKg: total * 0.5,
          pumpOn: true,
        },
        {
          id: "right",
          capacityKg: capacityKg * 0.5,
          qtyKg: total * 0.5,
          pumpOn: true,
        },
      ];

  return summarize(tanks, "both");
}

function summarize(
  tanks: FuelTankState[],
  selector: FuelSystemState["selector"],
): FuelSystemState {
  const totalKg = tanks.reduce((s, t) => s + t.qtyKg, 0);
  const left = tanks.find((t) => t.id === "left")?.qtyKg ?? 0;
  const right = tanks.find((t) => t.id === "right")?.qtyKg ?? 0;
  return {
    tanks,
    selector,
    totalKg,
    imbalanceKg: left - right,
    starved: totalKg < 0.5,
  };
}

/** Draw fuel equally from selected tanks; returns updated state + whether fuel was available. */
export function burnFuel(
  fuel: FuelSystemState,
  demandKgS: number,
  dt: number,
): { fuel: FuelSystemState; deliveredKg: number; starved: boolean } {
  const need = demandKgS * dt;
  if (need <= 0) {
    return { fuel: summarize(fuel.tanks, fuel.selector), deliveredKg: 0, starved: fuel.starved };
  }

  const tanks = fuel.tanks.map((t) => ({ ...t }));
  const selectable = tanks.filter((t) => {
    if (!t.pumpOn || t.qtyKg <= 0) return false;
    if (fuel.selector === "both") return t.id === "left" || t.id === "right" || t.id === "center";
    return t.id === fuel.selector;
  });

  if (selectable.length === 0) {
    return {
      fuel: { ...summarize(tanks, fuel.selector), starved: true },
      deliveredKg: 0,
      starved: true,
    };
  }

  let remaining = need;
  // Prefer center first (jets), then balance L/R
  const order = [...selectable].sort((a, b) => {
    if (a.id === "center") return -1;
    if (b.id === "center") return 1;
    return 0;
  });

  for (const t of order) {
    if (remaining <= 0) break;
    const take = Math.min(t.qtyKg, remaining / Math.max(1, order.filter((x) => x.qtyKg > 0).length));
    // Equal split among tanks still having fuel
  }
  // Proper equal draw
  remaining = need;
  while (remaining > 1e-6) {
    const live = order.filter((t) => t.qtyKg > 1e-6);
    if (live.length === 0) break;
    const share = remaining / live.length;
    for (const t of live) {
      const take = Math.min(t.qtyKg, share);
      t.qtyKg -= take;
      remaining -= take;
    }
  }

  const delivered = need - remaining;
  // Soft transfer: reduce imbalance slowly when both pumps on
  const L = tanks.find((t) => t.id === "left");
  const R = tanks.find((t) => t.id === "right");
  if (L && R && L.pumpOn && R.pumpOn && fuel.selector === "both") {
    const diff = L.qtyKg - R.qtyKg;
    if (Math.abs(diff) > 2) {
      const xfer = clamp(diff * 0.02 * dt, -0.5 * dt, 0.5 * dt);
      L.qtyKg -= xfer;
      R.qtyKg += xfer;
    }
  }

  const next = summarize(tanks, fuel.selector);
  return {
    fuel: next,
    deliveredKg: delivered,
    starved: delivered < need * 0.5 || next.totalKg < 0.5,
  };
}
