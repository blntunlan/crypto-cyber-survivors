import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from '../config/DirectorConfigV1';
import { type GameplaySnapshot } from '../contracts';
import { SeededRng } from '../SeededRng';
import { type DirectorZoneKind, type ZoneField } from './ZoneField';

export type ZoneDirectorWorld = {
  width: number;
  height: number;
  playerX: number;
  playerY: number;
};

export type ZoneDirectorInput = {
  snapshot: GameplaySnapshot;
  world: ZoneDirectorWorld;
  elapsedSeconds: number;
  seed: number;
  liquidationProximity: number;
};

const SAFE_LANE_SECONDS = 6;
const ALPHA_TARGET_SECONDS = 15;
const HAZARD_SECONDS = 6;
const VISION_STRESS_SECONDS = 8;
const ROUTE_PRESSURE_SECONDS = 8;
const SHRINKING_SAFE_SECONDS = 10;

const SAFE_LANE_HALF_WIDTH = 70;
const HAZARD_RADIUS = 130;
const ROUTE_PRESSURE_RADIUS = 150;
const VISION_STRESS_RADIUS = 260;
const ALPHA_TARGET_RADIUS = 90;
const MINIMUM_SHRINKING_RADIUS = 180;

/**
 * Translates the published snapshot's spatial channels into zones (§10/§11).
 *
 * It is the only place that decides *where* a channel lands. Placement is
 * seeded, so the same run replays identically, and every channel is limited to
 * one live zone at a time — the contract caps mechanical load, not scenery.
 */
export class ZoneDirector {
  private readonly config: DirectorConfigV1;
  private readonly field: ZoneField;
  private lastAdvantageSequence = 0;
  private readonly channelCooldownEndsAt = new Map<DirectorZoneKind, number>();

  public constructor(field: ZoneField, config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.field = field;
    this.config = config;
  }

  public update(input: ZoneDirectorInput): void {
    this.field.update(input.elapsedSeconds);
    this.applyAdvantage(input);
    this.applyHeadwind(input);
  }

  public reset(): void {
    this.lastAdvantageSequence = 0;
    this.channelCooldownEndsAt.clear();
  }

  private applyAdvantage(input: ZoneDirectorInput): void {
    const advantage = input.snapshot.advantage;
    if (advantage.activeMechanic === null) return;
    if (advantage.activationSequence === this.lastAdvantageSequence) return;
    this.lastAdvantageSequence = advantage.activationSequence;

    const rng = new SeededRng(input.seed ^ advantage.activationSequence);

    if (advantage.activeMechanic === 'GREEN_LANE') {
      // The lane starts on the player so the safe route is immediately readable.
      this.field.spawn({
        kind: 'SAFE_LANE',
        shape: 'LANE',
        x: input.world.playerX,
        y: input.world.playerY,
        radius: SAFE_LANE_HALF_WIDTH,
        angle: rng.nextFloat() * Math.PI * 2,
        length: Math.max(input.world.width, input.world.height) * 0.6,
        activeSeconds: SAFE_LANE_SECONDS,
        elapsedSeconds: input.elapsedSeconds,
      });
      return;
    }

    if (advantage.activeMechanic === 'ALPHA_ENCOUNTER') {
      this.field.spawn({
        kind: 'ALPHA_TARGET',
        shape: 'CIRCLE',
        x: rng.nextFloat() * input.world.width,
        y: rng.nextFloat() * input.world.height,
        radius: ALPHA_TARGET_RADIUS,
        activeSeconds: ALPHA_TARGET_SECONDS,
        elapsedSeconds: input.elapsedSeconds,
      });
    }
  }

  private applyHeadwind(input: ZoneDirectorInput): void {
    const encounter = input.snapshot.encounter;
    // A headwind zone may only be planned once the encounter is real; the zone
    // then runs its own telegraph before biting.
    if (encounter.phase !== 'ACTIVE' && encounter.phase !== 'TELEGRAPH') return;

    const channels = encounter.headwindChannels;
    for (let index = 0; index < channels.length; index += 1) {
      const channel = channels[index];
      if (channel === 'TEMPORARY_HAZARD') {
        this.spawnCircle(input, 'HAZARD', HAZARD_RADIUS, HAZARD_SECONDS);
        continue;
      }
      if (channel === 'SAFE_ROUTE_PRESSURE') {
        this.spawnCircle(
          input,
          'ROUTE_PRESSURE',
          ROUTE_PRESSURE_RADIUS,
          ROUTE_PRESSURE_SECONDS
        );
        continue;
      }
      if (channel === 'VISION_AREA_STRESS') {
        this.spawnCircle(
          input,
          'VISION_STRESS',
          VISION_STRESS_RADIUS,
          VISION_STRESS_SECONDS
        );
        continue;
      }
      if (channel === 'SHRINKING_SAFE_ZONE') {
        this.spawnShrinkingSafe(input);
      }
    }
  }

  private spawnCircle(
    input: ZoneDirectorInput,
    kind: DirectorZoneKind,
    radius: number,
    activeSeconds: number
  ): void {
    if (!this.canSpawn(kind, input.elapsedSeconds)) return;

    const rng = new SeededRng(input.seed ^ Math.trunc(input.elapsedSeconds));
    this.field.spawn({
      kind,
      shape: 'CIRCLE',
      x: rng.nextFloat() * input.world.width,
      y: rng.nextFloat() * input.world.height,
      radius,
      intensity: 1,
      activeSeconds,
      elapsedSeconds: input.elapsedSeconds,
    });
    this.startCooldown(kind, input.elapsedSeconds, activeSeconds);
  }

  private spawnShrinkingSafe(input: ZoneDirectorInput): void {
    if (!this.canSpawn('SHRINKING_SAFE', input.elapsedSeconds)) return;

    // Liquidation proximity decides how far the walls close in (§11).
    const maximumRadius = Math.min(input.world.width, input.world.height) * 0.5;
    const radius = Math.max(
      MINIMUM_SHRINKING_RADIUS,
      maximumRadius * (1 - 0.5 * Math.min(1, Math.max(0, input.liquidationProximity)))
    );

    this.field.spawn({
      kind: 'SHRINKING_SAFE',
      shape: 'CIRCLE',
      x: input.world.width / 2,
      y: input.world.height / 2,
      radius,
      intensity: input.liquidationProximity,
      activeSeconds: SHRINKING_SAFE_SECONDS,
      elapsedSeconds: input.elapsedSeconds,
    });
    this.startCooldown('SHRINKING_SAFE', input.elapsedSeconds, SHRINKING_SAFE_SECONDS);
  }

  private canSpawn(kind: DirectorZoneKind, elapsedSeconds: number): boolean {
    if (this.field.hasKind(kind)) return false;
    return (this.channelCooldownEndsAt.get(kind) ?? 0) <= elapsedSeconds;
  }

  private startCooldown(
    kind: DirectorZoneKind,
    elapsedSeconds: number,
    activeSeconds: number
  ): void {
    this.channelCooldownEndsAt.set(
      kind,
      elapsedSeconds + activeSeconds + this.config.encounters.recoveryDurationSeconds
    );
  }
}
