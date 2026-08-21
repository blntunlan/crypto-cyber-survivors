import { describe, expect, it } from 'vitest';

import {
  COMBAT_KILL_BUFFER_CAPACITY,
  DASH_COOLDOWN_SECONDS,
  ENEMY_CONTACT_COOLDOWN_SECONDS,
  ENEMY_CONTACT_COOLDOWN_TICKS,
  ENEMY_CONTACT_DAMAGE,
  ENEMY_FACTION,
  ENEMY_HEALTH,
  ENEMY_RADIUS,
  ENEMY_XP_VALUE,
  PLAYER_MAX_HEALTH,
  PLAYER_RADIUS,
  PROJECTILE_DAMAGE,
  PROJECTILE_LIFETIME_TICKS,
  PROJECTILE_RADIUS,
  PROJECTILE_SPEED,
  SIMULATION_HZ,
  WEAPON_COOLDOWN_TICKS,
} from '@/game-v2/config/Mvp0Config';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import {
  CollisionCandidateProvider,
  CombatSystem,
} from '@/game-v2/systems/CombatSystem';
import { EnemySystem } from '@/game-v2/systems/EnemySystem';
import { WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const PLAYER_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Player;

const ENEMY_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Faction |
  ComponentMask.Enemy;

const PROJECTILE_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Projectile;

const FIXED_DELTA_SECONDS = 1 / SIMULATION_HZ;

const createContext = (tick: number): StepContext => ({
  tick,
  deltaSeconds: FIXED_DELTA_SECONDS,
  intent: { moveX: 0, moveY: 0, dashPressed: false },
});

const createPlayer = (
  world: World,
  x = 0,
  y = 0,
  health = PLAYER_MAX_HEALTH
): EntityId => {
  const player = world.createEntity(PLAYER_MASK);
  const slot = world.slotOf(player);
  world.x[slot] = x;
  world.y[slot] = y;
  world.previousX[slot] = x;
  world.previousY[slot] = y;
  world.radius[slot] = PLAYER_RADIUS;
  world.health[slot] = health;
  world.maxHealth[slot] = PLAYER_MAX_HEALTH;
  world.invulnerabilityTicksRemaining[slot] = 0;
  return player;
};

const createEnemy = (
  world: World,
  x: number,
  y: number,
  health = ENEMY_HEALTH,
  xpValue = ENEMY_XP_VALUE
): EntityId => {
  const enemy = world.createEntity(ENEMY_MASK);
  const slot = world.slotOf(enemy);
  world.x[slot] = x;
  world.y[slot] = y;
  world.previousX[slot] = x;
  world.previousY[slot] = y;
  world.radius[slot] = ENEMY_RADIUS;
  world.health[slot] = health;
  world.maxHealth[slot] = ENEMY_HEALTH;
  world.faction[slot] = ENEMY_FACTION;
  world.contactDamage[slot] = ENEMY_CONTACT_DAMAGE;
  world.contactCooldownTicksRemaining[slot] = 0;
  world.xpValue[slot] = xpValue;
  return enemy;
};

const createProjectile = (
  world: World,
  x: number,
  y: number,
  damage = PROJECTILE_DAMAGE,
  radius = PROJECTILE_RADIUS
): EntityId => {
  const projectile = world.createEntity(PROJECTILE_MASK);
  const slot = world.slotOf(projectile);
  world.x[slot] = x;
  world.y[slot] = y;
  world.previousX[slot] = x;
  world.previousY[slot] = y;
  world.radius[slot] = radius;
  world.projectileDamage[slot] = damage;
  world.projectileLifetimeTicksRemaining[slot] = PROJECTILE_LIFETIME_TICKS;
  return projectile;
};

describe('Combat config invariants', () => {
  it('bounds player survivability to between 3 and 8 contact hits', () => {
    const hitsSurvived = Math.floor((PLAYER_MAX_HEALTH - 1) / ENEMY_CONTACT_DAMAGE);
    expect(hitsSurvived).toBeGreaterThanOrEqual(3);
    expect(hitsSurvived).toBeLessThanOrEqual(8);
  });

  it('guarantees time to die under contact is at least 2 dash cooldown periods', () => {
    const hitsToDie = Math.ceil(PLAYER_MAX_HEALTH / ENEMY_CONTACT_DAMAGE);
    const timeToDieSeconds = (hitsToDie - 1) * ENEMY_CONTACT_COOLDOWN_SECONDS;
    expect(timeToDieSeconds).toBeGreaterThanOrEqual(2 * DASH_COOLDOWN_SECONDS);
  });

  it('sets kill buffer capacity strictly above max physically concurrent projectiles', () => {
    const maxConcurrentProjectiles =
      Math.ceil(PROJECTILE_LIFETIME_TICKS / WEAPON_COOLDOWN_TICKS) + 1;
    expect(COMBAT_KILL_BUFFER_CAPACITY).toBeGreaterThan(maxConcurrentProjectiles);
  });

  it('guarantees discrete projectile movement cannot tunnel through enemy collision bounds', () => {
    const perTickTravel = PROJECTILE_SPEED / SIMULATION_HZ;
    const combinedRadius = PROJECTILE_RADIUS + ENEMY_RADIUS;
    expect(perTickTravel).toBeLessThan(combinedRadius);
  });
});

describe('CombatStepResult lifecycle and reuse', () => {
  it('reuses the exact same result object and typed arrays across multiple steps', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const combat = new CombatSystem();

    const result1 = combat.step(world, player, createContext(0));
    const killXRef = result1.killX;
    const killYRef = result1.killY;
    const killXpRef = result1.killXp;

    const result2 = combat.step(world, player, createContext(1));

    expect(result2).toBe(result1);
    expect(result2.killX).toBe(killXRef);
    expect(result2.killY).toBe(killYRef);
    expect(result2.killXp).toBe(killXpRef);
  });

  it('resets killCount to 0 and playerDied to false on subsequent steps', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, 5, 5, 10);
    createProjectile(world, 5, 5, 10);
    const combat = new CombatSystem();

    const result1 = combat.step(world, player, createContext(0));
    expect(result1.killCount).toBe(1);

    const result2 = combat.step(world, player, createContext(1));
    expect(result2.killCount).toBe(0);
    expect(result2.playerDied).toBe(false);
  });

  it('throws RangeError when kills in a single tick exceed buffer capacity', () => {
    const smallCapacity = 2;
    const combat = new CombatSystem(new CollisionCandidateProvider(), smallCapacity);
    const world = new World(32);
    const player = createPlayer(world, 0, 0);

    for (let i = 0; i < 3; i += 1) {
      const posX = 10 + i * 5;
      const posY = 10 + i * 5;
      createEnemy(world, posX, posY, 10);
      createProjectile(world, posX, posY, 10);
    }

    expect(() => combat.step(world, player, createContext(0))).toThrow(RangeError);
  });
});

