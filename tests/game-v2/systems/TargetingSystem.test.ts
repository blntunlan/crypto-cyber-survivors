import { describe, expect, it, vi } from 'vitest';

import {
  ENEMY_FACTION,
  ENEMY_HEALTH,
  ENEMY_RADIUS,
  WEAPON_RANGE,
} from '@/game-v2/config/Mvp0Config';
import { NO_ENTITY, type EntityId } from '@/game-v2/contracts/EntityId';
import { TargetingSystem } from '@/game-v2/systems/TargetingSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const PLAYER_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Health |
  ComponentMask.Player;
const PLAYER_HEALTH = 100;
const ENEMY_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Faction |
  ComponentMask.Enemy;

const createPlayer = (world: World, x = 0, y = 0): EntityId => {
  const player = world.createEntity(PLAYER_MASK);
  const slot = world.slotOf(player);
  world.x[slot] = x;
  world.y[slot] = y;
  world.previousX[slot] = x;
  world.previousY[slot] = y;
  world.health[slot] = PLAYER_HEALTH;
  world.maxHealth[slot] = PLAYER_HEALTH;
  return player;
};

const createEnemy = (
  world: World,
  x: number,
  y: number,
  health = ENEMY_HEALTH
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
  return enemy;
};

const worldState = (world: World): unknown => ({
  activeCount: world.activeCount,
  freeSlotCount: world.freeSlotCount,
  masks: [...world.masks],
  generations: [...world.generations],
  freeSlots: [...world.freeSlots],
  x: [...world.x],
  y: [...world.y],
  previousX: [...world.previousX],
  previousY: [...world.previousY],
  velocityX: [...world.velocityX],
  velocityY: [...world.velocityY],
  radius: [...world.radius],
  health: [...world.health],
  maxHealth: [...world.maxHealth],
  faction: [...world.faction],
  weaponCooldownTicksRemaining: [...world.weaponCooldownTicksRemaining],
  projectileDamage: [...world.projectileDamage],
  projectileLifetimeTicksRemaining: [...world.projectileLifetimeTicksRemaining],
});

