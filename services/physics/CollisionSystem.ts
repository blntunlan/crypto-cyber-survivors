/**
 * CollisionSystem - Handles physical interactions between high-level entities.
 * Includes Player-Enemy and Bullet-Enemy collision detection and resolution.
 *
 * @refactored Uses IPhysicsContext for dependency injection instead of direct imports.
 * This reduces coupling from 13 imports to 6 imports.
 */

import { type PoolManager } from '../PoolManager';
import { type Player, type GameState, type Enemy, type Bullet } from '../../types';
import { type IPhysicsContext } from './PhysicsTypes';
import { getPhysicsContext, physicsColors } from './PhysicsContext';
import { EventBus } from '../EventBus';
import { CombatResolutionService } from './CombatResolutionService';
import { StatService } from '../StatService';

// Extended enemy type with behavior (added by EnemyFactory at runtime)
interface EnemyWithBehavior extends Enemy {
  behavior: {
    move: (enemy: Enemy, targetX: number, targetY: number, dtFactor: number) => void;
  };
}

/**
 * CollisionSystem - Handles physical interactions between high-level entities.
 * Includes Player-Enemy and Bullet-Enemy collision detection and resolution.
 */
export class CollisionSystem {
  private static ctx: IPhysicsContext = getPhysicsContext();

  /**
   * Set a custom context (for testing)
   */
  public static setContext(context: IPhysicsContext): void {
    this.ctx = context;
  }

  /**
   * Reset to default context
   */
  public static resetContext(): void {
    this.ctx = getPhysicsContext();
  }

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
    const perfConfig = this.ctx.performance.getPerformanceConfig();