describe('Projectile-to-enemy collision resolution', () => {
  it('damages overlapping enemy by projectileDamage and destroys projectile immediately', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const enemy = createEnemy(world, 4, 3, 30);
    const projectile = createProjectile(world, 4, 3, 10);
    const enemySlot = world.slotOf(enemy);
    const combat = new CombatSystem();

    const result = combat.step(world, player, createContext(0));

    expect(world.isAlive(projectile)).toBe(false);
    expect(world.isAlive(enemy)).toBe(true);
    expect(world.health[enemySlot]).toBe(20);
    expect(result.killCount).toBe(0);
  });

  it('destroys enemy when health reaches 0 and records pre-destroy coordinates and XP', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const enemyX = 7.5;
    const enemyY = -3.25;
    const enemyXp = 25;
    const enemy = createEnemy(world, enemyX, enemyY, 10, enemyXp);
    const projectile = createProjectile(world, enemyX, enemyY, 10);
    const combat = new CombatSystem();

    const result = combat.step(world, player, createContext(0));

    expect(world.isAlive(projectile)).toBe(false);
    expect(world.isAlive(enemy)).toBe(false);
    expect(result.killCount).toBe(1);
    expect(result.killX[0]).toBeCloseTo(enemyX, 4);
    expect(result.killY[0]).toBeCloseTo(enemyY, 4);
    expect(result.killXp[0]).toBe(enemyXp);
  });

  it('damages at most one enemy per projectile even when multiple enemies overlap', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const enemy1 = createEnemy(world, 5, 5, 30);
    const enemy2 = createEnemy(world, 5, 5, 30);
    const enemy1Slot = world.slotOf(enemy1);
    const enemy2Slot = world.slotOf(enemy2);
    const projectile = createProjectile(world, 5, 5, 10);
    const combat = new CombatSystem();

    combat.step(world, player, createContext(0));

    expect(world.isAlive(projectile)).toBe(false);
    const damagedCount =
      (world.health[enemy1Slot] === 20 ? 1 : 0) +
      (world.health[enemy2Slot] === 20 ? 1 : 0);
    const untouchedCount =
      (world.health[enemy1Slot] === 30 ? 1 : 0) +
      (world.health[enemy2Slot] === 30 ? 1 : 0);

    expect(damagedCount).toBe(1);
    expect(untouchedCount).toBe(1);
  });

  it('allows multiple projectiles to damage multiple separate enemies in the same tick', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const enemy1 = createEnemy(world, 2, 2, 10, 5);
    const enemy2 = createEnemy(world, 6, 6, 10, 15);
    const proj1 = createProjectile(world, 2, 2, 10);
    const proj2 = createProjectile(world, 6, 6, 10);
    const combat = new CombatSystem();

    const result = combat.step(world, player, createContext(0));

    expect(world.isAlive(proj1)).toBe(false);
    expect(world.isAlive(proj2)).toBe(false);
    expect(world.isAlive(enemy1)).toBe(false);
    expect(world.isAlive(enemy2)).toBe(false);
    expect(result.killCount).toBe(2);
    expect(result.killX[0]).toBeCloseTo(2, 4);
    expect(result.killY[0]).toBeCloseTo(2, 4);
    expect(result.killXp[0]).toBe(5);
    expect(result.killX[1]).toBeCloseTo(6, 4);
    expect(result.killY[1]).toBeCloseTo(6, 4);
    expect(result.killXp[1]).toBe(15);
  });

  it('does not damage enemy when projectile is outside collision radius', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const enemy = createEnemy(world, 10, 10, 30);
    const projectile = createProjectile(world, 0, 0, 10);
    const enemySlot = world.slotOf(enemy);
    const combat = new CombatSystem();

    const result = combat.step(world, player, createContext(0));

    expect(world.isAlive(projectile)).toBe(true);
    expect(world.isAlive(enemy)).toBe(true);
    expect(world.health[enemySlot]).toBe(30);
    expect(result.killCount).toBe(0);
  });
});

