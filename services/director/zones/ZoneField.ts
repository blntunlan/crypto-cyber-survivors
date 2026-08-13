import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from '../config/DirectorConfigV1';

export const DIRECTOR_ZONE_KINDS = [
  'SAFE_LANE', // §10 GREEN_LANE — a readable safe route
  'HAZARD', // §11 TEMPORARY_HAZARD — area denial
  'SHRINKING_SAFE', // §11 SHRINKING_SAFE_ZONE — the arena closes in
  'ROUTE_PRESSURE', // §11 SAFE_ROUTE_PRESSURE — escape routes get cut
  'VISION_STRESS', // §11 VISION_AREA_STRESS — sight is squeezed
  'ALPHA_TARGET', // §10 ALPHA_ENCOUNTER — optional high-reward objective
] as const;

export type DirectorZoneKind = (typeof DIRECTOR_ZONE_KINDS)[number];
export type DirectorZoneShape = 'CIRCLE' | 'LANE';
export type DirectorZonePhase = 'TELEGRAPH' | 'ACTIVE' | 'FADE';

export type DirectorZone = {
  active: boolean;
  id: number;
  kind: DirectorZoneKind;
  shape: DirectorZoneShape;
  phase: DirectorZonePhase;
  /** Circle centre, or the lane's origin point. */
  x: number;
  y: number;
  /** Circle radius, or half the lane width. */
  radius: number;
  /** Lane direction in radians; unused for circles. */
  angle: number;
  /** Lane length; unused for circles. */
  length: number;
  intensity: number;
  telegraphEndsAtSeconds: number;
  activeEndsAtSeconds: number;
  fadeEndsAtSeconds: number;
};

export type ZoneSpawnRequest = {
  kind: DirectorZoneKind;
  shape: DirectorZoneShape;
  x: number;
  y: number;
  radius: number;
  angle?: number;
  length?: number;
  intensity?: number;
  activeSeconds: number;
  elapsedSeconds: number;
};

/** Bounded so a pathological event stream cannot flood the field. */
export const MAXIMUM_ACTIVE_ZONES = 8;
const FADE_SECONDS = 0.75;

const createZone = (id: number): DirectorZone => ({
  active: false,
  id,
  kind: 'HAZARD',
  shape: 'CIRCLE',
  phase: 'TELEGRAPH',
  x: 0,
  y: 0,
  radius: 0,
  angle: 0,
  length: 0,
  intensity: 0,
  telegraphEndsAtSeconds: 0,
  activeEndsAtSeconds: 0,
  fadeEndsAtSeconds: 0,
});

/**
 * The one area primitive behind every spatial contract channel (§10/§11).
 *
 * A zone always telegraphs before it bites — §19 forbids an untelegraphed
 * mechanical effect — and the field owns a fixed pool so the RAF loop never
 * allocates. It answers containment questions; it never applies damage or
 * draws itself, so collision, rendering, and spawning stay separate owners.
 */
export class ZoneField {
  private readonly config: DirectorConfigV1;
  private readonly zones: DirectorZone[] = [];
  private nextId = 1;

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
    for (let index = 0; index < MAXIMUM_ACTIVE_ZONES; index += 1) {
      this.zones.push(createZone(0));
    }
  }

  public spawn(request: ZoneSpawnRequest): DirectorZone | null {
    const zone = this.findFreeZone();
    if (zone === null) return null;

    const telegraphEndsAt =
      request.elapsedSeconds + this.config.marketEvents.minTelegraphSeconds;
    zone.active = true;
    zone.id = this.nextId;
    this.nextId += 1;
    zone.kind = request.kind;
    zone.shape = request.shape;
    zone.phase = 'TELEGRAPH';
    zone.x = request.x;
    zone.y = request.y;
    zone.radius = Math.max(0, request.radius);
    zone.angle = request.angle ?? 0;
    zone.length = Math.max(0, request.length ?? 0);
    zone.intensity = Math.min(1, Math.max(0, request.intensity ?? 1));
    zone.telegraphEndsAtSeconds = telegraphEndsAt;
    zone.activeEndsAtSeconds = telegraphEndsAt + Math.max(0, request.activeSeconds);
    zone.fadeEndsAtSeconds = zone.activeEndsAtSeconds + FADE_SECONDS;
    return zone;
  }

  public update(elapsedSeconds: number): void {
    for (let index = 0; index < this.zones.length; index += 1) {
      const zone = this.zones[index]!;
      if (!zone.active) continue;

      if (elapsedSeconds >= zone.fadeEndsAtSeconds) {
        zone.active = false;
        continue;
      }
      zone.phase =
        elapsedSeconds < zone.telegraphEndsAtSeconds
          ? 'TELEGRAPH'
          : elapsedSeconds < zone.activeEndsAtSeconds
            ? 'ACTIVE'
            : 'FADE';
    }
  }

  public hasKind(kind: DirectorZoneKind): boolean {
    for (let index = 0; index < this.zones.length; index += 1) {
      const zone = this.zones[index]!;
      if (zone.active && zone.kind === kind) return true;
    }
    return false;
  }

  /** True only while the zone is mechanically live, never during telegraph. */
  public containsActive(kind: DirectorZoneKind, x: number, y: number): boolean {
    for (let index = 0; index < this.zones.length; index += 1) {
      const zone = this.zones[index]!;
      if (!zone.active || zone.phase !== 'ACTIVE' || zone.kind !== kind) continue;
      if (this.contains(zone, x, y)) return true;
    }
    return false;
  }

  public contains(zone: DirectorZone, x: number, y: number): boolean {
    const deltaX = x - zone.x;
    const deltaY = y - zone.y;
    if (zone.shape === 'CIRCLE') {
      return deltaX * deltaX + deltaY * deltaY <= zone.radius * zone.radius;
    }

    const directionX = Math.cos(zone.angle);
    const directionY = Math.sin(zone.angle);
    const along = deltaX * directionX + deltaY * directionY;
    if (along < 0 || along > zone.length) return false;
    const across = Math.abs(deltaX * -directionY + deltaY * directionX);
    return across <= zone.radius;
  }

  public getZones(): readonly DirectorZone[] {
    return this.zones;
  }

  public getActiveCount(): number {
    let count = 0;
    for (let index = 0; index < this.zones.length; index += 1) {
      if (this.zones[index]!.active) count += 1;
    }
    return count;
  }

  public reset(): void {
    for (let index = 0; index < this.zones.length; index += 1) {
      this.zones[index]!.active = false;
    }
    this.nextId = 1;
  }

  private findFreeZone(): DirectorZone | null {
    for (let index = 0; index < this.zones.length; index += 1) {
      const zone = this.zones[index]!;
      if (!zone.active) return zone;
    }
    return null;
  }
}
