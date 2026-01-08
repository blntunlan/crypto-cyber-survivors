import { type IPoolManager } from '../interfaces/IPoolManager';
import { type Player, type GameState, type Enemy, type Bullet } from '../../types';
import { type IPhysicsContext } from './PhysicsTypes';
import { getPhysicsContext, physicsColors } from './PhysicsContext';
import { EventBus } from '../EventBus';
import { CombatResolutionService } from './CombatResolutionService';
import { StatService } from '../StatService';
import { ThemeService } from '../ThemeService';
import { type ICollisionSystem } from '../interfaces/IPhysicsSubsystems';

/**
 * CollisionSystem - Handles physical interactions between high-level entities.
 */
export class CollisionSystem implements ICollisionSystem {
  private ctx: IPhysicsContext;

  constructor(context: IPhysicsContext = getPhysicsContext()) {
    this.ctx = context;
  }

  /**
   * Set a custom context (for testing)
   */
  public setContext(context: IPhysicsContext): void {
    this.ctx = context;
  }

  /**
   * Reset to default context
   */
  public resetContext(): void {
    this.ctx = getPhysicsContext();
  }

  /**
   * Run all collision checks for regular enemies.
   */
  public update(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    dtFactor: number,
    width: number,
    height: number,
    onGameOver: () => void
  ): void {
    const perfConfig = this.ctx.performance.getPerformanceConfig();

    pool.activeEnemies.forEach(enemy => {
      if (enemy.isDying) return;

      const enemyWithBehavior = enemy as unknown as EnemyWithBehavior;

      if (this.isOffScreen(enemy, width, height)) {
        enemy.active = false;
        return;
      }

      // Track screen entry for spawn animations/logic
      if (!enemy.hasEnteredScreen) {
        const onScreen =
          enemy.x > -enemy.radius &&
          enemy.x < width + enemy.radius &&
          enemy.y > -enemy.radius &&
          enemy.y < height + enemy.radius;

        if (onScreen) {
          enemy.hasEnteredScreen = true;
          enemy.spawnTimer = 1.0;
        }
      }

      if (enemy.hasEnteredScreen && enemy.spawnTimer > 0) {
        enemy.spawnTimer -= 0.1 * dtFactor;
      }

      if (enemy.damageBufferTimer !== undefined && enemy.damageBufferTimer > 0) {
        enemy.damageBufferTimer -= dtFactor;
        if (enemy.damageBufferTimer <= 0) {
          this.flushDamageBuffer(pool, enemy);
        }
      }

      // Enemy movement is handled by MovementSystem, do not move here
      this.checkPlayerEnemyCollision(pool, player, enemy, state, dtFactor, onGameOver);
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

  private isOffScreen(enemy: Enemy, width: number, height: number): boolean {
    const threshold = this.ctx.constants.ENEMY_OFFSCREEN_THRESHOLD;
    return (
      enemy.x < -threshold ||
      enemy.x > width + threshold ||
      enemy.y < -threshold ||
      enemy.y > height + threshold
    );
  }

  private checkPlayerEnemyCollision(
    pool: IPoolManager,
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
        const rawDodge = this.ctx.stats.getDodge(player);
        const dodgeChance = Math.min(rawDodge, this.ctx.statCaps.MAX_DODGE);

        if (Math.random() < dodgeChance) {
          pool.getFloatingText(player.x, player.y - 20, 'DODGE!', physicsColors.BULLET, 16);
          return;
        }

        const rawArmor = this.ctx.stats.getArmor(player);
        const effectiveArmor = Math.min(rawArmor, this.ctx.statCaps.MAX_ARMOR);
        const armorReduction = effectiveArmor / (effectiveArmor + 10);
        const damageMultiplier = Math.max(0.1, 0.8 * (1 - armorReduction));

        player.hp -= damageMultiplier * dtFactor;
        player.hp = Math.max(0, player.hp);
        state.shake = 10;

        if (Math.random() > 0.9) this.ctx.audio.playHit();

        if (player.hp <= 0 && !state.isGameOverTriggered) {
          state.isGameOverTriggered = true;
          onGameOver();
        }
      }
    }
  }

  private processBulletCollisions(
    pool: IPoolManager,
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

  private resolveBulletHit(
    pool: IPoolManager,
    enemy: Enemy,
    bullet: Bullet,
    player: Player,
    state: GameState,
    dtFactor: number,
    particleMultiplier: number
  ): void {
    enemy.health -= bullet.damage;
    bullet.active = false;

    this.spawnImpactParticles(pool, bullet, particleMultiplier);
    this.applyKnockback(enemy, bullet, dtFactor);
    this.triggerCritEffects(bullet, enemy, state);
    this.bufferDamage(enemy, bullet);

    const isCrit = bullet.isCrit || bullet.isSuperCrit;
    EventBus.emit('hitStop', {
      duration: isCrit ? this.ctx.constants.HIT_STOP_CRIT : this.ctx.constants.HIT_STOP_NORMAL,
      isCrit: !!isCrit,
    });

    if (enemy.health <= 0) {
      this.flushDamageBuffer(pool, enemy);
      CombatResolutionService.handleEnemyDeath(pool, enemy, player, !!bullet.isSuperCrit);
    }
  }

  private applyKnockback(enemy: Enemy, bullet: Bullet, dtFactor: number): void {
    const strength = 4;
    enemy.x += (bullet.vx / this.ctx.constants.BULLET_SPEED) * strength * dtFactor;
    enemy.y += (bullet.vy / this.ctx.constants.BULLET_SPEED) * strength * dtFactor;
  }

  private triggerCritEffects(bullet: Bullet, enemy: Enemy, state: GameState): void {
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

  private bufferDamage(enemy: Enemy, bullet: Bullet): void {
    enemy.damageBuffer = (enemy.damageBuffer ?? 0) + bullet.damage;
    enemy.damageBufferTimer = 6;

    if (bullet.isSuperCrit) {
      enemy.damageBufferIsSuperCrit = true;
    } else if (bullet.isCrit && !enemy.damageBufferIsSuperCrit) {
      enemy.damageBufferIsCrit = true;
    }
  }

  private flushDamageBuffer(pool: IPoolManager, enemy: Enemy): void {
    if (!enemy.damageBuffer || enemy.damageBuffer <= 0) return;

    const isSuperCrit = !!enemy.damageBufferIsSuperCrit;
    const isCrit = !!enemy.damageBufferIsCrit;

    const color = isSuperCrit
      ? physicsColors.CASINO_RED
      : isCrit
        ? physicsColors.CASINO_GOLD
        : physicsColors.SLOT_SILVER;

    const size = isSuperCrit ? 36 : isCrit ? 28 : 20;
    const text = StatService.formatCompact(enemy.damageBuffer);

    if (text) {
      pool.getFloatingText(enemy.x + (Math.random() - 0.5) * 10, enemy.y - 20, text, color, size);
    }

    enemy.damageBuffer = 0;
    enemy.damageBufferTimer = 0;
    enemy.damageBufferIsCrit = false;
    enemy.damageBufferIsSuperCrit = false;
  }

  private spawnImpactParticles(
    pool: IPoolManager,
    bullet: Bullet,
    particleMultiplier: number
  ): void {
    const impactCfg = this.ctx.particles.impact;
    const count = Math.round(impactCfg.count * particleMultiplier);
    const isRetro = ThemeService.isRetro();

    for (let i = 0; i < count; i++) {
      pool.getParticle(
        bullet.x,
        bullet.y,
        (Math.random() - 0.5) * impactCfg.speed,
        (Math.random() - 0.5) * impactCfg.speed,
        bullet.isSuperCrit ? physicsColors.SUPER_CRIT : bullet.color,
        isRetro
      ).life = impactCfg.life;
    }
  }
}
