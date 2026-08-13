import { type GameplaySnapshot } from '../contracts';
import { type ZoneDirector } from '../zones/ZoneDirector';
import { type ZoneEffectResolver } from '../zones/ZoneEffectResolver';

export type DirectorEffectPlayer = {
  x: number;
  y: number;
  hp?: number;
  dashCooldownMultiplier?: number;
};

export type DirectorEffectWorld = {
  width: number;
  height: number;
};

export type DirectorEffectHooks = {
  /** Adds the timed movement buff; returns false when it could not be applied. */
  applyMomentumWindow: () => boolean;
  /** Drops one fixed-value utility pickup at the given world position. */
  dropLiquidity: (x: number, y: number) => void;
  /** Reports area-denial damage that was already applied to the player. */
  applyZoneDamage: (amount: number, remainingHp: number, x: number, y: number) => void;
};

export type DirectorEffectInput = {
  snapshot: GameplaySnapshot;
  player: DirectorEffectPlayer | null;
  elapsedSeconds: number;
  deltaSeconds: number;
  world: DirectorEffectWorld;
  seed: number;
  liquidationProximity: number;
};

export type DirectorEffectDependencies = {
  zoneDirector: ZoneDirector;
  zoneEffects: ZoneEffectResolver;
};

const NEUTRAL_DASH_COOLDOWN = 1;

/**
 * The single boundary where an advantage stops being data and becomes gameplay
 * (contract §10). The Director itself must stay side-effect free, so every
 * mutation lives here and is driven purely by the published snapshot.
 *
 * Only one mechanic can be active at a time — the allocator already enforces
 * that — and one-shot mechanics fire exactly once per activation by tracking
 * the snapshot's activation sequence.
 */
export class DirectorEffectApplier {
  private readonly hooks: DirectorEffectHooks;
  private readonly zoneDirector: ZoneDirector;
  private readonly zoneEffects: ZoneEffectResolver;
  private readonly zoneInput: {
    snapshot: GameplaySnapshot;
    world: { width: number; height: number; playerX: number; playerY: number };
    elapsedSeconds: number;
    seed: number;
    liquidationProximity: number;
  };
  private readonly zoneTarget = { x: 0, y: 0 };
  private appliedSequence = 0;
  private activeMechanic: string | null = null;
  private zoneMovementMultiplier = 1;
  private zoneVisionStress = 0;

  public constructor(
    hooks: DirectorEffectHooks,
    dependencies: DirectorEffectDependencies
  ) {
    this.hooks = hooks;
    this.zoneDirector = dependencies.zoneDirector;
    this.zoneEffects = dependencies.zoneEffects;
    this.zoneInput = {
      snapshot: null as unknown as GameplaySnapshot,
      world: { width: 0, height: 0, playerX: 0, playerY: 0 },
      elapsedSeconds: 0,
      seed: 0,
      liquidationProximity: 0,
    };
  }

  /** Zone-derived movement penalty for the movement system to consume. */
  public getZoneMovementMultiplier(): number {
    return this.zoneMovementMultiplier;
  }

  /** Zone-derived vision squeeze for the presentation layer. */
  public getZoneVisionStress(): number {
    return this.zoneVisionStress;
  }

  public apply(input: DirectorEffectInput): void {
    this.updateZones(input);

    const advantage = input.snapshot.advantage;
    const player = input.player;

    if (advantage.activeMechanic === null) {
      this.clearActive(player);
      return;
    }

    // Sustained channels are re-asserted every commit so a mid-window reset
    // cannot leave the player with a stale multiplier.
    if (player !== null) {
      player.dashCooldownMultiplier = advantage.dashCooldownMultiplier;
    }
    this.activeMechanic = advantage.activeMechanic;

    if (advantage.activationSequence === this.appliedSequence) return;
    this.appliedSequence = advantage.activationSequence;

    if (advantage.activeMechanic === 'MOMENTUM_WINDOW') {
      this.hooks.applyMomentumWindow();
      return;
    }
    if (advantage.activeMechanic === 'LIQUIDITY_DROP' && player !== null) {
      this.hooks.dropLiquidity(player.x, player.y);
    }
  }

  public reset(): void {
    this.appliedSequence = 0;
    this.activeMechanic = null;
    this.zoneMovementMultiplier = 1;
    this.zoneVisionStress = 0;
    this.zoneDirector.reset();
  }

  /**
   * Zones are planned from the snapshot and then resolved against the player.
   * Area damage is applied here rather than inside the zone field, so the field
   * stays a pure spatial query and this class remains the only mutator.
   */
  private updateZones(input: DirectorEffectInput): void {
    const player = input.player;
    const zoneInput = this.zoneInput;
    zoneInput.snapshot = input.snapshot;
    zoneInput.world.width = input.world.width;
    zoneInput.world.height = input.world.height;
    zoneInput.world.playerX = player?.x ?? input.world.width / 2;
    zoneInput.world.playerY = player?.y ?? input.world.height / 2;
    zoneInput.elapsedSeconds = input.elapsedSeconds;
    zoneInput.seed = input.seed;
    zoneInput.liquidationProximity = input.liquidationProximity;
    this.zoneDirector.update(zoneInput);

    if (player === null) {
      this.zoneMovementMultiplier = 1;
      this.zoneVisionStress = 0;
      return;
    }

    this.zoneTarget.x = player.x;
    this.zoneTarget.y = player.y;
    const outcome = this.zoneEffects.resolve(this.zoneTarget);
    this.zoneMovementMultiplier = outcome.movementMultiplier;
    this.zoneVisionStress = outcome.visionStress;

    if (outcome.damagePerSecond > 0 && player.hp !== undefined) {
      // Area denial is damage over time, so it deliberately bypasses the
      // contact i-frames while still reporting through the normal hit channel.
      const damage = outcome.damagePerSecond * Math.max(0, input.deltaSeconds);
      if (damage > 0) {
        player.hp = Math.max(0, player.hp - damage);
        this.hooks.applyZoneDamage(damage, player.hp, player.x, player.y);
      }
    }
  }

  public getActiveMechanic(): string | null {
    return this.activeMechanic;
  }

  private clearActive(player: DirectorEffectPlayer | null): void {
    if (this.activeMechanic === null) return;
    this.activeMechanic = null;
    if (player !== null) player.dashCooldownMultiplier = NEUTRAL_DASH_COOLDOWN;
  }
}