    pool.activeEnemies.forEach(enemy => {
      // Skip dying enemies - they just animate and fade out
      if (enemy.isDying) {
        return;
      }

      // Cast to extended type with behavior
      const enemyWithBehavior = enemy as unknown as EnemyWithBehavior;

      // 1. Off-screen culling
      if (this.isOffScreen(enemy, width, height)) {
        enemy.active = false;
        return;
      }

      // Check for screen entry to trigger spawn animation
      if (!enemy.hasEnteredScreen) {
        const margin = enemy.radius;
        if (
          enemy.x > -margin &&
          enemy.x < width + margin &&
          enemy.y > -margin &&
          enemy.y < height + margin
        ) {
          enemy.hasEnteredScreen = true;
          enemy.spawnTimer = 1; // Reset to full animation when entering screen
        }
      }

      // Spawn Animation Timer - ONLY decrement after entering screen
      // This ensures animation plays when enemy becomes visible, not while off-screen
      if (enemy.hasEnteredScreen && enemy.spawnTimer !== undefined && enemy.spawnTimer > 0) {
        enemy.spawnTimer -= 0.1 * dtFactor; // ~10 frames for snappy pop
        if (enemy.spawnTimer < 0) enemy.spawnTimer = 0;
      }

      // 2. Behavioral Movement
      enemyWithBehavior.behavior.move(enemy, player.x, player.y, dtFactor);

      // 3. Player-Enemy collision
      this.checkPlayerEnemyCollision(pool, player, enemy, state, dtFactor, onGameOver);

      // 4. Bullet-Enemy collision (using spatial grid)
      this.processBulletCollisions(
        pool,
        enemy,
        player,
        state,
        dtFactor,
        perfConfig.particleMultiplier
      );
    });
  }

  private static isOffScreen(enemy: Enemy, width: number, height: number): boolean {
    const threshold = this.ctx.constants.ENEMY_OFFSCREEN_THRESHOLD;
    return (
      enemy.x < -threshold ||
      enemy.x > width + threshold ||
      enemy.y < -threshold ||
      enemy.y > height + threshold
    );
  }

  private static checkPlayerEnemyCollision(
    pool: PoolManager,
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
      if (!this.ctx.cheat.isGodMode() && !state.isDashing) {
        // Calculate dodge chance
        const rawDodge = this.ctx.stats.getDodge(player);
        const dodgeChance = Math.min(rawDodge, this.ctx.statCaps.MAX_DODGE);

        // Try to dodge
        if (Math.random() < dodgeChance) {
          // Successful dodge
          pool.getFloatingText(player.x, player.y - 20, 'DODGE!', physicsColors.BULLET, 16);
          // Optional: Add dodge sound
          return; // No damage taken
        }

        // Get armor with system-level cap
        const rawArmor = this.ctx.stats.getArmor(player);
        const effectiveArmor = Math.min(rawArmor, this.ctx.statCaps.MAX_ARMOR);

        // Diminishing returns armor formula:
        // At 0 armor: 100% damage (0.8 base)
        // At 5 armor: ~62% damage
        // At 10 armor: ~44% damage
        // At 15 armor: ~35% damage (min 0.1 = 10%)
        const armorReduction = effectiveArmor / (effectiveArmor + 10);
        const damageMultiplier = Math.max(0.1, 0.8 * (1 - armorReduction));

        player.hp -= damageMultiplier * dtFactor;
        player.hp = Math.max(0, player.hp);
        state.shake = 10;

        // Damage Direction Indicator - DISABLED
        /*
        state.damageIndicators.push({
          sourceX: enemy.x,
          sourceY: enemy.y,
          timestamp: Date.now(),
        });
        */

        if (Math.random() > 0.9) this.ctx.audio.playHit();

        if (player.hp <= 0 && !state.isGameOverTriggered) {
          state.isGameOverTriggered = true;
          onGameOver();
        }
      }
    } else {
      /*
      // Near Miss Check
      // DISABLED: User requested to turn off the tension effect as it interrupts flow
      // Only check if no collision, player not invincible, and global cooldown ready
      if (false && !enemy.hasTriggeredNearMiss && state.nearMissCooldown <= 0 && !this.ctx.cheat.isGodMode()) {
        const nearMissDist = combinedRadius + this.ctx.constants.NEAR_MISS_THRESHOLD;
        if (distSq < nearMissDist * nearMissDist) {
          enemy.hasTriggeredNearMiss = true;
          EventBus.emit('nearMiss', { enemyType: enemy.type });
        }
      }
      */
    }
  }

  private static processBulletCollisions(
    pool: PoolManager,
    enemy: Enemy,
    player: Player,
    state: GameState,
    dtFactor: number,
    particleMultiplier: number
  ): void {
    const nearbyBullets = this.ctx.bulletGrid.getNearby(enemy.x, enemy.y);

    for (const bullet of nearbyBullets) {
      if (!enemy.active || !bullet.active) continue;

      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const distSq = dx * dx + dy * dy;
      const combinedRadius = enemy.radius + bullet.radius;

      if (distSq < combinedRadius * combinedRadius) {
        this.resolveBulletHit(pool, enemy, bullet, player, state, dtFactor, particleMultiplier);
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
    particleMultiplier: number
  ): void {
    enemy.health -= bullet.damage;
    bullet.active = false;

    // Effects
    this.spawnImpactParticles(pool, bullet, particleMultiplier);
    this.applyKnockback(enemy, bullet, dtFactor);
    this.triggerCritEffects(bullet, enemy, state);
    this.spawnDamageText(pool, enemy, bullet);

    // Hit Stop - freeze frame for impact feel
    const isCrit = bullet.isCrit || bullet.isSuperCrit;
    EventBus.emit('hitStop', {
      duration: isCrit ? this.ctx.constants.HIT_STOP_CRIT : this.ctx.constants.HIT_STOP_NORMAL,
      isCrit: !!isCrit,
    });

    if (enemy.health <= 0) {
      CombatResolutionService.handleEnemyDeath(pool, enemy, player, !!bullet.isSuperCrit);
    }
  }

  private static applyKnockback(enemy: Enemy, bullet: Bullet, dtFactor: number): void {
    const strength = 4;
    enemy.x += (bullet.vx / this.ctx.constants.BULLET_SPEED) * strength * dtFactor;
    enemy.y += (bullet.vy / this.ctx.constants.BULLET_SPEED) * strength * dtFactor;
  }

  private static triggerCritEffects(bullet: Bullet, enemy: Enemy, state: GameState): void {
    if (bullet.isCrit || bullet.isSuperCrit) {
      state.critFlash = bullet.isSuperCrit ? 0.15 : 0.08;
      state.critFlashColor = bullet.isSuperCrit ? physicsColors.SUPER_CRIT : physicsColors.CRIT;
      this.ctx.audio.playCrit();

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
      ? physicsColors.CASINO_RED
      : bullet.isCrit
        ? physicsColors.CASINO_GOLD
        : physicsColors.SLOT_SILVER;

    const size = bullet.isSuperCrit ? 36 : bullet.isCrit ? 28 : 20;

    const text = StatService.formatCompact(bullet.damage);
    if (!text) return;

    pool.getFloatingText(enemy.x + (Math.random() - 0.5) * 10, enemy.y - 20, text, color, size);
  }

  private static spawnImpactParticles(
    pool: PoolManager,
    bullet: Bullet,
    particleMultiplier: number
  ): void {
    const impactCfg = this.ctx.particles.impact;
    const count = Math.round(impactCfg.count * particleMultiplier);

    for (let i = 0; i < count; i++) {
      pool.getParticle(
        bullet.x,
        bullet.y,
        (Math.random() - 0.5) * impactCfg.speed,
        (Math.random() - 0.5) * impactCfg.speed,
        bullet.isSuperCrit ? physicsColors.SUPER_CRIT : bullet.color
      ).life = impactCfg.life;
    }
  }
}
