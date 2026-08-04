import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { Quaternion } from '@babylonjs/core/Maths/math.vector';

export class MathUtils {
  public static readonly PI = Math.PI;
  public static readonly TWO_PI = Math.PI * 2;
  public static readonly HALF_PI = Math.PI / 2;
  public static readonly DEG_TO_RAD = Math.PI / 180;
  public static readonly RAD_TO_DEG = 180 / Math.PI;
  public static readonly EPSILON = 0.000001;

  public static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  public static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * this.clamp(t, 0, 1);
  }

  public static smoothStep(edge0: number, edge1: number, x: number): number {
    const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  public static smootherStep(edge0: number, edge1: number, x: number): number {
    const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  public static map(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
    return toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin);
  }

  public static wrap(value: number, min: number, max: number): number {
    const range = max - min;
    if (range <= 0) return min;
    return min + ((((value - min) % range) + range) % range);
  }

  public static randomFloat(min: number = 0, max: number = 1): number {
    return min + Math.random() * (max - min);
  }

  public static randomInt(min: number, max: number): number {
    return Math.floor(this.randomFloat(min, max + 1));
  }

  public static randomBool(): boolean {
    return Math.random() < 0.5;
  }

  public static randomSign(): number {
    return this.randomBool() ? 1 : -1;
  }

  public static distance(a: Vector3, b: Vector3): number {
    return a.subtract(b).length();
  }

  public static distanceSquared(a: Vector3, b: Vector3): number {
    return a.subtract(b).lengthSquared();
  }

  public static angle(from: Vector3, to: Vector3): number {
    const dot = Vector3.Dot(from.normalize(), to.normalize());
    return Math.acos(this.clamp(dot, -1, 1));
  }

  public static signedAngle(from: Vector3, to: Vector3, axis: Vector3): number {
    const unsignedAngle = this.angle(from, to);
    const cross = Vector3.Cross(from, to);
    const sign = Vector3.Dot(axis, cross);
    return sign >= 0 ? unsignedAngle : -unsignedAngle;
  }

  public static reflect(incident: Vector3, normal: Vector3): Vector3 {
    return incident.subtract(normal.scale(2 * Vector3.Dot(incident, normal)));
  }

  public static project(vector: Vector3, onNormal: Vector3): Vector3 {
    const dot = Vector3.Dot(vector, onNormal);
    return onNormal.scale(dot / onNormal.lengthSquared());
  }

  public static perpendicular(vector: Vector3, normal: Vector3): Vector3 {
    return vector.subtract(this.project(vector, normal));
  }

  public static slerp(from: Vector3, to: Vector3, t: number): Vector3 {
    const dot = this.clamp(Vector3.Dot(from.normalize(), to.normalize()), -1, 1);
    const theta = Math.acos(dot) * t;
    const relativeVec = to.subtract(from.scale(dot)).normalize();
    return from.scale(Math.cos(theta)).add(relativeVec.scale(Math.sin(theta)));
  }

  public static bezierCubic(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number): Vector3 {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return p0.scale(uuu)
      .add(p1.scale(3 * uu * t))
      .add(p2.scale(3 * u * tt))
      .add(p3.scale(ttt));
  }

  public static catmullRom(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number): Vector3 {
    const t2 = t * t;
    const t3 = t2 * t;

    const v0 = p2.subtract(p0).scale(0.5);
    const v1 = p3.subtract(p1).scale(0.5);

    return p1.scale(2 * t3 - 3 * t2 + 1)
      .add(p2.scale(-2 * t3 + 3 * t2))
      .add(v0.scale(t3 - 2 * t2 + t))
      .add(v1.scale(t3 - t2));
  }

  public static isPowerOfTwo(value: number): boolean {
    return (value & (value - 1)) === 0 && value !== 0;
  }

  public static nextPowerOfTwo(value: number): number {
    value--;
    value |= value >> 1;
    value |= value >> 2;
    value |= value >> 4;
    value |= value >> 8;
    value |= value >> 16;
    return value + 1;
  }

  public static snap(value: number, step: number): number {
    return Math.round(value / step) * step;
  }

  public static almostEqual(a: number, b: number, epsilon: number = this.EPSILON): boolean {
    return Math.abs(a - b) < epsilon;
  }

  public static almostZero(value: number, epsilon: number = this.EPSILON): boolean {
    return Math.abs(value) < epsilon;
  }

  public static sign(value: number): number {
    return value > 0 ? 1 : value < 0 ? -1 : 0;
  }

  public static fract(value: number): number {
    return value - Math.floor(value);
  }

  public static mod(a: number, b: number): number {
    return ((a % b) + b) % b;
  }

  public static easeInSine(t: number): number {
    return 1 - Math.cos((t * Math.PI) / 2);
  }

  public static easeOutSine(t: number): number {
    return Math.sin((t * Math.PI) / 2);
  }

  public static easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  public static easeInQuad(t: number): number {
    return t * t;
  }

  public static easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  public static easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public static easeInCubic(t: number): number {
    return t * t * t;
  }

  public static easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public static easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public static easeInExpo(t: number): number {
    return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
  }

  public static easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  public static easeInOutExpo(t: number): number {
    return t === 0
      ? 0
      : t === 1
      ? 1
      : t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  }

  public static degToRad(degrees: number): number {
    return degrees * this.DEG_TO_RAD;
  }

  public static radToDeg(radians: number): number {
    return radians * this.RAD_TO_DEG;
  }

  public static wrapAngle(angle: number): number {
    return this.wrap(angle, -Math.PI, Math.PI);
  }

  public static shortestAngularDistance(from: number, to: number): number {
    const difference = this.wrapAngle(to - from);
    return difference;
  }

  public static lerpAngle(from: number, to: number, t: number): number {
    return from + this.shortestAngularDistance(from, to) * t;
  }

  public static randomPointInSphere(radius: number = 1): Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2 * Math.PI;
    const phi = Math.acos(2 * v - 1);
    const r = Math.cbrt(Math.random()) * radius;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    return new Vector3(x, y, z);
  }

  public static randomPointOnSphere(radius: number = 1): Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2 * Math.PI;
    const phi = Math.acos(2 * v - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    return new Vector3(x, y, z);
  }

  public static randomPointInCircle(radius: number = 1): { x: number; y: number } {
    const r = radius * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta)
    };
  }

  public static barycentric(point: Vector3, a: Vector3, b: Vector3, c: Vector3): Vector3 {
    const v0 = c.subtract(a);
    const v1 = b.subtract(a);
    const v2 = point.subtract(a);

    const dot00 = Vector3.Dot(v0, v0);
    const dot01 = Vector3.Dot(v0, v1);
    const dot02 = Vector3.Dot(v0, v2);
    const dot11 = Vector3.Dot(v1, v1);
    const dot12 = Vector3.Dot(v1, v2);

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return new Vector3(1 - u - v, v, u);
  }

  public static fibonacci(n: number): number {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }

  public static goldenRatio(): number {
    return (1 + Math.sqrt(5)) / 2;
  }
}