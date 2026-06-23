import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeaponSystem } from '../../../services/combat/WeaponSystem';
import { WEAPON_REGISTRY } from '../../../config/WeaponRegistry';
import { type IPoolManager } from '../../../services/interfaces/IPoolManager';
import { type Bullet, type Enemy } from '../../../types';
import { EventBus } from '../../../services/core/EventBus';

function createPool(): IPoolManager {
  const bullets: Bullet[] = [];
  const enemy = {
    active: true,
    x: 180,
    y: 100,
    radius: 12,
    speed: 1,
    isDying: false,
  } as Enemy;

  return {
    activeEnemies: [enemy],
    activeBullets: bullets,
    activeGems: [],
    activeParticles: [],
    activeFloatingTexts: [],
    activeSpeedLines: [],
    activeInteractables: [],
    getBullet: (
      x: number,
      y: number,
      vx: number,
      vy: number,
      damage: number,
      radius: number,
      color: string,
      isCrit: boolean,
      isSuperCrit: boolean
    ) => {
      const bullet = {
        active: true,
        x,
        y,
        vx,
        vy,
        damage,
        radius,
        color,
        isCrit,
        isSuperCrit,
      } as Bullet;
      bullets.push(bullet);
      return bullet;
    },
  } as unknown as IPoolManager;
}

describe('WeaponSystem', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    WeaponSystem.reset();
  });

  it('clears the weapon inventory on gameReset (no leak between runs)', () => {
    // Simulate a previous run that acquired the laser.
    WeaponSystem.addWeapon('laser');
    expect(WeaponSystem.hasWeapon('laser')).toBe(true);

    // Canonical reset path fired by GameStateManager.resetAll on every new run.
    EventBus.emit('gameReset', {});

    expect(WeaponSystem.hasWeapon('laser')).toBe(false);
    expect(WeaponSystem.getWeapons()).toHaveLength(0);
  });

  it('evolves maxed quantum bullet and laser into hyper cannon', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');

    expect(WeaponSystem.addWeapon('quantum_bullet')).toBe(true);
    expect(WeaponSystem.addWeapon('laser')).toBe(true);

    for (let i = 0; i < 4; i++) {
      expect(WeaponSystem.upgradeWeapon('quantum_bullet')).toBe(true);
    }
    for (let i = 0; i < 4; i++) {
      expect(WeaponSystem.upgradeWeapon('laser')).toBe(true);
    }

    expect(WeaponSystem.getWeapons()).toEqual([
      { id: 'hyper_cannon', level: 5, cooldownTimer: 0 },
    ]);
    expect(WeaponSystem.hasWeapon('quantum_bullet')).toBe(false);
    expect(WeaponSystem.hasWeapon('laser')).toBe(false);
    expect(WeaponSystem.hasWeapon('hyper_cannon')).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith('weaponEvolution', {
      from: ['quantum_bullet', 'laser'],
      to: 'hyper_cannon',
    });
  });

  it('allows a new weapon slot after evolution collapses the pair', () => {
    WeaponSystem.addWeapon('quantum_bullet');
    WeaponSystem.addWeapon('laser');

    for (let i = 0; i < 4; i++) WeaponSystem.upgradeWeapon('quantum_bullet');
    for (let i = 0; i < 4; i++) WeaponSystem.upgradeWeapon('laser');

    expect(WeaponSystem.addWeapon('boomerang')).toBe(true);
    expect(WeaponSystem.getWeapons().map(weapon => weapon.id)).toEqual([
      'hyper_cannon',
      'boomerang',
    ]);
  });

  it('normalizes raw player baseDamage instead of treating it as a multiplier', () => {
    const pool = createPool();
    WeaponSystem.addWeapon('boomerang');

    WeaponSystem.update(
      1300,
      100,
      100,
      25,
      {
        atrPercent: 0,
        rsiState: 'NEUTRAL',
        pnl: -0.1,
        volumeNorm: 0,
        isFavorable: false,
      },
      pool,
      800,
      600
    );

    const expectedDamage =
      WEAPON_REGISTRY.boomerang.baseDamage *
      (1 + WEAPON_REGISTRY.boomerang.damagePerLevel);

    expect(pool.activeBullets[0]?.damage).toBeCloseTo(expectedDamage, 5);
    expect(pool.activeBullets[0]?.damage).toBeLessThan(expectedDamage * 2);
  });
});