describe('CollisionCandidateProvider collaborator seam', () => {
  it('uses an injected custom collision candidate provider', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const enemy = createEnemy(world, 100, 100, 10);
    const projectile = createProjectile(world, 0, 0, 10);

    let providerCalled = false;
    class CustomProvider extends CollisionCandidateProvider {
      public override findCollidingEnemy(
        _worldRef: World,
        _projectileSlot: number
      ): EntityId {
        providerCalled = true;
        return enemy;
      }
    }

    const combat = new CombatSystem(new CustomProvider());
    const result = combat.step(world, player, createContext(0));

    expect(providerCalled).toBe(true);
    expect(world.isAlive(projectile)).toBe(false);
    expect(world.isAlive(enemy)).toBe(false);
    expect(result.killCount).toBe(1);
  });
});

describe('Enemy-to-player contact damage and cooldown', () => {
  it('applies contact damage and re-arms contactCooldownTicksRemaining', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0, 100);
    const enemy = createEnemy(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const enemySlot = world.slotOf(enemy);
    const combat = new CombatSystem();

    combat.step(world, player, createContext(0));

    expect(world.health[playerSlot]).toBe(100 - ENEMY_CONTACT_DAMAGE);
    expect(world.contactCooldownTicksRemaining[enemySlot]).toBe(
      ENEMY_CONTACT_COOLDOWN_TICKS
    );
  });

  it('deals no contact damage while cooldown is active and ticks cooldown down by 1 per step', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0, 100);
    const enemy = createEnemy(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const enemySlot = world.slotOf(enemy);
    const combat = new CombatSystem();

    combat.step(world, player, createContext(0));
    expect(world.health[playerSlot]).toBe(100 - ENEMY_CONTACT_DAMAGE);
    expect(world.contactCooldownTicksRemaining[enemySlot]).toBe(
      ENEMY_CONTACT_COOLDOWN_TICKS
    );

    // Next step: cooldown ticks down, no extra damage
    combat.step(world, player, createContext(1));
    expect(world.health[playerSlot]).toBe(100 - ENEMY_CONTACT_DAMAGE);
    expect(world.contactCooldownTicksRemaining[enemySlot]).toBe(
      ENEMY_CONTACT_COOLDOWN_TICKS - 1
    );
  });

  it('deals contact damage again immediately when cooldown reaches 0', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0, 100);
    const enemy = createEnemy(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const enemySlot = world.slotOf(enemy);
    const combat = new CombatSystem();

    world.contactCooldownTicksRemaining[enemySlot] = 1;
    combat.step(world, player, createContext(0));

    expect(world.health[playerSlot]).toBe(100 - ENEMY_CONTACT_DAMAGE);
    expect(world.contactCooldownTicksRemaining[enemySlot]).toBe(
      ENEMY_CONTACT_COOLDOWN_TICKS
    );
  });

  it('rejects contact damage during dash i-frames without re-arming enemy cooldown', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0, 100);
    const enemy = createEnemy(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const enemySlot = world.slotOf(enemy);
    const combat = new CombatSystem();

    world.invulnerabilityTicksRemaining[playerSlot] = 5;
    world.contactCooldownTicksRemaining[enemySlot] = 0;

    combat.step(world, player, createContext(0));

    // Health is unchanged
    expect(world.health[playerSlot]).toBe(100);
    // Cooldown is NOT consumed / NOT re-armed
    expect(world.contactCooldownTicksRemaining[enemySlot]).toBe(0);

    // Clear i-frames, step again -> enemy immediately damages
    world.invulnerabilityTicksRemaining[playerSlot] = 0;
    combat.step(world, player, createContext(1));

    expect(world.health[playerSlot]).toBe(100 - ENEMY_CONTACT_DAMAGE);
    expect(world.contactCooldownTicksRemaining[enemySlot]).toBe(
      ENEMY_CONTACT_COOLDOWN_TICKS
    );
  });

  it('clamps player health at zero and never goes negative', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0, 5);
    createEnemy(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const combat = new CombatSystem();

    combat.step(world, player, createContext(0));

    expect(world.health[playerSlot]).toBe(0);
  });
});

