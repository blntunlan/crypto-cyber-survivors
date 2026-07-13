import type { BulletTrailBuffer, BulletTrailPoint } from '../../types';

export const BULLET_TRAIL_CAPACITY = 16;

export type ReadableBulletTrail = BulletTrailBuffer | BulletTrailPoint[];

export function createBulletTrailBuffer(): BulletTrailBuffer {
  return {
    x: new Float32Array(BULLET_TRAIL_CAPACITY),
    y: new Float32Array(BULLET_TRAIL_CAPACITY),
    age: new Float32Array(BULLET_TRAIL_CAPACITY),
    head: 0,
    count: 0,
  };
}

export function resetBulletTrailBuffer(trail: BulletTrailBuffer): void {
  trail.head = 0;
  trail.count = 0;
}

export function updateBulletTrailBuffer(
  trail: BulletTrailBuffer,
  x: number,
  y: number,
  deltaMs: number,
  lifeMs: number
): void {
  const capacity = trail.x.length;
  let oldestIndex = (trail.head - trail.count + capacity) % capacity;

  for (let i = 0; i < trail.count; i++) {
    const index = (oldestIndex + i) % capacity;
    trail.age[index] = (trail.age[index] ?? 0) + deltaMs;
  }

  while (trail.count > 0 && (trail.age[oldestIndex] ?? 0) > lifeMs) {
    trail.count--;
    oldestIndex = (oldestIndex + 1) % capacity;
  }

  trail.x[trail.head] = x;
  trail.y[trail.head] = y;
  trail.age[trail.head] = 0;
  trail.head = (trail.head + 1) % capacity;
  if (trail.count < capacity) {
    trail.count++;
  }
}

export function getBulletTrailCount(trail: ReadableBulletTrail): number {
  return Array.isArray(trail) ? trail.length : trail.count;
}

function getBufferIndex(trail: BulletTrailBuffer, logicalIndex: number): number {
  return (trail.head - trail.count + logicalIndex + trail.x.length) % trail.x.length;
}

export function getBulletTrailX(
  trail: ReadableBulletTrail,
  logicalIndex: number
): number {
  return Array.isArray(trail)
    ? (trail[logicalIndex]?.x ?? 0)
    : (trail.x[getBufferIndex(trail, logicalIndex)] ?? 0);
}

export function getBulletTrailY(
  trail: ReadableBulletTrail,
  logicalIndex: number
): number {
  return Array.isArray(trail)
    ? (trail[logicalIndex]?.y ?? 0)
    : (trail.y[getBufferIndex(trail, logicalIndex)] ?? 0);
}

export function getBulletTrailAge(
  trail: ReadableBulletTrail,
  logicalIndex: number
): number {
  return Array.isArray(trail)
    ? (trail[logicalIndex]?.age ?? 0)
    : (trail.age[getBufferIndex(trail, logicalIndex)] ?? 0);
}
