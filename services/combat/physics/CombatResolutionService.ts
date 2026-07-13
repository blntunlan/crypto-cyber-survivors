import { type IPoolManager } from '../../interfaces/IPoolManager';
import { type Player, type Enemy } from '../../../types';
import { EventBus } from '../../core/EventBus';
import { DeviceBenchmarkService } from '../../system/DeviceBenchmarkService';
import { GAME_ENGINE } from '../../../constants';
import { COLORS, COMBAT_CONFIG, ECONOMY_CONFIG, PLAYER_STATS } from '../../../config';
import { BuffManager } from '../../patterns/decorators/BuffManager';
import { Logger } from '../../system/Logger';
import { ThemeService } from '../../system/ThemeService';
// import { BuffGemSpawner } from '../../spawners/BuffGemSpawner';
import { difficultyContext } from '../../difficulty/DifficultyContext';
import { EliteAbilitySystem } from '../EliteAbilitySystem';

/**
 * CombatResolutionService - Logic engine for processing combat outcomes.
 *
 * Responsibilities:
 * 1. Enemy Lifecycle: Handling death triggers, animation starts, and deactivation.
 * 2. Rewards System: Calculating Luck-based gem drops (base vs rare vs bonus).
 * 3. Player Mechanics: Lifesteal probability and health restoration logic.
 * 4. Physics Effects: Area-of-effect shockwaves and momentum-based pushbacks.
 * 5. Event Dispatch: Notifying the system of kills, heals, and level-ups.
 */
export class CombatResolutionService {
  /**
   * Finalizes an enemy's active state and initiates reward processing.
   *
   * @param pool - Access to entity pools for gem/particle spawning
   * @param enemy - The enemy instance being defeated
   * @param player - Current player state for stats-based reward scaling
   * @param isSuperCrit - Whether the final blow was a super-critical hit
   */
  public static handleEnemyDeath(
    pool: IPoolManager,
    enemy: Enemy,
    player: Player,
    isSuperCrit: boolean = false
  ): void {
    // 1. Animation State: Instead of immediate removal, start the "death pop" visual
    enemy.isDying = true;
    enemy.deathProgress = 0;

    // 3. System Notification
    EventBus.emit('enemyKilled', {
      x: enemy.x,
      y: enemy.y,
      type: enemy.type,
      enemyId: enemy.id,
      isCrit: isSuperCrit,
    });

    // 3b. Elite death abilities
    if (enemy.isElite) {
      EliteAbilitySystem.getInstance().onEliteDeath(enemy, pool);
    }

    // 4. Reward Generation
    this.spawnDeathParticles(pool, enemy, isSuperCrit);
    this.spawnDeathRing(pool, enemy, isSuperCrit);
    this.spawnGemForEnemy(pool, enemy, player);
    this.processLifesteal(player, enemy);
    // this.spawnRSIBuffForEnemy(enemy); // Removed as per user request (random spawn only)
  }

  /**
   * Applies a directional shockwave that displaces all enemies.
   * Typically triggered by high-volatility market events.
   *
   * @param pool - Pool manager to access all active enemies
   * @param intensity - Strength multiplier for the push force
   */
  public static triggerShockwave(pool: IPoolManager, intensity: number): void {
    const force = COMBAT_CONFIG.SHOCKWAVE.BASE_FORCE * intensity;

    // ⚡ Bolt: Standard for loop avoids closure allocation overhead in hot path
    const enemies = pool.activeEnemies;
    for (let i = 0, len = enemies.length; i < len; i++) {
      const enemy = enemies[i];
      if (enemy === undefined) continue;

      // Calculate repulsion vector (randomized for "chaos" feel, usually relative to screen center)
      const angle = Math.random() * Math.PI * 2;
      enemy.x += Math.cos(angle) * force;
      enemy.y += Math.sin(angle) * force;

      // Apply stagger visual (re-uses spawn animation timer)
      enemy.spawnTimer = COMBAT_CONFIG.SHOCKWAVE.STAGGER_DURATION;
    }

    Logger.info(`[Shockwave] Applied pushback to ${pool.activeEnemies.length} enemies`);
  }