describe('Step ordering: projectile collisions before contact damage', () => {
  it('kills lethal enemy with projectile before enemy can land contact damage', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0, 100);
    const enemy = createEnemy(world, 0, 0, 10);
    const projectile = createProjectile(world, 0, 0, 10);
    const playerSlot = world.slotOf(player);
    const combat = new CombatSystem();

    const result = combat.step(world, player, createContext(0));

    expect(world.isAlive(projectile)).toBe(false);
    expect(world.isAlive(enemy)).toBe(false);
    expect(world.health[playerSlot]).toBe(100);
    expect(result.killCount).toBe(1);
    expect(result.playerDied).toBe(false);
  });
});

describe('Player death latch and reset', () => {
  it('emits playerDied: true on the first step health reaches zero, and false thereafter', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0, ENEMY_CONTACT_DAMAGE);
    createEnemy(world, 0, 0);
    const combat = new CombatSystem();

    const res1 = combat.step(world, player, createContext(0));
    expect(res1.playerDied).toBe(true);

    const res2 = combat.step(world, player, createContext(1));
    expect(res2.playerDied).toBe(false);

    const res3 = combat.step(world, player, createContext(2));
    expect(res3.playerDied).toBe(false);
  });

  it('emits the death edge again for a new run without any system state to reset', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0, ENEMY_CONTACT_DAMAGE);
    const enemy = createEnemy(world, 0, 0);
    const combat = new CombatSystem();

    const res1 = combat.step(world, player, createContext(0));
    expect(res1.playerDied).toBe(true);

    // Restoring the world is the whole reset: the system holds no per-run state.
    const playerSlot = world.slotOf(player);
    world.health[playerSlot] = ENEMY_CONTACT_DAMAGE;
    world.contactCooldownTicksRemaining[world.slotOf(enemy)] = 0;

    const res2 = combat.step(world, player, createContext(1));
    expect(res2.playerDied).toBe(true);
  });

  it('derives the death edge from the world, so a rebuilt system does not re-announce a death', () => {
    // Checkpoint-restore property: `RuntimeCheckpoint` carries `World`, not
    // system state. A system that latched death locally would re-emit
    // playerDied after a restore and fire the game-over transition twice.
    const world = new World(16);
    const player = createPlayer(world, 0, 0, ENEMY_CONTACT_DAMAGE);
    createEnemy(world, 0, 0);

    const firstSystem = new CombatSystem();
    expect(firstSystem.step(world, player, createContext(0)).playerDied).toBe(true);

    const restoredSystem = new CombatSystem();
    expect(restoredSystem.step(world, player, createContext(1)).playerDied).toBe(false);
  });
});

