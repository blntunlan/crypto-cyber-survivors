import { describe, expect, it } from 'vitest';

import {
  BRUTE_ENEMY,
  GRUNT_ENEMY,
  MVP1_ENEMY_REGISTRY,
  SWARMLING_ENEMY,
  createEnemyRegistry,
} from '@/game-v2/config/EnemyRegistry';
import {
  ENEMY_CONTACT_DAMAGE,
  ENEMY_HEALTH,
  ENEMY_MOVE_SPEED,
  ENEMY_RADIUS,
  ENEMY_XP_VALUE,
} from '@/game-v2/config/Mvp0Config';

describe('EnemyRegistry', () => {
  it('registers exactly three archetypes, in this exact order', () => {
    expect(MVP1_ENEMY_REGISTRY).toEqual([GRUNT_ENEMY, SWARMLING_ENEMY, BRUTE_ENEMY]);
  });

  it('freezes the registered definitions and the registry array', () => {
    expect(Object.isFrozen(MVP1_ENEMY_REGISTRY)).toBe(true);
    expect(Object.isFrozen(GRUNT_ENEMY)).toBe(true);
    expect(Object.isFrozen(SWARMLING_ENEMY)).toBe(true);
    expect(Object.isFrozen(BRUTE_ENEMY)).toBe(true);
  });

  it('keeps grunt exactly at the unchanged MVP-0 baseline stats', () => {
    expect(GRUNT_ENEMY.health).toBe(ENEMY_HEALTH);
    expect(GRUNT_ENEMY.moveSpeed).toBe(ENEMY_MOVE_SPEED);
    expect(GRUNT_ENEMY.contactDamage).toBe(ENEMY_CONTACT_DAMAGE);
    expect(GRUNT_ENEMY.radius).toBe(ENEMY_RADIUS);
    expect(GRUNT_ENEMY.xpValue).toBe(ENEMY_XP_VALUE);
  });

  it('makes swarmling half of grunt on health, damage, and xp; cheaper, faster, smaller', () => {
    expect(SWARMLING_ENEMY.health).toBe(GRUNT_ENEMY.health / 2);
    expect(SWARMLING_ENEMY.contactDamage).toBe(GRUNT_ENEMY.contactDamage / 2);
    expect(SWARMLING_ENEMY.xpValue).toBe(GRUNT_ENEMY.xpValue / 2);
    expect(SWARMLING_ENEMY.cost).toBeLessThan(GRUNT_ENEMY.cost);
    expect(SWARMLING_ENEMY.moveSpeed).toBeGreaterThan(GRUNT_ENEMY.moveSpeed);
    expect(SWARMLING_ENEMY.radius).toBeLessThan(GRUNT_ENEMY.radius);
  });

  it('makes brute a same-cost sidegrade: tankier and harder-hitting, slower', () => {
    expect(BRUTE_ENEMY.cost).toBe(GRUNT_ENEMY.cost);
    expect(BRUTE_ENEMY.health).toBeGreaterThan(GRUNT_ENEMY.health);
    expect(BRUTE_ENEMY.contactDamage).toBeGreaterThan(GRUNT_ENEMY.contactDamage);
    expect(BRUTE_ENEMY.xpValue).toBeGreaterThan(GRUNT_ENEMY.xpValue);
    expect(BRUTE_ENEMY.moveSpeed).toBeLessThan(GRUNT_ENEMY.moveSpeed);
    expect(BRUTE_ENEMY.radius).toBeGreaterThan(GRUNT_ENEMY.radius);
  });

  it('keeps every archetype pairwise distinct by id', () => {
    const ids = MVP1_ENEMY_REGISTRY.map(definition => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sums two swarmlings to grunt-equal total health and damage (V2-ADR-070)', () => {
    expect(SWARMLING_ENEMY.health * 2).toBe(GRUNT_ENEMY.health);
    expect(SWARMLING_ENEMY.contactDamage * 2).toBe(GRUNT_ENEMY.contactDamage);
    expect(SWARMLING_ENEMY.cost * 2).toBe(GRUNT_ENEMY.cost);
  });
});

describe('createEnemyRegistry', () => {
  it('rejects an empty registry', () => {
    expect(() => createEnemyRegistry([])).toThrow(
      'enemy registry requires at least one definition'
    );
  });

  it('rejects a duplicate identity', () => {
    expect(() => createEnemyRegistry([GRUNT_ENEMY, GRUNT_ENEMY])).toThrow(
      'enemy registry contains a duplicate identity'
    );
  });

  it('validates every entry through assertEnemyDefinition', () => {
    expect(() => createEnemyRegistry([{ ...GRUNT_ENEMY, cost: -1 }])).toThrow(
      'enemy definition cost must be a positive integer'
    );
  });

  it('accepts and freezes a well-formed set', () => {
    const registry = createEnemyRegistry([GRUNT_ENEMY]);

    expect(registry).toEqual([GRUNT_ENEMY]);
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry[0])).toBe(true);
  });
});
