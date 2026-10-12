import { describe, expect, it } from 'vitest';

import {
  createAbilityRegistry,
  HEAVY_PROJECTILE,
  STARTER_PROJECTILE,
} from '@/game-v2/config/AbilityRegistry';
import {
  ENEMY_HEALTH,
  HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  HEAVY_PROJECTILE_DAMAGE_TIER_1,
  PROJECTILE_DAMAGE,
  SIMULATION_HZ,
  WEAPON_COOLDOWN_TICKS,
} from '@/game-v2/config/Mvp0Config';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { CommandRecorder } from '@/game-v2/replay/CommandRecorder';
import { DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { GameV2Lifecycle } from '@/game-v2/runtime/GameV2Lifecycle';
import { AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import { CombatSystem } from '@/game-v2/systems/CombatSystem';
import { DashSystem } from '@/game-v2/systems/DashSystem';
import { EnemySystem } from '@/game-v2/systems/EnemySystem';
import { LevelUpOfferSystem } from '@/game-v2/systems/LevelUpOfferSystem';
import { PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
import { ProgressionSystem } from '@/game-v2/systems/ProgressionSystem';
import { WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

/**
 * `V2-111` acceptance evidence.
 *
 * Before this task, `WeaponSystem` read ability slot `0` only, so a second
 * `auto` identity taken at a level-up occupied a HUD slot and never fired
 * (V2-ADR-068). These tests drive the real reset -> combat -> level-up ->
 * upgrade -> fire chain and prove both weapons are live afterwards.
 *
 * Attribution is by discrete per-projectile damage rather than an aggregate
 * count, so a single-weapon mutant cannot satisfy them by firing the starter
 * weapon twice — the technique V2-013's review fix round 2 established.
 */

const PLAYER_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Health |
  ComponentMask.Body |
  ComponentMask.Player |
  ComponentMask.AbilityLoadout |
  ComponentMask.PassiveLoadout |
  ComponentMask.LevelUpOffer;

const PROJECTILE_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Projectile;

const FIXED_DELTA_SECONDS = 1 / SIMULATION_HZ;

const context = (tick: number): StepContext => ({
  tick,
  deltaSeconds: FIXED_DELTA_SECONDS,
  intent: { moveX: 0, moveY: 0, dashPressed: false },
});

/** Only the starter weapon and one other `auto` identity may be offered. */
const TWO_IDENTITY_REGISTRY = createAbilityRegistry([
  STARTER_PROJECTILE,
  HEAVY_PROJECTILE,
]);

const createPlayer = (world: World): EntityId => world.createEntity(PLAYER_MASK);

const liveProjectileDamages = (world: World): number[] => {
  const damages: number[] = [];

  for (let slot = 0; slot < world.masks.length; slot += 1) {
    if (((world.masks[slot] ?? 0) & PROJECTILE_MASK) === PROJECTILE_MASK) {
      damages.push(world.projectileDamage[slot] ?? 0);
    }
  }

  return damages;
};

describe('concurrent autonomous weapons through the real production path (V2-111)', () => {
  it('fires a second auto identity taken at the level-up, alongside the starter weapon', () => {
    const world = new World(64);
    const player = createPlayer(world);
    const lifecycle = new GameV2Lifecycle();
    const commandRecorder = new CommandRecorder();

    const abilityLoadout = new AbilityLoadoutSystem(TWO_IDENTITY_REGISTRY);
    const passiveLoadout = new PassiveLoadoutSystem();
    const offerSystem = new LevelUpOfferSystem(
      abilityLoadout,
      passiveLoadout,
      TWO_IDENTITY_REGISTRY
    );
    const progression = new ProgressionSystem(
      lifecycle,
      commandRecorder,
      abilityLoadout,
      passiveLoadout,
      offerSystem
    );

    const combat = new CombatSystem();
    const dash = new DashSystem();
    const enemies = new EnemySystem();
    const weapons = new WeaponSystem(undefined, abilityLoadout);

    combat.resetPlayer(world, player);
    dash.resetPlayer(world, player);
    weapons.resetPlayer(world, player);
    progression.resetPlayer(world, player);
    lifecycle.start();

    // Only the starter weapon is held, so only its damage can appear.
    expect(abilityLoadout.identityAt(world, player, 0)).toBe(STARTER_PROJECTILE.id);
    expect(abilityLoadout.identityAt(world, player, 1)).toBeNull();

    enemies.spawnEnemy(world, { nextFloat: () => 0 }, { type: 'point', x: 3, y: 0 });

    let tick = 0;
    let leveledUp = false;

    // Drive real combat until the kill produces the level-up. The kill drops an
    // XP pickup at the enemy's position, so the player walks onto it — the same
    // kill -> drop -> collect -> level-up chain the runtime drives.
    const playerSlot = world.slotOf(player);

    for (; tick < 400 && !leveledUp; tick += 1) {
      const ctx = context(tick);
      weapons.step(world, player, ctx);
      const combatResult = combat.step(world, player, ctx);
      const progressionResult = progression.step(
        world,
        player,
        combatResult,
        ctx,
        new DeterministicRng(1)
      );

      if (combatResult.killCount > 0) {
        world.x[playerSlot] = combatResult.killX[0] ?? 0;
        world.y[playerSlot] = combatResult.killY[0] ?? 0;
      }

      if (progressionResult.leveledUp) {
        leveledUp = true;
      }
    }

    expect(leveledUp).toBe(true);
    expect(lifecycle.phase).toBe('level-up');

    // Every projectile fired up to here belongs to the starter weapon.
    const beforeUpgrade = liveProjectileDamages(world);
    expect(beforeUpgrade.every(damage => damage === PROJECTILE_DAMAGE)).toBe(true);

    const candidates = offerSystem.candidatesAt(world, player);
    const heavyIndex = candidates.findIndex(
      candidate =>
        candidate?.kind === 'ability' && candidate.identity === HEAVY_PROJECTILE.id
    );

    expect(heavyIndex).toBeGreaterThanOrEqual(0);

    progression.resolveUpgrade(world, player, {
      tick,
      type: 'choose-upgrade',
      choiceIndex: heavyIndex as 0 | 1 | 2,
    });

    expect(lifecycle.phase).toBe('playing');
    expect(abilityLoadout.identityAt(world, player, 1)).toBe(HEAVY_PROJECTILE.id);

    // Resume with a fresh enemy so both weapons have a target.
    enemies.spawnEnemy(world, { nextFloat: () => 0 }, { type: 'point', x: 3, y: 0 });

    let starterFires = 0;
    let heavyFires = 0;
    const observedTicks = HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1 * 2;

    for (let index = 0; index < observedTicks; index += 1, tick += 1) {
      const before = liveProjectileDamages(world).length;
      weapons.step(world, player, context(tick));
      const after = liveProjectileDamages(world);

      if (after.length <= before) {
        continue;
      }

      // A projectile appeared this tick; count it by its damage signature.
      for (const damage of after.slice(before)) {
        if (damage === PROJECTILE_DAMAGE) {
          starterFires += 1;
        } else if (damage === HEAVY_PROJECTILE_DAMAGE_TIER_1) {
          heavyFires += 1;
        }
      }

      // Keep the enemy alive so targeting never lapses.
      const enemySlot = world.masks.findIndex(
        mask => (mask & ComponentMask.Enemy) === ComponentMask.Enemy
      );
      if (enemySlot >= 0) {
        world.health[enemySlot] = ENEMY_HEALTH;
      }
    }

    // The whole point of the task: the second identity is not inert.
    expect(heavyFires).toBeGreaterThan(0);
    expect(starterFires).toBeGreaterThan(0);
    // And each keeps its own authored cadence rather than sharing one counter.
    expect(starterFires).toBeGreaterThan(heavyFires);
    expect(HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1).toBeGreaterThan(
      WEAPON_COOLDOWN_TICKS
    );
  });
});
