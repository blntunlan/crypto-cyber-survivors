import { type ZoneField } from './ZoneField';

export type ZoneEffectTarget = {
  x: number;
  y: number;
};

export type ZoneEffectOutcome = {
  /** Damage per second the target should take from area denial. */
  damagePerSecond: number;
  /** Movement multiplier applied while standing in a hostile area. */
  movementMultiplier: number;
  /** 0..1 vision squeeze for the presentation layer. */
  visionStress: number;
  /** True while the target sits inside a readable safe route. */
  isSheltered: boolean;
};

const HAZARD_DAMAGE_PER_SECOND = 6;
const OUTSIDE_SAFE_DAMAGE_PER_SECOND = 10;
const ROUTE_PRESSURE_MOVEMENT = 0.85;
const VISION_STRESS_LEVEL = 0.6;

/**
 * Turns zone containment into the numbers the gameplay loop applies (§11).
 *
 * A safe route wins over every hostile channel: the contract promises the lane
 * is genuinely readable relief, so it cannot be quietly cancelled by a hazard
 * that happens to overlap it.
 */
export class ZoneEffectResolver {
  private readonly field: ZoneField;
  private readonly outcome: ZoneEffectOutcome = {
    damagePerSecond: 0,
    movementMultiplier: 1,
    visionStress: 0,
    isSheltered: false,
  };

  public constructor(field: ZoneField) {
    this.field = field;
  }

  public resolve(target: ZoneEffectTarget): ZoneEffectOutcome {
    const outcome = this.outcome;
    outcome.damagePerSecond = 0;
    outcome.movementMultiplier = 1;
    outcome.visionStress = 0;
    outcome.isSheltered = this.field.containsActive('SAFE_LANE', target.x, target.y);

    if (this.field.containsActive('VISION_STRESS', target.x, target.y)) {
      outcome.visionStress = VISION_STRESS_LEVEL;
    }
    if (outcome.isSheltered) return outcome;

    if (this.field.containsActive('HAZARD', target.x, target.y)) {
      outcome.damagePerSecond += HAZARD_DAMAGE_PER_SECOND;
    }
    if (this.field.containsActive('ROUTE_PRESSURE', target.x, target.y)) {
      outcome.movementMultiplier = ROUTE_PRESSURE_MOVEMENT;
    }
    if (
      this.field.hasKind('SHRINKING_SAFE') &&
      !this.field.containsActive('SHRINKING_SAFE', target.x, target.y)
    ) {
      // Only bites once the ring is mechanically live; during telegraph the
      // field reports no active containment and this stays silent.
      outcome.damagePerSecond += this.isShrinkingLive()
        ? OUTSIDE_SAFE_DAMAGE_PER_SECOND
        : 0;
    }

    return outcome;
  }

  private isShrinkingLive(): boolean {
    for (const zone of this.field.getZones()) {
      if (zone.active && zone.kind === 'SHRINKING_SAFE' && zone.phase === 'ACTIVE') {
        return true;
      }
    }
    return false;
  }
}