describe('TargetingSystem', () => {
  it('exposes a negative NO_ENTITY sentinel that no live handle can equal', () => {
    const world = new World(4);
    const player = createPlayer(world);

    expect(NO_ENTITY).toBe(-1);
    expect(NO_ENTITY).toBeLessThan(0);
    expect(player).toBeGreaterThanOrEqual(0);
    expect(world.isAlive(NO_ENTITY)).toBe(false);
  });

  it('selects the nearest live enemy inside range and ignores the player entity', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    const far = createEnemy(world, 9, 0);
    const near = createEnemy(world, 2, 0);
    const middle = createEnemy(world, 5, 0);
    const targeting = new TargetingSystem();

    const target = targeting.findNearestTarget(world, player);

    expect(target).toBe(near);
    expect(target).not.toBe(far);
    expect(target).not.toBe(middle);
    expect(target).not.toBe(player);
  });

  it('requires every candidate component bit instead of any bit', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    const enemyBitOnly = world.createEntity(ComponentMask.Enemy);
    world.health[world.slotOf(enemyBitOnly)] = 30;
    const transformOnly = world.createEntity(ComponentMask.Transform);
    world.x[world.slotOf(transformOnly)] = 1;
    world.health[world.slotOf(transformOnly)] = 30;
    const noHealthBit = world.createEntity(
      ComponentMask.Transform | ComponentMask.Enemy
    );
    world.x[world.slotOf(noHealthBit)] = 1.5;
    world.health[world.slotOf(noHealthBit)] = 30;
    const complete = createEnemy(world, 7, 0);
    const targeting = new TargetingSystem();

    expect(targeting.findNearestTarget(world, player)).toBe(complete);
  });

  it('rejects enemies whose health is not positive', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, 1, 0, 0);
    const alive = createEnemy(world, 6, 0);
    const targeting = new TargetingSystem();

    expect(targeting.findNearestTarget(world, player)).toBe(alive);
  });

  it('treats WEAPON_RANGE as an inclusive boundary on squared distance', () => {
    const targeting = new TargetingSystem();
    const inclusiveWorld = new World(4);
    const inclusivePlayer = createPlayer(inclusiveWorld, 0, 0);
    const exactlyAtRange = createEnemy(inclusiveWorld, WEAPON_RANGE, 0);

    expect(targeting.findNearestTarget(inclusiveWorld, inclusivePlayer)).toBe(
      exactlyAtRange
    );

    const axisWorld = new World(4);
    const axisPlayer = createPlayer(axisWorld, 0, 0);
    createEnemy(axisWorld, 12.0001, 0);

    expect(axisWorld.x[1]).toBeGreaterThan(WEAPON_RANGE);
    expect(targeting.findNearestTarget(axisWorld, axisPlayer)).toBe(NO_ENTITY);

    const diagonalWorld = new World(4);
    const diagonalPlayer = createPlayer(diagonalWorld, 0, 0);
    createEnemy(diagonalWorld, WEAPON_RANGE, 0.01);

    expect(targeting.findNearestTarget(diagonalWorld, diagonalPlayer)).toBe(NO_ENTITY);
  });

  it('returns NO_ENTITY when nothing qualifies', () => {
    const world = new World(4);
    const player = createPlayer(world, 0, 0);
    const targeting = new TargetingSystem();

    expect(targeting.findNearestTarget(world, player)).toBe(NO_ENTITY);

    createEnemy(world, 40, 0);

    expect(targeting.findNearestTarget(world, player)).toBe(NO_ENTITY);
  });

  it('resolves exact distance ties to the lowest slot on every repeated run', () => {
    for (let run = 0; run < 25; run += 1) {
      const world = new World(8);
      const player = createPlayer(world, 0, 0);
      const lowerSlot = createEnemy(world, 3, 0);
      const higherSlot = createEnemy(world, -3, 0);
      const targeting = new TargetingSystem();

      expect(world.slotOf(lowerSlot)).toBe(1);
      expect(world.slotOf(higherSlot)).toBe(2);
      expect(targeting.findNearestTarget(world, player)).toBe(lowerSlot);
    }
  });

  it('keeps the lowest-slot tie-break regardless of tie direction', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    const firstCreated = createEnemy(world, 0, 4);
    createEnemy(world, 0, -4);
    createEnemy(world, 4, 0);
    const targeting = new TargetingSystem();

    expect(targeting.findNearestTarget(world, player)).toBe(firstCreated);
  });

  it('consumes no randomness while selecting a target', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, 3, 0);
    createEnemy(world, -3, 0);
    const targeting = new TargetingSystem();
    const randomSpy = vi.spyOn(Math, 'random');

    try {
      targeting.findNearestTarget(world, player);
      expect(randomSpy).not.toHaveBeenCalled();
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('never mutates world state', () => {
    const world = new World(8);
    const player = createPlayer(world, 1, -2);
    createEnemy(world, 3, 4);
    createEnemy(world, -8, 1);
    const targeting = new TargetingSystem();
    const before = worldState(world);

    targeting.findNearestTarget(world, player);

    expect(worldState(world)).toEqual(before);
  });

  it('rejects an invalid player boundary atomically', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, 3, 0);
    const targeting = new TargetingSystem();

    const wrongMask = world.createEntity(ComponentMask.Player);
    const beforeWrongMask = worldState(world);
    expect(() => targeting.findNearestTarget(world, wrongMask)).toThrow(RangeError);
    expect(worldState(world)).toEqual(beforeWrongMask);
    world.destroyEntity(wrongMask);

    const beforeNonFinite = worldState(world);
    world.x[world.slotOf(player)] = Number.NaN;
    expect(() => targeting.findNearestTarget(world, player)).toThrow(RangeError);
    world.x[world.slotOf(player)] = 0;
    expect(worldState(world)).toEqual(beforeNonFinite);

    expect(() => targeting.findNearestTarget(world, 987654)).toThrow(RangeError);
    expect(worldState(world)).toEqual(beforeNonFinite);
  });

  it('validates every scanned enemy before returning a nearer valid target', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, 1, 0);
    const broken = createEnemy(world, 4, 0);
    world.y[world.slotOf(broken)] = Number.NaN;
    const targeting = new TargetingSystem();

    expect(() => targeting.findNearestTarget(world, player)).toThrow(RangeError);
  });

  it('stays finite and rejects candidates at the Float32 coordinate limit', () => {
    const world = new World(8);
    const player = createPlayer(world, 3e38, 0);
    createEnemy(world, -3e38, 0);
    const targeting = new TargetingSystem();

    expect(targeting.findNearestTarget(world, player)).toBe(NO_ENTITY);
  });

  it('selects an enemy sharing the exact player position', () => {
    const world = new World(8);
    const player = createPlayer(world, 5, -5);
    const overlapping = createEnemy(world, 5, -5);
    const targeting = new TargetingSystem();

    expect(targeting.findNearestTarget(world, player)).toBe(overlapping);
  });
});
