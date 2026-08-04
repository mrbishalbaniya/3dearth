import type { AirportLayout } from "../../../earth/airport/types";
import { AirportNavigation } from "../../../earth/airport/AirportNavigation";

export interface TaxiRouteNode {
  id: string;
  headingDeg: number;
}

export class NavigationManager {
  private readonly navigation: AirportNavigation;

  constructor(layout: AirportLayout) {
    this.navigation = new AirportNavigation(layout);
  }

  getNavigation(): AirportNavigation {
    return this.navigation;
  }

  getTaxiGraph(): Array<{ from: string; to: string }> {
    return this.navigation.getTaxiGraph();
  }

  getSpawn(kind: "gate" | "remote" | "cargo" | "helicopter" | "runway" = "gate") {
    return this.navigation.getSpawnPosition(kind);
  }

  buildTaxiPath(startId: string, endId: string): string[] {
    if (startId === endId) return [startId];
    const graph = this.getTaxiGraph();
    const next = new Map<string, string[]>();
    for (const edge of graph) {
      const list = next.get(edge.from) ?? [];
      list.push(edge.to);
      next.set(edge.from, list);
    }
    const queue: Array<{ node: string; path: string[] }> = [{ node: startId, path: [startId] }];
    const seen = new Set<string>([startId]);
    while (queue.length) {
      const current = queue.shift();
      if (!current) break;
      const neighbors = next.get(current.node) ?? [];
      for (const neighbor of neighbors) {
        if (seen.has(neighbor)) continue;
        const path = [...current.path, neighbor];
        if (neighbor === endId) return path;
        seen.add(neighbor);
        queue.push({ node: neighbor, path });
      }
    }
    return [startId, endId];
  }
}