  /**
   * Calculates and applies health restoration on successful kill.
   */
  private static processLifesteal(player: Player, enemy: Enemy): void {
    // Dynamic Stat Resolution: Use BuffManager if available, fallback to raw player stats
    const lifesteal = BuffManager.isInitialized()
      ? BuffManager.getDecoratedStats().getLifesteal()
      : player.lifesteal;

    if (lifesteal <= 0) {
      return;
    }

    const roll = Math.random();
    const cappedLifesteal = Math.min(lifesteal, PLAYER_STATS.MAX_LIFESTEAL);

    if (roll < cappedLifesteal) {
      // Scale heal amount based on enemy difficulty (Whales provide more "liquidity")
      const healBase =
        enemy.type === 'whale'
          ? COMBAT_CONFIG.LIFESTEAL.HEAL_AMOUNT_WHALE
          : COMBAT_CONFIG.LIFESTEAL.HEAL_AMOUNT_NORMAL;

      const newHp = Math.min(player.hp + healBase, player.maxHp);
      const actualHeal = Math.round(newHp - player.hp);

      player.hp = newHp;

      if (actualHeal > 0) {
        EventBus.emit('playerHealed', {
          amount: actualHeal,
          x: player.x,
          y: player.y - 20, // Offset for UI clarity
          source: 'lifesteal',
        });

        EventBus.emit('playerHealthChange', {
          hpPercent: (player.hp / player.maxHp) * 100,
          hp: player.hp,
          maxHp: player.maxHp,
        });

        Logger.debug(`[Lifesteal] Proc! Healed ${actualHeal} HP`);
      }
    }
  }

  /**
   * Spawns cosmetic fragments at the site of enemy destruction.
   */
  private static spawnDeathParticles(
    pool: IPoolManager,
    enemy: Enemy,
    isSuperCrit: boolean
  ): void {
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
    const isRetro = ThemeService.isRetro();

    // Particle count scales with hit quality and hardware performance
    const baseCount = isSuperCrit
      ? COMBAT_CONFIG.DEATH_PARTICLES.SUPER_CRIT_COUNT
      : COMBAT_CONFIG.DEATH_PARTICLES.NORMAL_COUNT;

    const count = Math.round(baseCount * perfConfig.particleMultiplier);
    const velocityRange = COMBAT_CONFIG.DEATH_PARTICLES.VELOCITY_RANGE;

    // Retro Theme: Distinctive 8-way burst + Center filler (Cardinals & Diagonals)
    if (isRetro) {
      const directions = 8;
      // Fixed speed for uniform "pixel art explosion" look
      const speed = velocityRange * 0.7;

      for (let k = 0; k < directions; k++) {
        const angle = (k / directions) * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        pool.getParticle(enemy.x, enemy.y, vx, vy, enemy.color, true);
      }

      // Add a few bright center pixels for impact
      for (let k = 0; k < 4; k++) {
        const vx = (Math.random() - 0.5) * speed * 0.5;
        const vy = (Math.random() - 0.5) * speed * 0.5;
        pool.getParticle(enemy.x, enemy.y, vx, vy, '#FFFFFF', true);
      }
    } else {
      // Modern Theme: Organic/Chaotic particle spread
      for (let k = 0; k < count; k++) {
        const vx = (Math.random() - 0.5) * velocityRange;
        const vy = (Math.random() - 0.5) * velocityRange;

        pool.getParticle(enemy.x, enemy.y, vx, vy, enemy.color, false);
      }
    }
  }