describe('End-to-end real path integration test', () => {
  it('spawns enemy with EnemySystem, fires with WeaponSystem, and resolves kill through CombatSystem', () => {
    const world = new World(64);
    const player = createPlayer(world, 0, 0, 100);
    const enemySystem = new EnemySystem();
    const weaponSystem = new WeaponSystem();
    const combatSystem = new CombatSystem();

    // Spawn real enemy at (3, 0)
    const enemy = enemySystem.spawnEnemy(
      world,
      { nextFloat: () => 0 },
      { type: 'point', x: 3, y: 0 }
    );
    expect(world.isAlive(enemy)).toBe(true);

    // Initial weapon reset
    weaponSystem.resetPlayer(world, player);

    // Tick 0: WeaponSystem fires toward enemy at (3, 0)
    const ctx0 = createContext(0);
    weaponSystem.step(world, player, ctx0);
    const res0 = combatSystem.step(world, player, ctx0);
    expect(res0.killCount).toBe(0);

    // Enemy has 30 health, weapon deals 10 damage per shot.
    // Let's set enemy health to 10 to test 1-hit kill end-to-end.
    const enemySlot = world.slotOf(enemy);
    world.health[enemySlot] = 10;

    // Advance simulation ticks until projectile reaches enemy at x = 3
    // Projectile speed is 14 units/sec. At 60 Hz, travel per tick is ~0.2333 units.
    // Distance 3.0 units will be reached in ~13 ticks.
    let killed = false;
    for (let tick = 1; tick <= 30; tick += 1) {
      const ctx = createContext(tick);
      weaponSystem.step(world, player, ctx);
      const res = combatSystem.step(world, player, ctx);
      if (res.killCount === 1) {
        killed = true;
        expect(res.killXp[0]).toBe(ENEMY_XP_VALUE);
        expect(res.killX[0]).toBeCloseTo(3, 1);
        expect(res.killY[0]).toBeCloseTo(0, 1);
        break;
      }
    }

    expect(killed).toBe(true);
    expect(world.isAlive(enemy)).toBe(false);
  });
});

describe('Input validation and safety', () => {
  it('throws RangeError for invalid step context', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const combat = new CombatSystem();

    expect(() =>
      combat.step(world, player, {
        tick: -1,
        deltaSeconds: FIXED_DELTA_SECONDS,
        intent: { moveX: 0, moveY: 0, dashPressed: false },
      })
    ).toThrow(RangeError);
  });

  it('throws RangeError when player entity is missing required components', () => {
    const world = new World(16);
    const invalidEntity = world.createEntity(ComponentMask.Transform);
    const combat = new CombatSystem();

    expect(() => combat.step(world, invalidEntity, createContext(0))).toThrow(
      RangeError
    );
  });

  it('throws RangeError when player position or health is non-finite', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const slot = world.slotOf(player);
    world.health[slot] = Number.NaN;
    const combat = new CombatSystem();

    expect(() => combat.step(world, player, createContext(0))).toThrow(RangeError);
  });
});

