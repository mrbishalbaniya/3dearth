import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Vector3,
} from "three";
import { EARTH_RADIUS } from "../utils/constants";
import { latLngToVector3 } from "../utils/geo";
import { EARTH_RADIUS_M } from "../utils/zoomLevels";

const tmp = new Vector3();

/** Densify a geographic polyline and project to unit sphere. */
export function lineStringToSpherePositions(
  coords: Array<[number, number]>,
  radius = EARTH_RADIUS * 1.0018,
  maxStepDeg = 0.35,
): Float32Array {
  const positions: number[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    const dLat = lat2 - lat1;
    const dLng = ((lng2 - lng1 + 540) % 360) - 180;
    const steps = Math.max(
      1,
      Math.ceil(Math.sqrt(dLat * dLat + dLng * dLng) / maxStepDeg),
    );
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      latLngToVector3(lat1 + dLat * t0, lng1 + dLng * t0, radius, tmp);
      positions.push(tmp.x, tmp.y, tmp.z);
      latLngToVector3(lat1 + dLat * t1, lng1 + dLng * t1, radius, tmp);
      positions.push(tmp.x, tmp.y, tmp.z);
    }
  }
  return new Float32Array(positions);
}

export function createLineGeometry(
  segments: Float32Array[],
): BufferGeometry {
  let total = 0;
  for (const s of segments) total += s.length;
  const merged = new Float32Array(total);
  let offset = 0;
  for (const s of segments) {
    merged.set(s, offset);
    offset += s.length;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(merged, 3));
  return geo;
}

/** Fan-triangulate a simple ring onto the sphere as a mesh (approx). */
export function polygonToSphereGeometry(
  ring: Array<[number, number]>,
  radius = EARTH_RADIUS * 1.0015,
  elevM = 0,
): BufferGeometry {
  const r = radius + elevM / EARTH_RADIUS_M;
  if (ring.length < 3) return new BufferGeometry();

  // Centroid
  let latC = 0;
  let lngC = 0;
  for (const [lng, lat] of ring) {
    latC += lat;
    lngC += lng;
  }
  latC /= ring.length;
  lngC /= ring.length;

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const center = latLngToVector3(latC, lngC, r);
  positions.push(center.x, center.y, center.z);
  const cn = center.clone().normalize();
  normals.push(cn.x, cn.y, cn.z);
  colors.push(1, 1, 1);

  const verts: Vector3[] = [];
  for (const [lng, lat] of ring) {
    const p = latLngToVector3(lat, lng, r);
    verts.push(p);
    positions.push(p.x, p.y, p.z);
    const n = p.clone().normalize();
    normals.push(n.x, n.y, n.z);
    colors.push(1, 1, 1);
  }

  for (let i = 1; i < verts.length; i++) {
    indices.push(0, i, i + 1 <= verts.length ? i + 1 : 1);
  }
  // close
  if (verts.length > 2) {
    indices.push(0, verts.length, 1);
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geo.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  geo.setIndex(indices);
  return geo;
}

export function applyVertexColor(geo: BufferGeometry, hex: string): void {
  const color = new Color(hex);
  const pos = geo.getAttribute("position");
  if (!pos) return;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
}

export function metersToRadiusOffset(meters: number): number {
  return meters / EARTH_RADIUS_M;
}
