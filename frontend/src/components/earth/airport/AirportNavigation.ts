import { Vector3 } from "three";
import { createAirportFrame, offsetToWorld } from "./airportMath";
import { TIA_LAYOUT } from "./data";
import type { AirportFrame, AirportLayout } from "./types";

export interface AirportNavNode {
  id: string;
  kind: "runway" | "taxi" | "stand" | "hold-short" | "queue" | "road";
  position: Vector3;
  headingDeg: number;
  links: string[];
}

export class AirportNavigation {
  private readonly layout: AirportLayout;
  private readonly frame: AirportFrame;
  private readonly nodes = new Map<string, AirportNavNode>();

  constructor(layout: AirportLayout = TIA_LAYOUT) {
    this.layout = layout;
    this.frame = createAirportFrame(
      layout.position.lat,
      layout.position.lng,
      layout.runway.headingDeg,
    );
    this.buildNodes();
  }

  private add(node: AirportNavNode): void {
    this.nodes.set(node.id, node);
  }

  private buildNodes(): void {
    const runwayHalf = this.layout.runway.lengthM / 2;
    const runwayRight = new Vector3().crossVectors(this.frame.north, this.frame.up).normalize();

    const threshold02 = this.frame.origin
      .clone()
      .addScaledVector(this.frame.north, -0.5 * runwayHalf * 1 / 6_371_000)
      .addScaledVector(this.frame.up, 2 * 1 / 6_371_000);
    const threshold20 = this.frame.origin
      .clone()
      .addScaledVector(this.frame.north, 0.5 * runwayHalf * 1 / 6_371_000)
      .addScaledVector(this.frame.up, 2 * 1 / 6_371_000);

    this.add({ id: "rw02", kind: "runway", position: threshold02, headingDeg: this.layout.runway.headingDeg, links: ["txi-a1", "txi-b1"] });
    this.add({ id: "rw20", kind: "runway", position: threshold20, headingDeg: (this.layout.runway.headingDeg + 180) % 360, links: ["txi-a2", "txi-b2"] });
    this.add({ id: "hs-02", kind: "hold-short", position: threshold02.clone().addScaledVector(runwayRight, 55 / 6_371_000), headingDeg: this.layout.runway.headingDeg, links: ["rw02"] });
    this.add({ id: "hs-20", kind: "hold-short", position: threshold20.clone().addScaledVector(runwayRight, 55 / 6_371_000), headingDeg: (this.layout.runway.headingDeg + 180) % 360, links: ["rw20"] });

    for (const taxiway of this.layout.taxiways) {
      const taxiPos = offsetToWorld(this.frame, taxiway.offsetXM, taxiway.offsetZM, 0);
      this.add({
        id: `txi-${taxiway.name.toLowerCase()}-1`,
        kind: "taxi",
        position: taxiPos,
        headingDeg: taxiway.headingDeg,
        links: [],
      });
    }

    for (const stand of this.layout.stands) {
      const pos = offsetToWorld(this.frame, stand.offsetXM, stand.offsetZM, 0.5);
      this.add({
        id: stand.id,
        kind: "stand",
        position: pos,
        headingDeg: stand.headingDeg,
        links: [],
      });
    }
  }

  getFrame(): AirportFrame {
    return this.frame;
  }

  getNodes(): AirportNavNode[] {
    return Array.from(this.nodes.values());
  }

  getNode(id: string): AirportNavNode | null {
    return this.nodes.get(id) ?? null;
  }

  getSpawnPosition(kind: "gate" | "remote" | "cargo" | "helicopter" | "runway" = "gate"): Vector3 {
    const node = this.getNodes().find((entry) => {
      if (kind === "runway") return entry.kind === "runway";
      if (kind === "gate") return entry.id.startsWith("gate-");
      if (kind === "remote") return entry.id.startsWith("remote-");
      if (kind === "cargo") return entry.id.startsWith("cargo-");
      return entry.id.startsWith("helipad-");
    });
    return node ? node.position.clone() : this.frame.origin.clone();
  }

  getTaxiGraph(): Array<{ from: string; to: string }> {
    return [
      { from: "gate-1", to: "txi-a1" },
      { from: "gate-2", to: "txi-a1" },
      { from: "gate-3", to: "txi-a1" },
      { from: "gate-4", to: "txi-b1" },
      { from: "gate-5", to: "txi-b1" },
      { from: "gate-6", to: "txi-b1" },
      { from: "txi-a1", to: "hs-02" },
      { from: "txi-b1", to: "hs-02" },
      { from: "txi-a2", to: "hs-20" },
      { from: "txi-b2", to: "hs-20" },
    ];
  }
}