describe('Player combat initialization', () => {
  it('initializes health, maxHealth, and radius from config on a zeroed slot', () => {
    const world = new World(16);
    const player = world.createEntity(PLAYER_MASK);
    const slot = world.slotOf(player);
    const combat = new CombatSystem();

    expect(world.health[slot]).toBe(0);
    expect(world.radius[slot]).toBe(0);

    combat.resetPlayer(world, player);

    expect(world.health[slot]).toBe(PLAYER_MAX_HEALTH);
    expect(world.maxHealth[slot]).toBe(PLAYER_MAX_HEALTH);
    expect(world.radius[slot]).toBeCloseTo(PLAYER_RADIUS);
  });

  it('leaves a player that only went through resetPlayer alive and damageable', () => {
    // Regression guard: PLAYER_MAX_HEALTH and PLAYER_RADIUS have no other writer
    // in game-v2/**. Without resetPlayer the slot stays zeroed, so step() would
    // latch playerDied on its very first call and contact overlap would be
    // measured against a zero-radius player. This test builds the player the way
    // production will and never hand-writes health or radius.
    const world = new World(16);
    const player = world.createEntity(PLAYER_MASK);
    const slot = world.slotOf(player);
    const combat = new CombatSystem();

    combat.resetPlayer(world, player);

    const firstStep = combat.step(world, player, createContext(0));
    expect(firstStep.playerDied).toBe(false);

    // An enemy touching the player must be able to land a hit, which requires a
    // non-zero player radius.
    createEnemy(world, PLAYER_RADIUS + ENEMY_RADIUS - 0.01, 0);
    const secondStep = combat.step(world, player, createContext(1));

    expect(secondStep.playerDied).toBe(false);
    expect(world.health[slot]).toBe(PLAYER_MAX_HEALTH - ENEMY_CONTACT_DAMAGE);
  });

  it('rejects a player missing the Body component without mutating the slot', () => {
    const world = new World(16);
    const bodyless = world.createEntity(
      ComponentMask.Transform | ComponentMask.Health | ComponentMask.Player
    );
    const slot = world.slotOf(bodyless);
    const combat = new CombatSystem();

    expect(() => combat.resetPlayer(world, bodyless)).toThrow(RangeError);
    expect(world.health[slot]).toBe(0);
    expect(world.maxHealth[slot]).toBe(0);
    expect(world.radius[slot]).toBe(0);
  });

  it('restores full health on resetPlayer after a lethal run', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0, ENEMY_CONTACT_DAMAGE);
    const slot = world.slotOf(player);
    const combat = new CombatSystem();

    createEnemy(world, 0, 0);
    expect(combat.step(world, player, createContext(0)).playerDied).toBe(true);
    expect(world.health[slot]).toBe(0);

    combat.resetPlayer(world, player);

    expect(world.health[slot]).toBe(PLAYER_MAX_HEALTH);
  });
});

describe('Kill buffer overflow is an atomic rejection', () => {
  it('does not damage the enemy it cannot record', () => {
    const combat = new CombatSystem(new CollisionCandidateProvider(), 1);
    const world = new World(32);
    const player = createPlayer(world, 0, 0);
    const survivors: EntityId[] = [];

    for (let index = 0; index < 2; index += 1) {
      const position = 20 + index * 5;
      survivors.push(createEnemy(world, position, position, PROJECTILE_DAMAGE));
      createProjectile(world, position, position, PROJECTILE_DAMAGE);
    }

    expect(() => combat.step(world, player, createContext(0))).toThrow(RangeError);

    // The first kill is recorded and its enemy destroyed; the enemy that could
    // not be recorded must be left completely untouched rather than damaged.
    const rejected = survivors[1] as EntityId;
    expect(world.isAlive(rejected)).toBe(true);
    expect(world.health[world.slotOf(rejected)]).toBe(PROJECTILE_DAMAGE);
  });

  it('records exactly killCapacity kills in one tick without throwing', () => {
    // The overflow tests above both overshoot the capacity, so they only pin the
    // loose direction of the bound. Without this test, tightening the check by
    // one would abort a full-capacity tick with the suite still green.
    const capacity = 3;
    const combat = new CombatSystem(new CollisionCandidateProvider(), capacity);
    const world = new World(32);
    const player = createPlayer(world, 0, 0);

    for (let index = 0; index < capacity; index += 1) {
      const position = 20 + index * 5;
      createEnemy(world, position, position, PROJECTILE_DAMAGE);
      createProjectile(world, position, position, PROJECTILE_DAMAGE);
    }

    const result = combat.step(world, player, createContext(0));

    expect(result.killCount).toBe(capacity);
  });
});

