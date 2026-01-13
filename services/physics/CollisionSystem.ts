import { type IPoolManager } from '../interfaces/IPoolManager';
import { type Player, type GameState, type Enemy, type Bullet } from '../../types';
import { type IPhysicsContext } from './PhysicsTypes';
import { getPhysicsContext, physicsColors } from './PhysicsContext';
import { EventBus } from '../EventBus';
import { CombatResolutionService } from './CombatResolutionService';
import { StatService } from '../StatService';
import { ThemeService } from '../ThemeService';
import { type ICollisionSystem } from '../interfaces/IPhysicsSubsystems';
import { GAME_ENGINE } from '../../constants';

/**
 * CollisionSystem - Physical Interaction Orchestrator
 *
 * Responsibilities:
 * 1. Screen boundaries vs Enemies
 * 2. Player vs Enemy contact (damage, dodge, armor)
 * 3. Bullet vs Enemy impact (spatial grid lookup, damage, knockback)
 * 4. Damage buffering (combining many small hits into one floating text)
 * 5. Impact visual/audio feedback (particles, screenshake, sounds)
 */
export class CollisionSystem implements ICollisionSystem {
  private ctx: IPhysicsContext;
  private nearbyBulletsBuffer: Bullet[] = [];

  constructor(context: IPhysicsContext = getPhysicsContext()) {
    this.ctx = context;
  }

  /**
   * Set a custom context (useful for testing/dependency injection)
   */
  public setContext(context: IPhysicsContext): void {
    this.ctx = context;
  }

  /**
   * Reset to default singleton context
   */
  public resetContext(): void {
    this.ctx = getPhysicsContext();
  }

  /**
   * Primary update loop for enemy-related collisions.
   *
   * @param pool - Access to game entity pools
   * @param player - Current player state
   * @param state - Global game engine state
   * @param dtFactor - Frame-level time scaling factor
   * @param width - Active canvas width
   * @param height - Active canvas height
   * @param onGameOver - Callback triggered on player death
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
      // Skip dead/vanishing enemies
      if (enemy.isDying) {
        return;
      }

      // 1. Boundary Check (Culling)
      if (this.isOffScreen(enemy, width, height)) {
        enemy.active = false;
        return;
      }

      // 2. Track Screen Entry for Spawn Animations
      if (!enemy.hasEnteredScreen) {
        const onScreen =
          enemy.x > -enemy.radius &&
          enemy.x < width + enemy.radius &&
          enemy.y > -enemy.radius &&
          enemy.y < height + enemy.radius;

        if (onScreen) {
          enemy.hasEnteredScreen = true;
          enemy.spawnTimer = GAME_ENGINE.SPAWN_ANIMATION_INITIAL;
        }
      }

      // 3. Decrement Animation Timers
      if (
        enemy.hasEnteredScreen &&
        enemy.spawnTimer !== undefined &&
        enemy.spawnTimer > 0
      ) {
        enemy.spawnTimer -= GAME_ENGINE.COLLISION_SPAWN_TIMER_DEC * dtFactor;
      }

      // 4. Damage Buffer Decay (Prevents UI clutter from multiple rapid hits)
      if (enemy.damageBufferTimer !== undefined && enemy.damageBufferTimer > 0) {
        enemy.damageBufferTimer -= dtFactor;
        if (enemy.damageBufferTimer <= 0) {
          this.flushDamageBuffer(pool, enemy);
        }
      }

      // 5. Interaction Checks
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

  /**
   * Determines if an enemy is far enough outside the play area to be culled.
   */
  private isOffScreen(enemy: Enemy, width: number, height: number): boolean {
    const threshold = this.ctx.constants.ENEMY_OFFSCREEN_THRESHOLD;
    return (
      enemy.x < -threshold ||
      enemy.x > width + threshold ||
      enemy.y < -threshold ||
      enemy.y > height + threshold
    );
  }

  /**
   * Handles contact between Player and Enemy.
   * Calculates Dodge, Armor reduction, and HP depletion.
   */
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

