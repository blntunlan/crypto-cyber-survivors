import { describe, expect, it } from 'vitest';

import {
  ENEMY_CONTACT_DAMAGE,
  ENEMY_FACTION,
  ENEMY_HEALTH,
  ENEMY_MOVE_SPEED,
  ENEMY_RADIUS,
  ENEMY_XP_VALUE,
  SIMULATION_HZ,
} from '@/game-v2/config/Mvp0Config';
import { DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { EnemySystem, type EnemySpawnRequest } from '@/game-v2/systems/EnemySystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const PLAYER_MASK = ComponentMask.Transform | ComponentMask.Player;
const ENEMY_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Faction |
  ComponentMask.Enemy;
const FIXED_DELTA_SECONDS = 1 / SIMULATION_HZ;

const createWorldWithPlayer = (
  capacity = 4
): { world: World; player: number; playerSlot: number } => {
  const world = new World(capacity);
  const player = world.createEntity(PLAYER_MASK);
  return { world, player, playerSlot: world.slotOf(player) };
};

const pointRequest = (x: number, y: number): EnemySpawnRequest => ({
  type: 'point',
  x,
  y,
});

const enemyStepState = (world: World): unknown => ({
  masks: [...world.masks],
  generations: [...world.generations],
  x: [...world.x],
  y: [...world.y],
  previousX: [...world.previousX],
  previousY: [...world.previousY],
  velocityX: [...world.velocityX],
  velocityY: [...world.velocityY],
  enemySpeed: [...world.enemySpeed],
});

const releaseState = (world: World): unknown => ({
  activeCount: world.activeCount,
  freeSlotCount: world.freeSlotCount,
  masks: [...world.masks],
  generations: [...world.generations],
  x: [...world.x],
  health: [...world.health],
  enemySpeed: [...world.enemySpeed],
});

describe('EnemySystem', () => {
  it('spawns a point enemy with the exact mask and complete authored state without RNG', () => {
    const { world } = createWorldWithPlayer();
    const enemySystem = new EnemySystem();
    const rng = {
      nextFloat: (): number => {
        throw new Error('point spawn must not consume RNG');
      },
    };

    const enemy = enemySystem.spawnEnemy(world, rng, pointRequest(8, -3));
    const slot = world.slotOf(enemy);

    expect(world.masks[slot]).toBe(ENEMY_MASK);
    expect(world.x[slot]).toBe(8);
    expect(world.y[slot]).toBe(-3);
    expect(world.previousX[slot]).toBe(8);
    expect(world.previousY[slot]).toBe(-3);
    expect(world.velocityX[slot]).toBe(0);
    expect(world.velocityY[slot]).toBe(0);
    expect(world.radius[slot]).toBeCloseTo(0.6);
    expect(world.health[slot]).toBe(30);
    expect(world.maxHealth[slot]).toBe(30);
    expect(world.faction[slot]).toBe(ENEMY_FACTION);
    expect(world.enemySpeed[slot]).toBeCloseTo(2.2);
    expect(world.contactDamage[slot]).toBe(15);
    expect(world.contactCooldownTicksRemaining[slot]).toBe(0);
    expect(world.xpValue[slot]).toBe(5);
    expect(ENEMY_HEALTH).toBe(30);
    expect(ENEMY_RADIUS).toBe(0.6);
    expect(ENEMY_MOVE_SPEED).toBe(2.2);
    expect(ENEMY_CONTACT_DAMAGE).toBe(15);
    expect(ENEMY_XP_VALUE).toBe(5);
    expect(Number.isInteger(ENEMY_FACTION)).toBe(true);
    expect(ENEMY_FACTION).toBeGreaterThanOrEqual(-128);
    expect(ENEMY_FACTION).toBeLessThanOrEqual(127);
  });

  it('uses exactly one ring angle sample and maps zero to the positive X radius', () => {
    const { world } = createWorldWithPlayer();
    const enemySystem = new EnemySystem();
    let samples = 0;
    const rng = {
      nextFloat: (): number => {
        samples += 1;
        return samples === 1 ? 0 : 0.25;
      },
    };

    const enemy = enemySystem.spawnEnemy(world, rng, {
      type: 'ring',
      centerX: 3,
      centerY: -2,
      radius: 5,
    });
    const slot = world.slotOf(enemy);

    expect(samples).toBe(1);
    expect(world.x[slot]).toBe(8);
    expect(world.y[slot]).toBe(-2);
    expect(world.previousX[slot]).toBe(8);
    expect(world.previousY[slot]).toBe(-2);
  });

  it('produces identical ring coordinates for the same real RNG seed and request', () => {
    const first = createWorldWithPlayer();
    const second = createWorldWithPlayer();
    const request: EnemySpawnRequest = {
      type: 'ring',
      centerX: -4,
      centerY: 7,
      radius: 9,
    };
    const enemySystem = new EnemySystem();

    const firstEnemy = enemySystem.spawnEnemy(
      first.world,
      new DeterministicRng(0xdecafbad),
      request
    );
    const secondEnemy = enemySystem.spawnEnemy(
      second.world,
      new DeterministicRng(0xdecafbad),
      request
    );
    const firstSlot = first.world.slotOf(firstEnemy);
    const secondSlot = second.world.slotOf(secondEnemy);

    expect(first.world.x[firstSlot]).toBe(second.world.x[secondSlot]);
    expect(first.world.y[firstSlot]).toBe(second.world.y[secondSlot]);
  });

  it.each([
    { type: 'point', x: Number.NaN, y: 0 },
    { type: 'point', x: 0, y: Number.POSITIVE_INFINITY },
    { type: 'ring', centerX: Number.NEGATIVE_INFINITY, centerY: 0, radius: 1 },
    { type: 'ring', centerX: 0, centerY: Number.NaN, radius: 1 },
    { type: 'ring', centerX: 0, centerY: 0, radius: -1 },
    { type: 'ring', centerX: 0, centerY: 0, radius: Number.POSITIVE_INFINITY },
    { type: 'unknown', x: 0, y: 0 },
  ])('rejects malformed spawn request %# without publishing an entity', request => {
    const { world } = createWorldWithPlayer();
    const enemySystem = new EnemySystem();
    let samples = 0;
    const beforeCount = world.activeCount;

    expect(() =>
      enemySystem.spawnEnemy(
        world,
        { nextFloat: () => (samples += 1) },
        request as EnemySpawnRequest
      )
    ).toThrow();
    expect(samples).toBe(0);
    expect(world.activeCount).toBe(beforeCount);
    expect(world.freeSlotCount).toBe(3);
  });

  it.each([-0.001, 1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects ring RNG output %s before creating an entity',
    output => {
      const { world } = createWorldWithPlayer();
      const enemySystem = new EnemySystem();
      let samples = 0;

      expect(() =>
        enemySystem.spawnEnemy(
          world,
          {
            nextFloat: () => {
              samples += 1;
              return output;
            },
          },
          { type: 'ring', centerX: 0, centerY: 0, radius: 4 }
        )
      ).toThrow(RangeError);
      expect(samples).toBe(1);
      expect(world.activeCount).toBe(1);
      expect(world.freeSlotCount).toBe(3);
    }
  );

  it('rejects exhausted capacity before consuming a ring RNG sample', () => {
    const world = new World(1);
    world.createEntity(PLAYER_MASK);
    const enemySystem = new EnemySystem();
    let samples = 0;

    expect(() =>
      enemySystem.spawnEnemy(
        world,
        { nextFloat: () => (samples += 1) },
        { type: 'ring', centerX: 0, centerY: 0, radius: 3 }
      )
    ).toThrow('capacity');
    expect(samples).toBe(0);
    expect(world.activeCount).toBe(1);
  });

  it.each([
    pointRequest(1e100, 0),
    { type: 'ring', centerX: 3e38, centerY: 0, radius: 3e38 } as const,
  ])('rejects coordinates that cannot remain finite in ECS storage', request => {
    const { world } = createWorldWithPlayer();
    const enemySystem = new EnemySystem();
    let samples = 0;

    expect(() =>
      enemySystem.spawnEnemy(world, { nextFloat: () => (samples += 1) }, request)
    ).toThrow(RangeError);
    expect(samples).toBe(0);
    expect(world.activeCount).toBe(1);
  });

  it('moves 2.2 units over sixty fixed ticks and keeps pre-step positions', () => {
    const { world, player } = createWorldWithPlayer();
    const enemySystem = new EnemySystem();
    const enemy = enemySystem.spawnEnemy(
      world,
      { nextFloat: () => 0 },
      pointRequest(8, 0)
    );
    const slot = world.slotOf(enemy);

    for (let tick = 0; tick < SIMULATION_HZ; tick += 1) {
      const beforeX = world.x[slot] ?? 0;
      enemySystem.step(world, player, FIXED_DELTA_SECONDS);
      expect(world.previousX[slot]).toBe(beforeX);
      expect(world.previousY[slot]).toBe(0);
    }

    expect(world.x[slot]).toBeCloseTo(5.8, 4);
    expect(world.y[slot]).toBe(0);
    expect(8 - (world.x[slot] ?? 0)).toBeCloseTo(ENEMY_MOVE_SPEED, 4);
    expect(world.velocityX[slot]).toBeCloseTo(-ENEMY_MOVE_SPEED);
    expect(world.velocityY[slot]).toBe(0);
    expect(
      Math.hypot(world.velocityX[slot] ?? 0, world.velocityY[slot] ?? 0)
    ).toBeCloseTo(ENEMY_MOVE_SPEED);
  });

  it('clamps integration at a near target without overshoot', () => {
    const { world, player } = createWorldWithPlayer();
    const enemySystem = new EnemySystem();
    const enemy = enemySystem.spawnEnemy(
      world,
      { nextFloat: () => 0 },
      pointRequest(0.01, -0.02)
    );
    const slot = world.slotOf(enemy);

    enemySystem.step(world, player, 1);

    expect(world.previousX[slot]).toBeCloseTo(0.01);
    expect(world.previousY[slot]).toBeCloseTo(-0.02);
    expect(world.x[slot]).toBe(0);
    expect(world.y[slot]).toBe(0);
    expect(Number.isFinite(world.velocityX[slot])).toBe(true);
    expect(Number.isFinite(world.velocityY[slot])).toBe(true);
  });

  it('writes finite zero velocity when enemy and player share a position', () => {
    const { world, player, playerSlot } = createWorldWithPlayer();
    const enemySystem = new EnemySystem();
    world.x[playerSlot] = 4;
    world.y[playerSlot] = -7;
    const enemy = enemySystem.spawnEnemy(
      world,
      { nextFloat: () => 0 },
      pointRequest(4, -7)
    );
    const slot = world.slotOf(enemy);
    world.velocityX[slot] = 99;
    world.velocityY[slot] = -88;

    enemySystem.step(world, player, FIXED_DELTA_SECONDS);

    expect(world.previousX[slot]).toBe(4);
    expect(world.previousY[slot]).toBe(-7);
    expect(world.x[slot]).toBe(4);
    expect(world.y[slot]).toBe(-7);
    expect(world.velocityX[slot]).toBe(0);
    expect(world.velocityY[slot]).toBe(0);
    expect(Number.isFinite(world.velocityX[slot])).toBe(true);
    expect(Number.isFinite(world.velocityY[slot])).toBe(true);
  });

  it('normalizes opposite near-Float32-limit positions into a finite chase velocity', () => {
    const { world, player, playerSlot } = createWorldWithPlayer();
    const enemySystem = new EnemySystem();
    world.x[playerSlot] = 3e38;
    world.y[playerSlot] = -3e38;
    const enemy = enemySystem.spawnEnemy(
      world,
      { nextFloat: () => 0 },
      pointRequest(-3e38, 3e38)
    );
    const slot = world.slotOf(enemy);
    enemySystem.step(world, player, 1);

    expect(Number.isFinite(world.x[slot])).toBe(true);
    expect(Number.isFinite(world.y[slot])).toBe(true);
    expect(Number.isFinite(world.velocityX[slot])).toBe(true);
    expect(Number.isFinite(world.velocityY[slot])).toBe(true);
    expect(
      Math.hypot(world.velocityX[slot] ?? 0, world.velocityY[slot] ?? 0)
    ).toBeCloseTo(ENEMY_MOVE_SPEED);
    expect(world.velocityX[slot]).toBeGreaterThan(0);
    expect(world.velocityY[slot]).toBeLessThan(0);
  });

  it('matches every required chase bit rather than any one bit', () => {
    const { world, player } = createWorldWithPlayer();
    const decoy = world.createEntity(ComponentMask.Transform | ComponentMask.Enemy);
    const slot = world.slotOf(decoy);
    world.x[slot] = 12;
    world.y[slot] = 4;
    world.previousX[slot] = 91;
    world.previousY[slot] = 92;
    world.velocityX[slot] = 93;
    world.velocityY[slot] = 94;
    world.enemySpeed[slot] = 2.2;

    new EnemySystem().step(world, player, FIXED_DELTA_SECONDS);

    expect(world.x[slot]).toBe(12);
    expect(world.y[slot]).toBe(4);
    expect(world.previousX[slot]).toBe(91);
    expect(world.previousY[slot]).toBe(92);
    expect(world.velocityX[slot]).toBe(93);
    expect(world.velocityY[slot]).toBe(94);
  });

  it('releases into the World allocator and respawns the slot with a new generation and clean stores', () => {
    const { world } = createWorldWithPlayer(2);
    const enemySystem = new EnemySystem();
    const first = enemySystem.spawnEnemy(
      world,
      { nextFloat: () => 0 },
      pointRequest(8, 0)
    );
    const slot = world.slotOf(first);

    world.x[slot] = 41;
    world.y[slot] = -42;
    world.previousX[slot] = 43;
    world.previousY[slot] = -44;
    world.velocityX[slot] = 45;
    world.velocityY[slot] = -46;
    world.radius[slot] = 47;
    world.health[slot] = 48;
    world.maxHealth[slot] = 49;
    world.faction[slot] = 50;
    world.enemySpeed[slot] = 51;
    world.contactDamage[slot] = 52;
    world.contactCooldownTicksRemaining[slot] = 53;
    world.xpValue[slot] = 54;
    world.moveSpeed[slot] = 55;
    world.lastFacingX[slot] = 56;
    world.lastFacingY[slot] = -57;
    world.dashDirectionX[slot] = 58;
    world.dashDirectionY[slot] = -59;
    world.dashRemainingSeconds[slot] = 55;
    world.invulnerabilityTicksRemaining[slot] = 60;
    world.dashCooldownTicksRemaining[slot] = 56;
    world.dashCharges[slot] = 57;
    world.movementOverride[slot] = 1;
    world.weaponCooldownTicksRemaining[slot] = 58;
    world.weaponDamage[slot] = 59;
    world.xp[slot] = 60;
    world.level[slot] = 61;
    world.projectileDamage[slot] = 62;
    world.projectileLifetimeTicksRemaining[slot] = 63;
    world.xpPickupValue[slot] = 64;

    enemySystem.releaseEnemy(world, first);
    const second = enemySystem.spawnEnemy(
      world,
      { nextFloat: () => 0 },
      pointRequest(-5, 6)
    );

    expect(world.slotOf(second)).toBe(slot);
    expect(second).not.toBe(first);
    expect(world.isAlive(first)).toBe(false);
    expect(world.x[slot]).toBe(-5);
    expect(world.y[slot]).toBe(6);
    expect(world.previousX[slot]).toBe(-5);
    expect(world.previousY[slot]).toBe(6);
    expect(world.velocityX[slot]).toBe(0);
    expect(world.velocityY[slot]).toBe(0);
    expect(world.radius[slot]).toBeCloseTo(ENEMY_RADIUS);
    expect(world.health[slot]).toBe(ENEMY_HEALTH);
    expect(world.maxHealth[slot]).toBe(ENEMY_HEALTH);
    expect(world.faction[slot]).toBe(ENEMY_FACTION);
    expect(world.enemySpeed[slot]).toBeCloseTo(ENEMY_MOVE_SPEED);
    expect(world.contactDamage[slot]).toBe(ENEMY_CONTACT_DAMAGE);
    expect(world.contactCooldownTicksRemaining[slot]).toBe(0);
    expect(world.xpValue[slot]).toBe(ENEMY_XP_VALUE);
    expect(world.moveSpeed[slot]).toBe(0);
    expect(world.lastFacingX[slot]).toBe(0);
    expect(world.lastFacingY[slot]).toBe(0);
    expect(world.dashDirectionX[slot]).toBe(0);
    expect(world.dashDirectionY[slot]).toBe(0);
    expect(world.dashRemainingSeconds[slot]).toBe(0);
    expect(world.invulnerabilityTicksRemaining[slot]).toBe(0);
    expect(world.dashCooldownTicksRemaining[slot]).toBe(0);
    expect(world.dashCharges[slot]).toBe(0);
    expect(world.movementOverride[slot]).toBe(0);
    expect(world.weaponCooldownTicksRemaining[slot]).toBe(0);
    expect(world.weaponDamage[slot]).toBe(0);
    expect(world.xp[slot]).toBe(0);
    expect(world.level[slot]).toBe(0);
    expect(world.projectileDamage[slot]).toBe(0);
    expect(world.projectileLifetimeTicksRemaining[slot]).toBe(0);
    expect(world.xpPickupValue[slot]).toBe(0);
  });

  it('rejects stale and wrong-mask releases without changing World state', () => {
    const { world } = createWorldWithPlayer();
    const enemySystem = new EnemySystem();
    const enemy = enemySystem.spawnEnemy(
      world,
      { nextFloat: () => 0 },
      pointRequest(3, 4)
    );
    enemySystem.releaseEnemy(world, enemy);
    const afterRelease = releaseState(world);

    expect(() => enemySystem.releaseEnemy(world, enemy)).toThrow(RangeError);
    expect(releaseState(world)).toEqual(afterRelease);

    const wrongMask = world.createEntity(ComponentMask.Enemy);
    world.x[world.slotOf(wrongMask)] = 77;
    const beforeWrongMask = releaseState(world);

    expect(() => enemySystem.releaseEnemy(world, wrongMask)).toThrow(RangeError);
    expect(releaseState(world)).toEqual(beforeWrongMask);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid delta %s atomically',
    deltaSeconds => {
      const { world, player } = createWorldWithPlayer();
      const enemySystem = new EnemySystem();
      enemySystem.spawnEnemy(world, { nextFloat: () => 0 }, pointRequest(8, 2));
      const before = enemyStepState(world);

      expect(() => enemySystem.step(world, player, deltaSeconds)).toThrow(RangeError);
      expect(enemyStepState(world)).toEqual(before);
    }
  );

  it('rejects stale, wrong-mask, and non-finite player state atomically', () => {
    const enemySystem = new EnemySystem();

    {
      const { world, player } = createWorldWithPlayer();
      enemySystem.spawnEnemy(world, { nextFloat: () => 0 }, pointRequest(8, 2));
      world.destroyEntity(player);
      const before = enemyStepState(world);
      expect(() => enemySystem.step(world, player, FIXED_DELTA_SECONDS)).toThrow(
        RangeError
      );
      expect(enemyStepState(world)).toEqual(before);
    }

    {
      const world = new World(3);
      const wrongMaskPlayer = world.createEntity(ComponentMask.Player);
      enemySystem.spawnEnemy(world, { nextFloat: () => 0 }, pointRequest(8, 2));
      const before = enemyStepState(world);
      expect(() =>
        enemySystem.step(world, wrongMaskPlayer, FIXED_DELTA_SECONDS)
      ).toThrow(RangeError);
      expect(enemyStepState(world)).toEqual(before);
    }

    {
      const { world, player, playerSlot } = createWorldWithPlayer();
      enemySystem.spawnEnemy(world, { nextFloat: () => 0 }, pointRequest(8, 2));
      world.x[playerSlot] = Number.NaN;
      const before = enemyStepState(world);
      expect(() => enemySystem.step(world, player, FIXED_DELTA_SECONDS)).toThrow(
        RangeError
      );
      expect(enemyStepState(world)).toEqual(before);
    }
  });

  it.each([
    ['x', Number.NaN],
    ['y', Number.POSITIVE_INFINITY],
    ['enemySpeed', -0.1],
    ['enemySpeed', Number.NaN],
  ] as const)(
    'rejects malformed enemy %s before mutating an earlier valid enemy',
    (store, value) => {
      const { world, player } = createWorldWithPlayer(4);
      const enemySystem = new EnemySystem();
      const first = enemySystem.spawnEnemy(
        world,
        { nextFloat: () => 0 },
        pointRequest(8, 0)
      );
      const second = enemySystem.spawnEnemy(
        world,
        { nextFloat: () => 0 },
        pointRequest(9, 0)
      );
      const secondSlot = world.slotOf(second);
      world[store][secondSlot] = value;
      const firstSlot = world.slotOf(first);
      world.previousX[firstSlot] = 81;
      world.velocityX[firstSlot] = 82;
      const before = enemyStepState(world);

      expect(() => enemySystem.step(world, player, FIXED_DELTA_SECONDS)).toThrow(
        RangeError
      );
      expect(enemyStepState(world)).toEqual(before);
    }
  );
});
