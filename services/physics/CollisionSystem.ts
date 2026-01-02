import { type PoolManager } from '../PoolManager';
import { type Player, type GameState, type Enemy, type Bullet } from '../../types';
import { CheatManager } from '../CheatManager';
import { audio } from '../AudioService';
import { EventBus } from '../EventBus';
import { COLORS, GAME_ENGINE } from '../../constants';
import { bulletGrid } from '../SpatialGrid';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { ParticleConfigService } from '../ParticleConfigService';
import { BuffManager } from '../patterns/decorators/BuffManager';
import { CombatResolutionService } from './CombatResolutionService';

/**
 * CollisionSystem - Handles physical interactions between high-level entities.
 * Includes Player-Enemy and Bullet-Enemy collision detection and resolution.
 */
export class CollisionSystem {
  /**
   * Run all collision checks for regular enemies.
   */
  public static update(
    pool: PoolManager,
    player: Player,
    state: GameState,
    dtFactor: number,
    width: number,
    height: number,
    onGameOver: () => void
  ): void {
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();

    pool.activeEnemies.forEach(enemy => {
      // 1. Off-screen culling
      if (this.isOffScreen(enemy, width, height)) {
        enemy.active = false;
        return;
      }

      // 2. Behavioral Movement
      enemy.behavior.move(enemy, player.x, player.y, dtFactor);

      // 3. Player-Enemy collision
      this.checkPlayerEnemyCollision(player, enemy, state, dtFactor, onGameOver);

      // 4. Bullet-Enemy collision (using spatial grid)
      this.processBulletCollisions(pool, enemy, player, state, dtFactor, perfConfig);
    });
  }

  private static isOffScreen(enemy: Enemy, width: number, height: number): boolean {
    const threshold = GAME_ENGINE.ENEMY_OFFSCREEN_THRESHOLD;
    return (
      enemy.x < -threshold ||
      enemy.x > width + threshold ||
      enemy.y < -threshold ||
      enemy.y > height + threshold
    );
  }

  private static checkPlayerEnemyCollision(
    player: Player,
    enemy: Enemy,
    state: GameState,
    dtFactor: number,
    onGameOver: () => void
  ): void {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distSq = dx * dx + dy * dy;
    const combinedRadius = player.radius + enemy.radius;

    if (distSq < combinedRadius * combinedRadius) {
      if (!CheatManager.isGodMode() && !state.isDashing) {
        const effectiveArmor = BuffManager.isInitialized()
          ? BuffManager.getDecoratedStats().getArmor()
          : player.armor;

        player.hp -= Math.max(0.1, 0.8 - effectiveArmor * 0.05) * dtFactor;
        player.hp = Math.max(0, player.hp);
        state.shake = 10;

        if (Math.random() > 0.9) audio.playHit();

        if (player.hp <= 0 && !state.isGameOverTriggered) {
          state.isGameOverTriggered = true;
          onGameOver();
        }
      }
    }
  }

  private static processBulletCollisions(
    pool: PoolManager,
    enemy: Enemy,
    player: Player,
    state: GameState,
    dtFactor: number,
    perfConfig: any
  ): void {
    const nearbyBullets = bulletGrid.getNearby(enemy.x, enemy.y);

    for (const bullet of nearbyBullets) {
      if (!enemy.active || !bullet.active) continue;

      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const distSq = dx * dx + dy * dy;
      const combinedRadius = enemy.radius + bullet.radius;

      if (distSq < combinedRadius * combinedRadius) {
        this.resolveBulletHit(pool, enemy, bullet, player, state, dtFactor, perfConfig);
      }
    }
  }

  private static resolveBulletHit(
    pool: PoolManager,
    enemy: Enemy,
    bullet: Bullet,
    player: Player,
    state: GameState,
    dtFactor: number,
    perfConfig: any
  ): void {
    enemy.health -= bullet.damage;
    bullet.active = false;

    // Effects
    this.spawnImpactParticles(pool, bullet, perfConfig);
    this.applyKnockback(enemy, bullet, dtFactor);
    this.triggerCritEffects(bullet, enemy, state);
    this.spawnDamageText(pool, enemy, bullet);

    if (enemy.health <= 0) {
      CombatResolutionService.handleEnemyDeath(pool, enemy, player, !!bullet.isSuperCrit);
    }
  }

  private static applyKnockback(enemy: Enemy, bullet: Bullet, dtFactor: number): void {
    const strength = 4;
    enemy.x += (bullet.vx / GAME_ENGINE.BULLET_SPEED) * strength * dtFactor;
    enemy.y += (bullet.vy / GAME_ENGINE.BULLET_SPEED) * strength * dtFactor;
  }

  private static triggerCritEffects(bullet: Bullet, enemy: Enemy, state: GameState): void {
    if (bullet.isCrit || bullet.isSuperCrit) {
      state.critFlash = bullet.isSuperCrit ? 0.15 : 0.08;
      state.critFlashColor = bullet.isSuperCrit ? COLORS.SUPER_CRIT : COLORS.CRIT;
      audio.playCrit();

      EventBus.emit('critHit', {
        damage: bullet.damage,
        isSuperCrit: !!bullet.isSuperCrit,
        x: enemy.x,
        y: enemy.y,
      });
    }
  }

  private static spawnDamageText(pool: PoolManager, enemy: Enemy, bullet: Bullet): void {
    const color = bullet.isSuperCrit
      ? COLORS.CASINO_RED
      : bullet.isCrit
        ? COLORS.CASINO_GOLD
        : COLORS.SLOT_SILVER;

    const size = bullet.isSuperCrit ? 36 : bullet.isCrit ? 28 : 20;

    pool.getFloatingText(
      enemy.x + (Math.random() - 0.5) * 10,
      enemy.y - 20,
      bullet.damage.toFixed(0),
      color,
      size
    );
  }

  private static spawnImpactParticles(pool: PoolManager, bullet: Bullet, perfConfig: any): void {
    const impactCfg = ParticleConfigService.impact;
    const count = Math.round(impactCfg.count * perfConfig.particleMultiplier);

    for (let i = 0; i < count; i++) {
      pool.getParticle(
        bullet.x,
        bullet.y,
        (Math.random() - 0.5) * impactCfg.speed,
        (Math.random() - 0.5) * impactCfg.speed,
        bullet.isSuperCrit ? COLORS.SUPER_CRIT : bullet.color
      ).life = impactCfg.life;
    }
  }
}