    // Radius-based collision check
    if (distSq < combinedRadius * combinedRadius) {
      // Skill Check: Invulnerable during Dash or if God Mode enabled
      if (!this.ctx.cheat.isGodMode() && !state.isDashing) {
        // A. Dodge Check
        const rawDodge = this.ctx.stats.getDodge(player);
        const dodgeChance = Math.min(rawDodge, this.ctx.statCaps.MAX_DODGE);

        if (Math.random() < dodgeChance) {
          pool.getFloatingText(
            player.x,
            player.y - GAME_ENGINE.COLLISION_TEXT_OFFSET_Y,
            'DODGE!',
            physicsColors.BULLET,
            GAME_ENGINE.DODGE_INDICATOR_SIZE
          );
          return;
        }

        // B. Armor & Damage Calculation
        const rawArmor = this.ctx.stats.getArmor(player);
        const effectiveArmor = Math.min(rawArmor, this.ctx.statCaps.MAX_ARMOR);

        // Diminishing returns formula for armor
        const armorReduction =
          effectiveArmor / (effectiveArmor + GAME_ENGINE.ARMOR_RESISTANCE_FACTOR);

        const damageMultiplier = Math.max(
          GAME_ENGINE.DAMAGE_MINIMUM_MULTIPLIER,
          GAME_ENGINE.DAMAGE_REDUCTION_BASE * (1 - armorReduction)
        );

        // Apply HP loss (scaled by frame time)
        player.hp -= damageMultiplier * dtFactor;
        player.hp = Math.max(0, player.hp);

        // Visual Feedback
        state.shake = GAME_ENGINE.PLAYER_HIT_SHAKE;

        // Audio Feedback (Randomized to avoid spam/phasing)
        if (Math.random() > GAME_ENGINE.HIT_SOUND_PROBABILITY) {
          this.ctx.audio.playHit();
        }

        // Game Over Check
        if (player.hp <= 0 && !state.isGameOverTriggered) {
          state.isGameOverTriggered = true;
          onGameOver();
        }
      }
    }
  }

  /**
   * Spatial grid assisted collision check for bullets near a specific enemy.
   */
  private processBulletCollisions(
    pool: IPoolManager,
    enemy: Enemy,
    player: Player,
    state: GameState,
    dtFactor: number,
    particleMultiplier: number
  ): void {
    // Optimization: Only check bullets in the same spatial cell
    // Use shared buffer to avoid array allocation
    const nearbyBullets = this.ctx.bulletGrid.getNearby(enemy.x, enemy.y, this.nearbyBulletsBuffer);

    for (const bullet of nearbyBullets) {
      if (!enemy.active || !bullet.active) {
        continue;
      }

      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const distSq = dx * dx + dy * dy;
      const combinedRadius = enemy.radius + bullet.radius;

      if (distSq < combinedRadius * combinedRadius) {
        this.resolveBulletHit(
          pool,
          enemy,
          bullet,
          player,
          state,
          dtFactor,
          particleMultiplier
        );
      }
    }
  }

  /**
   * Applies damage, knockback, and triggers visual effects on bullet impact.
   */
  private resolveBulletHit(
    pool: IPoolManager,
    enemy: Enemy,
    bullet: Bullet,
    player: Player,
    state: GameState,
    dtFactor: number,
    particleMultiplier: number
  ): void {
    // Apply Damage
    enemy.health -= bullet.damage;
    bullet.active = false;

    // Visual/Physics Feedback
    this.spawnImpactParticles(pool, bullet, particleMultiplier);
    this.applyKnockback(enemy, bullet, dtFactor);
    this.triggerCritEffects(bullet, enemy, state);
    this.bufferDamage(enemy, bullet);

    // Hit Stop Effect (Only on Crits/Super Crits to maintain flow)
    if (bullet.isCrit || bullet.isSuperCrit) {
      EventBus.emit('hitStop', {
        duration: bullet.isSuperCrit
          ? this.ctx.constants.HIT_STOP_CRIT
          : this.ctx.constants.HIT_STOP_NORMAL, // "Normal" stop for standard crits
        isCrit: true,
      });
    }

    // Death Check
    if (enemy.health <= 0) {
      this.flushDamageBuffer(pool, enemy);
      CombatResolutionService.handleEnemyDeath(
        pool,
        enemy,
        player,
        !!bullet.isSuperCrit
      );
    }
  }

  /**
   * Pushes enemy away from the point of impact.
   */
  private applyKnockback(enemy: Enemy, bullet: Bullet, dtFactor: number): void {
    const strength = GAME_ENGINE.KNOCKBACK_STRENGHT;
    // Normalize relative velocity to apply consistent push force
    enemy.x += (bullet.vx / this.ctx.constants.BULLET_SPEED) * strength * dtFactor;
    enemy.y += (bullet.vy / this.ctx.constants.BULLET_SPEED) * strength * dtFactor;
  }

  /**
   * Handles flash and audio for critical hits.
   */
  private triggerCritEffects(bullet: Bullet, enemy: Enemy, state: GameState): void {
    if (bullet.isCrit || bullet.isSuperCrit) {
      state.critFlash = bullet.isSuperCrit ? 0.15 : 0.08;
      state.critFlashColor = bullet.isSuperCrit
        ? physicsColors.SUPER_CRIT
        : physicsColors.CRIT;
      this.ctx.audio.playCrit();

      EventBus.emit('critHit', {
        damage: bullet.damage,
        isSuperCrit: !!bullet.isSuperCrit,
        x: enemy.x,
        y: enemy.y,
      });
    }
  }

  /**
   * Accumulates damage onto an enemy to show a combined number later.
   */
  private bufferDamage(enemy: Enemy, bullet: Bullet): void {
    enemy.damageBuffer = (enemy.damageBuffer ?? 0) + bullet.damage;
    enemy.damageBufferTimer = GAME_ENGINE.DAMAGE_BUFFER_TIMER_DEFAULT;

    // Preserve the highest crit tier for the coloring
    if (bullet.isSuperCrit) {
      enemy.damageBufferIsSuperCrit = true;
    } else if (bullet.isCrit && !enemy.damageBufferIsSuperCrit) {
      enemy.damageBufferIsCrit = true;
    }
  }

  /**
   * Converts accumulated damage into a single on-screen floating text.
   */
  private flushDamageBuffer(pool: IPoolManager, enemy: Enemy): void {
    if (!enemy.damageBuffer || enemy.damageBuffer <= 0) {
      return;
    }

    const isSuperCrit = !!enemy.damageBufferIsSuperCrit;
    const isCrit = !!enemy.damageBufferIsCrit;

    // Pick color based on highest hit tier
    const color = isSuperCrit
      ? physicsColors.CASINO_RED
      : isCrit
        ? physicsColors.CASINO_GOLD
        : physicsColors.SLOT_SILVER;

    const size = isSuperCrit
      ? GAME_ENGINE.DAMAGE_TEXT_SIZE_SUPER_CRIT
      : isCrit
        ? GAME_ENGINE.DAMAGE_TEXT_SIZE_CRIT
        : GAME_ENGINE.DAMAGE_TEXT_SIZE_NORMAL;

    const text = StatService.formatCompact(enemy.damageBuffer);

    if (text) {
      pool.getFloatingText(
        enemy.x + (Math.random() - 0.5) * GAME_ENGINE.DAMAGE_STACK_THRESHOLD_RANDOM,
        enemy.y - GAME_ENGINE.COLLISION_TEXT_OFFSET_Y,
        text,
        color,
        size
      );
    }

    // Reset buffer state
    enemy.damageBuffer = 0;
    enemy.damageBufferTimer = 0;
    enemy.damageBufferIsCrit = false;
    enemy.damageBufferIsSuperCrit = false;
  }

  /**
   * Spawns cosmetic particles at the impact site.
   */
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
