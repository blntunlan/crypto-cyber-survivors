import { describe, expect, it } from 'vitest';
import {
  MAXIMUM_ACTIVE_ZONES,
  ZoneField,
} from '../../../services/director/zones/ZoneField';
import { ZoneEffectResolver } from '../../../services/director/zones/ZoneEffectResolver';
import { DIRECTOR_CONFIG_V1 } from '../../../services/director/config/DirectorConfigV1';

const telegraphSeconds = DIRECTOR_CONFIG_V1.marketEvents.minTelegraphSeconds;

const spawnHazard = (field: ZoneField, elapsedSeconds = 0) =>
  field.spawn({
    kind: 'HAZARD',
    shape: 'CIRCLE',
    x: 100,
    y: 100,
    radius: 50,
    activeSeconds: 5,
    elapsedSeconds,
  });

describe('§19 a zone always telegraphs before it bites', () => {
  it('stays mechanically inert during the telegraph window', () => {
    const field = new ZoneField();
    spawnHazard(field);

    field.update(telegraphSeconds - 0.1);
    expect(field.containsActive('HAZARD', 100, 100)).toBe(false);

    field.update(telegraphSeconds + 0.1);
    expect(field.containsActive('HAZARD', 100, 100)).toBe(true);
  });

  it('fades out and frees its slot', () => {
    const field = new ZoneField();
    spawnHazard(field);

    field.update(telegraphSeconds + 5 + 1);
    expect(field.getActiveCount()).toBe(0);
    expect(field.containsActive('HAZARD', 100, 100)).toBe(false);
  });

  it('never exceeds its pre-allocated pool', () => {
    const field = new ZoneField();

    for (let index = 0; index < MAXIMUM_ACTIVE_ZONES + 4; index += 1) {
      field.spawn({
        kind: 'HAZARD',
        shape: 'CIRCLE',
        x: index,
        y: index,
        radius: 10,
        activeSeconds: 30,
        elapsedSeconds: 0,
      });
    }

    expect(field.getActiveCount()).toBe(MAXIMUM_ACTIVE_ZONES);
    expect(field.getZones().length).toBe(MAXIMUM_ACTIVE_ZONES);
  });
});

describe('zone containment', () => {
  it('resolves circle membership', () => {
    const field = new ZoneField();
    spawnHazard(field);
    field.update(telegraphSeconds + 1);

    expect(field.containsActive('HAZARD', 140, 100)).toBe(true);
    expect(field.containsActive('HAZARD', 160, 100)).toBe(false);
  });

  it('resolves lane membership along its axis and width', () => {
    const field = new ZoneField();
    field.spawn({
      kind: 'SAFE_LANE',
      shape: 'LANE',
      x: 0,
      y: 0,
      radius: 20,
      angle: 0,
      length: 200,
      activeSeconds: 6,
      elapsedSeconds: 0,
    });
    field.update(telegraphSeconds + 1);

    expect(field.containsActive('SAFE_LANE', 100, 10)).toBe(true);
    expect(field.containsActive('SAFE_LANE', 100, 40)).toBe(false);
    expect(field.containsActive('SAFE_LANE', 260, 0)).toBe(false);
    expect(field.containsActive('SAFE_LANE', -10, 0)).toBe(false);
  });
});

describe('§10/§11 zone effects', () => {
  it('applies hazard damage only once the zone is live', () => {
    const field = new ZoneField();
    const resolver = new ZoneEffectResolver(field);
    spawnHazard(field);

    field.update(telegraphSeconds - 0.1);
    expect(resolver.resolve({ x: 100, y: 100 }).damagePerSecond).toBe(0);

    field.update(telegraphSeconds + 0.1);
    expect(resolver.resolve({ x: 100, y: 100 }).damagePerSecond).toBeGreaterThan(0);
  });

  it('lets a safe route override an overlapping hazard', () => {
    const field = new ZoneField();
    const resolver = new ZoneEffectResolver(field);
    spawnHazard(field);
    field.spawn({
      kind: 'SAFE_LANE',
      shape: 'CIRCLE',
      x: 100,
      y: 100,
      radius: 60,
      activeSeconds: 6,
      elapsedSeconds: 0,
    });
    field.update(telegraphSeconds + 1);

    const outcome = resolver.resolve({ x: 100, y: 100 });

    expect(outcome.isSheltered).toBe(true);
    expect(outcome.damagePerSecond).toBe(0);
  });

  it('slows the player under route pressure without damaging them', () => {
    const field = new ZoneField();
    const resolver = new ZoneEffectResolver(field);
    field.spawn({
      kind: 'ROUTE_PRESSURE',
      shape: 'CIRCLE',
      x: 0,
      y: 0,
      radius: 100,
      activeSeconds: 8,
      elapsedSeconds: 0,
    });
    field.update(telegraphSeconds + 1);

    const outcome = resolver.resolve({ x: 10, y: 10 });

    expect(outcome.movementMultiplier).toBeLessThan(1);
    expect(outcome.damagePerSecond).toBe(0);
  });

  it('punishes standing outside a live shrinking safe ring', () => {
    const field = new ZoneField();
    const resolver = new ZoneEffectResolver(field);
    field.spawn({
      kind: 'SHRINKING_SAFE',
      shape: 'CIRCLE',
      x: 0,
      y: 0,
      radius: 100,
      activeSeconds: 10,
      elapsedSeconds: 0,
    });
    field.update(telegraphSeconds + 1);

    expect(resolver.resolve({ x: 10, y: 10 }).damagePerSecond).toBe(0);
    expect(resolver.resolve({ x: 400, y: 400 }).damagePerSecond).toBeGreaterThan(0);
  });

  it('reports vision stress separately from damage', () => {
    const field = new ZoneField();
    const resolver = new ZoneEffectResolver(field);
    field.spawn({
      kind: 'VISION_STRESS',
      shape: 'CIRCLE',
      x: 0,
      y: 0,
      radius: 200,
      activeSeconds: 8,
      elapsedSeconds: 0,
    });
    field.update(telegraphSeconds + 1);

    const outcome = resolver.resolve({ x: 10, y: 10 });

    expect(outcome.visionStress).toBeGreaterThan(0);
    expect(outcome.damagePerSecond).toBe(0);
  });
});
