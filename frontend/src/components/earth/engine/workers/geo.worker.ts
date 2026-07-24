/// <reference lib="webworker" />
/**
 * Geo worker — JSON parse, haversine batches, simple clustering.
 */
export type {};

function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR;
  const dLng = (lng2 - lng1) * toR;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

self.onmessage = (ev: MessageEvent) => {
  const { id, type, payload } = ev.data as {
    id: number;
    type: string;
    payload: unknown;
  };
  try {
    let result: unknown;
    switch (type) {
      case "parseJson":
        result =
          typeof payload === "string" ? JSON.parse(payload) : payload;
        break;
      case "haversine": {
        const p = payload as {
          lat1: number;
          lng1: number;
          lat2: number;
          lng2: number;
        };
        result = haversineM(p.lat1, p.lng1, p.lat2, p.lng2);
        break;
      }
      case "haversineBatch": {
        const pairs = payload as Array<[number, number, number, number]>;
        result = pairs.map(([a, b, c, d]) => haversineM(a, b, c, d));
        break;
      }
      case "clusterGrid": {
        const { points, cellDeg } = payload as {
          points: Array<{ id: string; lat: number; lng: number }>;
          cellDeg: number;
        };
        const map = new Map<string, { id: string; lat: number; lng: number; count: number }>();
        for (const p of points) {
          const key = `${Math.round(p.lat / cellDeg)}_${Math.round(p.lng / cellDeg)}`;
          const e = map.get(key);
          if (!e) map.set(key, { ...p, count: 1 });
          else e.count += 1;
        }
        result = [...map.values()];
        break;
      }
      default:
        throw new Error(`Unknown geo worker task: ${type}`);
    }
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
