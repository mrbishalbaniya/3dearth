/**
 * Spatial indexes — QuadTree, SpatialHash, simple R-Tree & BVH stubs.
 */
import type { BBox2D, SpatialItem } from "../core/types";

function intersects(a: BBox2D, b: BBox2D) {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

function containsPoint(b: BBox2D, x: number, y: number) {
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

/** Point / small-feature QuadTree. */
export class QuadTree<T> {
  private items: SpatialItem<T>[] = [];
  private children: QuadTree<T>[] | null = null;
  private readonly capacity: number;
  private readonly maxDepth: number;
  private readonly depth: number;
  private readonly bounds: BBox2D;

  constructor(
    bounds: BBox2D,
    capacity = 8,
    maxDepth = 8,
    depth = 0,
  ) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.maxDepth = maxDepth;
    this.depth = depth;
  }

  insert(item: SpatialItem<T>): boolean {
    if (!intersects(this.bounds, item)) return false;
    if (
      this.items.length < this.capacity ||
      this.depth >= this.maxDepth
    ) {
      if (!this.children) {
        this.items.push(item);
        return true;
      }
    }
    if (!this.children) this.subdivide();
    for (const c of this.children!) {
      if (c.insert(item)) return true;
    }
    this.items.push(item);
    return true;
  }

  private subdivide() {
    const { minX, minY, maxX, maxY } = this.bounds;
    const mx = (minX + maxX) / 2;
    const my = (minY + maxY) / 2;
    this.children = [
      new QuadTree({ minX, minY, maxX: mx, maxY: my }, this.capacity, this.maxDepth, this.depth + 1),
      new QuadTree({ minX: mx, minY, maxX, maxY: my }, this.capacity, this.maxDepth, this.depth + 1),
      new QuadTree({ minX, minY: my, maxX: mx, maxY }, this.capacity, this.maxDepth, this.depth + 1),
      new QuadTree({ minX: mx, minY: my, maxX, maxY }, this.capacity, this.maxDepth, this.depth + 1),
    ];
    const pending = this.items;
    this.items = [];
    for (const it of pending) this.insert(it);
  }

  query(range: BBox2D, out: SpatialItem<T>[] = []): SpatialItem<T>[] {
    if (!intersects(this.bounds, range)) return out;
    for (const it of this.items) {
      if (intersects(it, range)) out.push(it);
    }
    if (this.children) {
      for (const c of this.children) c.query(range, out);
    }
    return out;
  }

  queryPoint(x: number, y: number, out: SpatialItem<T>[] = []): SpatialItem<T>[] {
    if (!containsPoint(this.bounds, x, y)) return out;
    for (const it of this.items) {
      if (containsPoint(it, x, y)) out.push(it);
    }
    if (this.children) {
      for (const c of this.children) c.queryPoint(x, y, out);
    }
    return out;
  }

  clear() {
    this.items = [];
    this.children = null;
  }
}

/** Uniform grid spatial hash for fast nearest / range. */
export class SpatialHash<T> {
  private cells = new Map<string, SpatialItem<T>[]>();
  constructor(private cellSize: number) {}

  private key(x: number, y: number) {
    return `${Math.floor(x / this.cellSize)}:${Math.floor(y / this.cellSize)}`;
  }

  insert(item: SpatialItem<T>) {
    const x0 = Math.floor(item.minX / this.cellSize);
    const x1 = Math.floor(item.maxX / this.cellSize);
    const y0 = Math.floor(item.minY / this.cellSize);
    const y1 = Math.floor(item.maxY / this.cellSize);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const k = `${x}:${y}`;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k)!.push(item);
      }
    }
  }

  query(range: BBox2D): SpatialItem<T>[] {
    const out: SpatialItem<T>[] = [];
    const seen = new Set<string>();
    const x0 = Math.floor(range.minX / this.cellSize);
    const x1 = Math.floor(range.maxX / this.cellSize);
    const y0 = Math.floor(range.minY / this.cellSize);
    const y1 = Math.floor(range.maxY / this.cellSize);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const list = this.cells.get(`${x}:${y}`);
        if (!list) continue;
        for (const it of list) {
          if (seen.has(it.id)) continue;
          seen.add(it.id);
          if (intersects(it, range)) out.push(it);
        }
      }
    }
    return out;
  }

  nearest(x: number, y: number, maxDist: number): SpatialItem<T> | null {
    const range: BBox2D = {
      minX: x - maxDist,
      maxX: x + maxDist,
      minY: y - maxDist,
      maxY: y + maxDist,
    };
    let best: SpatialItem<T> | null = null;
    let bestD = maxDist * maxDist;
    for (const it of this.query(range)) {
      const cx = (it.minX + it.maxX) / 2;
      const cy = (it.minY + it.maxY) / 2;
      const d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  clear() {
    this.cells.clear();
  }
}

/** Flat R-Tree style bulk list with linear scan — upgradeable to true R-tree. */
export class RTreeIndex<T> {
  private items: SpatialItem<T>[] = [];

  insert(item: SpatialItem<T>) {
    this.items.push(item);
  }

  query(range: BBox2D) {
    return this.items.filter((it) => intersects(it, range));
  }

  clear() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }
}

/** Simple BVH for 2D picking — binary split by longest axis. */
export class BVH2D<T> {
  private root: BVHNode<T> | null = null;

  build(items: SpatialItem<T>[]) {
    this.root = buildNode(items, 0);
  }

  query(range: BBox2D, out: SpatialItem<T>[] = []): SpatialItem<T>[] {
    if (this.root) queryNode(this.root, range, out);
    return out;
  }

  clear() {
    this.root = null;
  }
}

interface BVHNode<T> {
  bounds: BBox2D;
  item?: SpatialItem<T>;
  left?: BVHNode<T>;
  right?: BVHNode<T>;
}

function union(a: BBox2D, b: BBox2D): BBox2D {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

function buildNode<T>(items: SpatialItem<T>[], depth: number): BVHNode<T> | null {
  if (!items.length) return null;
  if (items.length === 1) {
    return { bounds: items[0], item: items[0] };
  }
  const bounds = items.reduce<BBox2D>(
    (acc, it) => union(acc, it),
    {
      minX: items[0].minX,
      minY: items[0].minY,
      maxX: items[0].maxX,
      maxY: items[0].maxY,
    },
  );
  const axis = bounds.maxX - bounds.minX > bounds.maxY - bounds.minY ? "x" : "y";
  const sorted = [...items].sort((a, b) =>
    axis === "x"
      ? (a.minX + a.maxX) / 2 - (b.minX + b.maxX) / 2
      : (a.minY + a.maxY) / 2 - (b.minY + b.maxY) / 2,
  );
  const mid = Math.floor(sorted.length / 2);
  return {
    bounds,
    left: buildNode(sorted.slice(0, mid), depth + 1) ?? undefined,
    right: buildNode(sorted.slice(mid), depth + 1) ?? undefined,
  };
}

function queryNode<T>(node: BVHNode<T>, range: BBox2D, out: SpatialItem<T>[]) {
  if (!intersects(node.bounds, range)) return;
  if (node.item) {
    out.push(node.item);
    return;
  }
  if (node.left) queryNode(node.left, range, out);
  if (node.right) queryNode(node.right, range, out);
}
