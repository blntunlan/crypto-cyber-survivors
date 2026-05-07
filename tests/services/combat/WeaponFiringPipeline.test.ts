import { describe, expect, it } from 'vitest';
import { WeaponFiringPipeline } from '../../../services/combat/WeaponFiringPipeline';
import { WEAPON_REGISTRY } from '../../../config/WeaponRegistry';
import { type IPoolManager } from '../../../services/interfaces/IPoolManager';
import { type Bullet, type Enemy } from '../../../types';

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

describe('WeaponFiringPipeline special weapons', () => {
  it('fires hyper cannon as dense focused spread', () => {
    const pool = createPool();

    const fired = WeaponFiringPipeline.fire({
      playerX: 100,
      playerY: 100,
      damage: 32,
      level: 5,
      config: WEAPON_REGISTRY.hyper_cannon,
      pool,
      screenWidth: 800,
      screenHeight: 600,
    });

    expect(fired).toBe(true);
    expect(pool.activeBullets).toHaveLength(
      WEAPON_REGISTRY.hyper_cannon.projectileCount + 4
    );
    expect(pool.activeBullets.every(b => b.weaponId === 'hyper_cannon')).toBe(true);
  });

  it('spawns boomerangs with return-flight metadata', () => {
    const pool = createPool();

    const fired = WeaponFiringPipeline.fire({
      playerX: 100,
      playerY: 100,
      damage: 30,
      level: 1,
      config: WEAPON_REGISTRY.boomerang,
      pool,
      screenWidth: 800,
      screenHeight: 600,
    });

    expect(fired).toBe(true);
    expect(pool.activeBullets).toHaveLength(1);
    expect(pool.activeBullets[0]).toMatchObject({
      weaponId: 'boomerang',
      phase: 'flight',
      spawnX: 100,
      spawnY: 100,
    });
    expect(pool.activeBullets[0]?.maxAge).toBeGreaterThan(1000);
    expect(pool.activeBullets[0]?.hitSet).toBeInstanceOf(Set);
  });

  it('spawns laser as short-lived beam segments', () => {
    const pool = createPool();

    const fired = WeaponFiringPipeline.fire({
      playerX: 100,
      playerY: 100,
      damage: 10,
      level: 1,
      config: WEAPON_REGISTRY.laser,
      pool,
      screenWidth: 800,
      screenHeight: 600,
    });

    expect(fired).toBe(true);
    expect(pool.activeBullets.length).toBeGreaterThan(1);
    expect(pool.activeBullets.every(b => b.weaponId === 'laser')).toBe(true);
    expect(pool.activeBullets.every(b => b.phase === 'fire')).toBe(true);
    expect(pool.activeBullets.every(b => b.maxAge !== undefined)).toBe(true);
  });

  it('spawns nuke as a small projectile with separate shockwave radius', () => {
    const pool = createPool();

    const fired = WeaponFiringPipeline.fire({
      playerX: 100,
      playerY: 100,
      damage: 50,
      level: 2,
      config: WEAPON_REGISTRY.aoe_nuke,
      pool,
      screenWidth: 800,
      screenHeight: 600,
    });

    expect(fired).toBe(true);
    expect(pool.activeBullets).toHaveLength(1);
    expect(pool.activeBullets[0]).toMatchObject({
      weaponId: 'aoe_nuke',
      phase: 'flight',
      radius: WEAPON_REGISTRY.aoe_nuke.projectileRadius,
    });
    expect(pool.activeBullets[0]?.shockwaveMaxRadius).toBeGreaterThan(60);
  });

  it('keeps orbit shield from spawning duplicate orbiters every cooldown', () => {
    const pool = createPool();
    const ctx = {
      playerX: 100,
      playerY: 100,
      damage: 8,
      level: 1 as const,
      config: WEAPON_REGISTRY.orbit_shield,
      pool,
      screenWidth: 800,
      screenHeight: 600,
    };

    expect(WeaponFiringPipeline.fire(ctx)).toBe(true);
    const firstCount = pool.activeBullets.length;
    expect(firstCount).toBe(WEAPON_REGISTRY.orbit_shield.projectileCount + 1);
    expect(WeaponFiringPipeline.fire(ctx)).toBe(false);
    expect(pool.activeBullets).toHaveLength(firstCount);
  });
});
