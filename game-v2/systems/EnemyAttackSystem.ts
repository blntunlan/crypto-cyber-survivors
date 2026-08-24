import {
  LEVERAGE_LETHALITY_PROFILES,
  resolveIncomingDamage,
} from '@/game-v2/config/LethalityRegistry';
import { type CombatLethalityProfile } from '@/game-v2/contracts/CombatLethalityProfile';
import {
  TELEGRAPH_BEHAVIOR_BLOATER,
  TELEGRAPH_BEHAVIOR_CHARGER,
  TELEGRAPH_BEHAVIOR_NONE,
  TELEGRAPH_BEHAVIOR_SNIPER,
  TELEGRAPH_PHASE_ACTIVE,
  TELEGRAPH_PHASE_COOLDOWN,
  TELEGRAPH_PHASE_READY,
  TELEGRAPH_PHASE_TELEGRAPHING,
} from '@/game-v2/contracts/EnemyTelegraphState';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const PLAYER_MASK = ComponentMask.Transform | ComponentMask.Player;
const ENEMY_MASK = ComponentMask.Transform | ComponentMask.Enemy;

/**
 * Drives the per-enemy telegraph phase machine
 * `READY → TELEGRAPHING → ACTIVE → (COOLDOWN →) READY` (`V2-300`),
 * tick-driven only — never wall-clock — mirroring `HazardLifecycle`'s
 * own established tick-driven pattern (`V2-209`).
 *
 * `charger`'s strike is the existing, unmodified contact-damage system
 * (`EnemySystem`'s movement loop uses `enemyTelegraphDashSpeed` during
 * `ACTIVE`, `CombatSystem.resolveContactDamage` does the rest,
 * V2-ADR-159) — this system never touches player health for `charger`.
 * `bloater`'s burst and `sniper`'s line-check are new resolution paths,
 * both routed through `resolveIncomingDamage` with the same injected
 * `CombatLethalityProfile` `CombatSystem` uses, so enemy damage never
 * enters a second, independent multiplier pipeline (design §7.3).
 */
export class EnemyAttackSystem {
  private readonly profile: CombatLethalityProfile;

  /**
   * `profile` defaults to the leverage-`1` profile, mirroring
   * `CombatSystem`'s own optional-injected-dependency pattern
   * (V2-ADR-098).
   */
  public constructor(profile: CombatLethalityProfile = LEVERAGE_LETHALITY_PROFILES[1]) {
    this.profile = profile;
  }

  public step(world: World, playerEntity: EntityId): void {
    const playerSlot = world.slotOf(playerEntity);
    const playerMask = world.masks[playerSlot];

    if (playerMask === undefined || (playerMask & PLAYER_MASK) !== PLAYER_MASK) {
      throw new RangeError('player entity is missing required components');
    }

    const playerX = world.x[playerSlot];
    const playerY = world.y[playerSlot];
    const playerRadius = world.radius[playerSlot];

    if (
      playerX === undefined ||
      playerY === undefined ||
      playerRadius === undefined ||
      !Number.isFinite(playerX) ||
      !Number.isFinite(playerY) ||
      !Number.isFinite(playerRadius)
    ) {
      throw new RangeError('player position and radius must be finite');
    }

    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot];
      if (mask === undefined || (mask & ENEMY_MASK) !== ENEMY_MASK) {
        continue;
      }

      const behavior = world.enemyTelegraphBehavior[slot] ?? TELEGRAPH_BEHAVIOR_NONE;
      if (behavior === TELEGRAPH_BEHAVIOR_NONE) {
        continue;
      }