  private static spawnDeathRing(
    pool: IPoolManager,
    enemy: Enemy,
    isSuperCrit: boolean
  ): void {
    const maxRadius =
      enemy.type === 'whale'
        ? GAME_ENGINE.KILL_RING_RADIUS_WHALE
        : isSuperCrit
          ? GAME_ENGINE.KILL_RING_RADIUS_CRIT
          : GAME_ENGINE.KILL_RING_RADIUS_NORMAL;
    const lineWidth = isSuperCrit
      ? GAME_ENGINE.KILL_RING_LINE_WIDTH_CRIT
      : GAME_ENGINE.KILL_RING_LINE_WIDTH_NORMAL;
    const color = isSuperCrit ? COLORS.SUPER_CRIT : enemy.color;

    pool.getImpactRing(
      enemy.x,
      enemy.y,
      GAME_ENGINE.KILL_RING_START_RADIUS,
      maxRadius,
      color,
      lineWidth
    );
  }

  /**
   * Rewards player with experience gems. Implements complex Luck-based logic.
   *
   * Features:
   * - Rare Gem scaling: Increased base value + Luck multiplier.
   * - Leverage bonus: Difficulty-based multiplier (PnL momentum).
   * - Bonus Gem spawns: Extra gem drops for high-luck builds.
   */
  private static spawnGemForEnemy(
    pool: IPoolManager,
    enemy: Enemy,
    player: Player
  ): void {
    const { GEMS, LUCK } = ECONOMY_CONFIG;
    const inputs = difficultyContext.inputs;
    const leverage = inputs.leverage;

    // Stat Resolution with systemic caps
    const rawLuck = BuffManager.isInitialized()
      ? BuffManager.getDecoratedStats().getLuck()
      : player.luck;
    const luck = Math.min(rawLuck, PLAYER_STATS.MAX_LUCK);

    // 1. Rare Gem Determination (RSI enemies always drop rare 'coins')
    const rareChance = Math.min(
      LUCK.MAX_RARE_CHANCE,
      LUCK.BASE_RARE_CHANCE + luck * LUCK.RARE_CHANCE_PER_LUCK
    );
    const isRare = Math.random() < rareChance || enemy.type === 'rsi';

    // 2. Value Calculation
    const baseVal =
      enemy.type === 'whale'
        ? GEMS.BASE_VALUE_WHALE
        : enemy.type === 'rsi'
          ? GEMS.BASE_VALUE_NORMAL * 5
          : GEMS.BASE_VALUE_NORMAL;
    const luckValueBonus = 1 + luck * LUCK.VALUE_BONUS_PER_LUCK;
    const rareMultiplier = isRare ? GEMS.RARE_MULTIPLIER : 1;
    const leverageMultiplier = 1;

    // Apply elite/whale value multiplier
    const eliteMultiplier = enemy.valueMultiplier ?? 1;

    // Final integer XP value
    const finalValue = Math.floor(
      baseVal * rareMultiplier * luckValueBonus * leverageMultiplier * eliteMultiplier
    );

    // Primary Gem Spawn
    const lerpSize =
      leverage >= 50 ? GEMS.RARE_SIZE : isRare ? GEMS.RARE_SIZE : GEMS.NORMAL_SIZE;

    pool.getGem(
      enemy.x,
      enemy.y,
      finalValue,
      lerpSize,
      isRare ? COLORS.RARE_GEM : COLORS.GEM,
      isRare
    );

    // 3. Bonus Gem Logic (Luck Proc)
    const bonusGemChance = Math.min(
      LUCK.MAX_BONUS_GEM_CHANCE,
      luck * LUCK.BONUS_GEM_CHANCE_PER_LUCK
    );

    if (Math.random() < bonusGemChance) {
      const bonusValue = Math.floor(
        baseVal * LUCK.BONUS_VALUE_MULTIPLIER * luckValueBonus
      );

      // Spawn smaller bonus gem with slight spatial jitter
      pool.getGem(
        enemy.x + (Math.random() - 0.5) * GEMS.BONUS_OFFSET,
        enemy.y + (Math.random() - 0.5) * GEMS.BONUS_OFFSET,
        bonusValue,
        GEMS.BONUS_SIZE,
        COLORS.GEM,
        false
      );
    }
  }
}