describe('Deterministic collision resolution', () => {
  it('gives the hit to the lowest slot when two enemies overlap exactly', () => {
    // Which of two co-located enemies takes the hit changes `world.health` per
    // slot, and StateHasher hashes that store, so the tie-break is part of the
    // replay contract rather than an implementation detail.
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const lower = createEnemy(world, 5, 5, ENEMY_HEALTH, 5);
    const higher = createEnemy(world, 5, 5, ENEMY_HEALTH, 15);
    const lowerSlot = world.slotOf(lower);
    const higherSlot = world.slotOf(higher);
    createProjectile(world, 5, 5, PROJECTILE_DAMAGE);
    const combat = new CombatSystem();

    expect(lowerSlot).toBeLessThan(higherSlot);

    combat.step(world, player, createContext(0));

    expect(world.health[lowerSlot]).toBe(ENEMY_HEALTH - PROJECTILE_DAMAGE);
    expect(world.health[higherSlot]).toBe(ENEMY_HEALTH);
  });

  it('treats an exact-touch projectile overlap as a hit', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const enemy = createEnemy(world, 10.75, 0);
    const enemySlot = world.slotOf(enemy);
    // Radii chosen to be exactly representable so the boundary is exact, not
    // approximately exact: 0.25 + 0.5 === 0.75.
    world.radius[enemySlot] = 0.5;
    createProjectile(world, 10, 0, PROJECTILE_DAMAGE, 0.25);
    const combat = new CombatSystem();

    combat.step(world, player, createContext(0));

    expect(world.health[enemySlot]).toBe(ENEMY_HEALTH - PROJECTILE_DAMAGE);
  });

  it('treats an exact-touch contact overlap as a hit', () => {
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const enemy = createEnemy(world, 1, 0);
    world.radius[world.slotOf(enemy)] = 0.5;
    const combat = new CombatSystem();

    // PLAYER_RADIUS 0.5 + enemy radius 0.5 is exactly the centre distance.
    combat.step(world, player, createContext(0));

    expect(world.health[playerSlot]).toBe(PLAYER_MAX_HEALTH - ENEMY_CONTACT_DAMAGE);
  });
});

describe('Contact damage input validation and cadence', () => {
  it('advances enemy contact cooldowns while the player is invulnerable', () => {
    // Dashing through a mob buys distance, not a frozen attack cadence.
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const enemy = createEnemy(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const enemySlot = world.slotOf(enemy);
    const combat = new CombatSystem();

    world.contactCooldownTicksRemaining[enemySlot] = 5;
    world.invulnerabilityTicksRemaining[playerSlot] = 60;

    combat.step(world, player, createContext(0));

    expect(world.contactCooldownTicksRemaining[enemySlot]).toBe(4);
    expect(world.health[playerSlot]).toBe(PLAYER_MAX_HEALTH);
  });

  it('rejects a non-finite enemy position instead of damaging from any distance', () => {
    // Both overlap rejections compare against NaN and are false, so without an
    // explicit guard a corrupt enemy lands contact damage from anywhere.
    const world = new World(16);
    const player = createPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const enemy = createEnemy(world, 40, 40);
    world.x[world.slotOf(enemy)] = Number.NaN;
    const combat = new CombatSystem();

    expect(() => combat.step(world, player, createContext(0))).toThrow(RangeError);
    expect(world.health[playerSlot]).toBe(PLAYER_MAX_HEALTH);
  });

  it('rejects a non-finite enemy position from the collision provider', () => {
    // Asserted against the provider directly: inside `step` the contact loop
    // would throw for the same enemy, so a step-level assertion would pass even
    // with this guard deleted.
    const world = new World(16);
    const enemy = createEnemy(world, 20, 20);
    world.x[world.slotOf(enemy)] = Number.NaN;
    const projectile = createProjectile(world, 20, 20, PROJECTILE_DAMAGE);
    const provider = new CollisionCandidateProvider();

    expect(() => provider.findCollidingEnemy(world, world.slotOf(projectile))).toThrow(
      RangeError
    );
  });

  it('rejects a player without Body rather than shrinking the contact hitbox', () => {
    const world = new World(16);
    const bodyless = world.createEntity(
      ComponentMask.Transform | ComponentMask.Health | ComponentMask.Player
    );
    const slot = world.slotOf(bodyless);
    world.health[slot] = PLAYER_MAX_HEALTH;
    world.maxHealth[slot] = PLAYER_MAX_HEALTH;
    const combat = new CombatSystem();

    expect(() => combat.step(world, bodyless, createContext(0))).toThrow(RangeError);
  });

  it('rejects a player that never went through resetPlayer', () => {
    // The death edge is derived from health, so an uninitialized player would
    // otherwise read as permanently alive at zero health instead of failing.
    const world = new World(16);
    const player = world.createEntity(PLAYER_MASK);
    const combat = new CombatSystem();

    expect(() => combat.step(world, player, createContext(0))).toThrow(RangeError);
  });
});