      this.stepEnemy(world, slot, behavior, playerSlot, playerX, playerY, playerRadius);
    }
  }

  private stepEnemy(
    world: World,
    slot: number,
    behavior: number,
    playerSlot: number,
    playerX: number,
    playerY: number,
    playerRadius: number
  ): void {
    const phase = world.enemyTelegraphPhase[slot] ?? TELEGRAPH_PHASE_READY;

    if (phase === TELEGRAPH_PHASE_READY) {
      this.tryArm(world, slot, behavior, playerX, playerY, playerRadius);
      return;
    }

    if (phase === TELEGRAPH_PHASE_TELEGRAPHING) {
      const remaining = (world.enemyTelegraphTicksRemaining[slot] ?? 0) - 1;
      if (remaining <= 0) {
        this.resolve(world, slot, behavior, playerSlot, playerX, playerY, playerRadius);
      } else {
        world.enemyTelegraphTicksRemaining[slot] = remaining;
      }
      return;
    }

    if (phase === TELEGRAPH_PHASE_ACTIVE) {
      const remaining = (world.enemyTelegraphTicksRemaining[slot] ?? 0) - 1;
      if (remaining <= 0) {
        this.enterCooldown(world, slot);
      } else {
        world.enemyTelegraphTicksRemaining[slot] = remaining;
      }
      return;
    }

    // COOLDOWN
    const remaining = (world.enemyTelegraphTicksRemaining[slot] ?? 0) - 1;
    if (remaining <= 0) {
      world.enemyTelegraphPhase[slot] = TELEGRAPH_PHASE_READY;
      world.enemyTelegraphTicksRemaining[slot] = 0;
    } else {
      world.enemyTelegraphTicksRemaining[slot] = remaining;
    }
  }

  /** Arms a telegraph once the archetype's own trigger condition is met. */
  private tryArm(
    world: World,
    slot: number,
    behavior: number,
    playerX: number,
    playerY: number,
    playerRadius: number
  ): void {
    const enemyX = world.x[slot] ?? 0;
    const enemyY = world.y[slot] ?? 0;
    const enemyRadius = world.radius[slot] ?? 0;
    const diffX = playerX - enemyX;
    const diffY = playerY - enemyY;
    const distance = Math.hypot(diffX, diffY);

    let triggered: boolean;

    if (behavior === TELEGRAPH_BEHAVIOR_BLOATER) {
      triggered = distance <= playerRadius + enemyRadius;
    } else {
      // charger/sniper: `enemyTelegraphEffectRange` doubles as the trigger
      // range (V2-ADR-164's field-reuse pattern, documented on `EnemyDefinition`).
      const triggerRange = world.enemyTelegraphEffectRange[slot] ?? 0;
      triggered = distance <= triggerRange;
    }

    if (!triggered) {
      return;
    }

    if (behavior === TELEGRAPH_BEHAVIOR_SNIPER) {
      // Locks the aim direction at telegraph-start, not resolution — the
      // player gets the full telegraph window to move off this line.
      if (distance > 0) {
        world.enemyTelegraphAimX[slot] = diffX / distance;
        world.enemyTelegraphAimY[slot] = diffY / distance;
      } else {
        world.enemyTelegraphAimX[slot] = 1;
        world.enemyTelegraphAimY[slot] = 0;
      }
    }

    world.enemyTelegraphPhase[slot] = TELEGRAPH_PHASE_TELEGRAPHING;
    world.enemyTelegraphTicksRemaining[slot] =
      world.enemyTelegraphDurationTicks[slot] ?? 0;
  }

  /** Resolves the telegraph's effect the instant it completes. */
  private resolve(
    world: World,
    slot: number,
    behavior: number,
    playerSlot: number,
    playerX: number,
    playerY: number,
    playerRadius: number
  ): void {
    if (behavior === TELEGRAPH_BEHAVIOR_CHARGER) {
      world.enemyTelegraphPhase[slot] = TELEGRAPH_PHASE_ACTIVE;
      world.enemyTelegraphTicksRemaining[slot] =
        world.enemyTelegraphActiveDurationTicks[slot] ?? 0;
      return;
    }

    if (behavior === TELEGRAPH_BEHAVIOR_BLOATER) {
      this.resolveBloater(world, slot, playerSlot, playerX, playerY, playerRadius);
      return;
    }

    this.resolveSniper(world, slot, playerSlot, playerX, playerY, playerRadius);
  }

  private resolveBloater(
    world: World,
    slot: number,
    playerSlot: number,
    playerX: number,
    playerY: number,
    playerRadius: number
  ): void {
    const enemyX = world.x[slot] ?? 0;
    const enemyY = world.y[slot] ?? 0;
    const burstRadius = world.enemyTelegraphEffectRadius[slot] ?? 0;
    const diffX = playerX - enemyX;
    const diffY = playerY - enemyY;
    const distSq = diffX * diffX + diffY * diffY;
    const combinedRadius = burstRadius + playerRadius;

    if (distSq <= combinedRadius * combinedRadius) {
      this.applyDamage(world, playerSlot, world.enemyTelegraphEffectDamage[slot] ?? 0);
    }

    // One-shot: no cooldown/re-arm cycle (V2-ADR-160).
    world.destroyEntity(world.entityIdOf(slot));
  }

  private resolveSniper(
    world: World,
    slot: number,
    playerSlot: number,
    playerX: number,
    playerY: number,
    playerRadius: number
  ): void {
    const enemyX = world.x[slot] ?? 0;
    const enemyY = world.y[slot] ?? 0;
    const aimX = world.enemyTelegraphAimX[slot] ?? 0;
    const aimY = world.enemyTelegraphAimY[slot] ?? 0;
    const lineRange = world.enemyTelegraphEffectRange[slot] ?? 0;
    const tolerance = world.enemyTelegraphEffectRadius[slot] ?? 0;

    const offsetX = playerX - enemyX;
    const offsetY = playerY - enemyY;
    // Projection of the player's offset onto the locked (normalized) aim
    // direction: how far along the ray, and how far off it.
    const along = offsetX * aimX + offsetY * aimY;
    const perpendicular = Math.hypot(offsetX - aimX * along, offsetY - aimY * along);
    const hit =
      along >= -playerRadius &&
      along <= lineRange &&
      perpendicular <= tolerance + playerRadius;

    if (hit) {
      this.applyDamage(world, playerSlot, world.enemyTelegraphEffectDamage[slot] ?? 0);
    }

    world.enemyTelegraphPhase[slot] = TELEGRAPH_PHASE_ACTIVE;
    world.enemyTelegraphTicksRemaining[slot] =
      world.enemyTelegraphActiveDurationTicks[slot] ?? 0;
  }

  private applyDamage(world: World, playerSlot: number, rawDamage: number): void {
    const damage = resolveIncomingDamage(this.profile, rawDamage);
    const currentHealth = world.health[playerSlot] ?? 0;
    world.health[playerSlot] = Math.max(0, currentHealth - damage);
  }

  private enterCooldown(world: World, slot: number): void {
    world.enemyTelegraphPhase[slot] = TELEGRAPH_PHASE_COOLDOWN;
    world.enemyTelegraphTicksRemaining[slot] =
      world.enemyTelegraphCooldownTicks[slot] ?? 0;
  }
}
