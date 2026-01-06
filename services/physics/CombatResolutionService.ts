import { type PoolManager } from '../PoolManager';
import { type Player, type Enemy } from '../../types';
import { DifficultyManager } from '../DifficultyManager';
import { EventBus } from '../EventBus';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { COLORS } from '../../constants';
import { PLAYER_STATS } from '../../config/PlayerConfig';
import { COMBAT_CONFIG } from '../../config/CombatConfig';
import { BuffManager } from '../patterns/decorators/BuffManager';
import { Logger } from '../Logger';

/**
 * CombatResolutionService - Pure logic for resolving combat events.
 * Handles entity death rewards, lifesteal, and gem drops.
 *
 * Stat Effects:
 * - Luck: Increases rare gem chance and can spawn bonus gems
 * - Lifesteal: % chance to heal player on enemy kill
 */
export class CombatResolutionService {
  /**
   * Handle enemy death: cleanup, record kill, spawn rewards and effects.
   */
  public static handleEnemyDeath(
    pool: PoolManager,
    enemy: Enemy,
    player: Player,
    isSuperCrit: boolean = false
  ): void {
    // Start death animation instead of immediately deactivating
    enemy.isDying = true;
    enemy.deathProgress = 0;

    DifficultyManager.recordKill();

    EventBus.emit('enemyKilled', {
      x: enemy.x,
      y: enemy.y,
      type: enemy.type,
      isCrit: isSuperCrit,
    });

    this.spawnDeathParticles(pool, enemy, isSuperCrit);
    this.spawnGemForEnemy(pool, enemy, player);
    this.processLifesteal(player, enemy);
  }

  /**
   * Apply a massive knockback to all enemies (Volatility Shockwave)
   */
  public static triggerShockwave(pool: PoolManager, intensity: number): void {
    const force = COMBAT_CONFIG.SHOCKWAVE.BASE_FORCE * intensity;

    pool.activeEnemies.forEach(enemy => {
      // Direct push away from center of screen (usually where player is)
      // For now, just pushed away from player current position
      const angle = Math.random() * Math.PI * 2;
      enemy.x += Math.cos(angle) * force;
      enemy.y += Math.sin(angle) * force;

      // Visual feedback on enemy
      enemy.spawnTimer = COMBAT_CONFIG.SHOCKWAVE.STAGGER_DURATION;
    });

    Logger.info(`[Shockwave] Applied pushback to ${pool.activeEnemies.length} enemies`);
  }

  /**
   * Process lifesteal mechanic - % chance to heal on kill.
   */
  private static processLifesteal(player: Player, enemy: Enemy): void {
    // Get effective lifesteal from BuffManager if available
    const lifesteal = BuffManager.isInitialized()
      ? BuffManager.getDecoratedStats().getLifesteal()
      : player.lifesteal;

    // Skip if no lifesteal
    if (lifesteal <= 0) return;

    // Roll for lifesteal proc
    const roll = Math.random();
    const cappedLifesteal = Math.min(lifesteal, PLAYER_STATS.MAX_LIFESTEAL);

    if (roll < cappedLifesteal) {
      // Heal amount based on enemy type
      const healAmount =
        enemy.type === 'whale'
          ? COMBAT_CONFIG.LIFESTEAL.HEAL_AMOUNT_WHALE
          : COMBAT_CONFIG.LIFESTEAL.HEAL_AMOUNT_NORMAL;
      const newHp = Math.min(player.hp + healAmount, player.maxHp);
      const actualHeal = Math.round(newHp - player.hp); // Round to avoid floating point display issues
      player.hp = newHp;

      if (actualHeal > 0) {
        // Emit event for visual feedback
        EventBus.emit('playerHealed', {
          amount: actualHeal,
          x: player.x,
          y: player.y - 20,
          source: 'lifesteal',
        });

        Logger.debug(
          `[Lifesteal] Healed ${actualHeal} HP (${(cappedLifesteal * 100).toFixed(0)}% chance)`
        );
      }
    }
  }

  private static spawnDeathParticles(pool: PoolManager, enemy: Enemy, isSuperCrit: boolean): void {
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
    const baseCount = isSuperCrit
      ? COMBAT_CONFIG.PARTICLES.SUPER_CRIT_COUNT
      : COMBAT_CONFIG.PARTICLES.NORMAL_COUNT;
    const count = Math.round(baseCount * perfConfig.particleMultiplier);
    const velocityRange = COMBAT_CONFIG.PARTICLES.VELOCITY_RANGE;

    for (let k = 0; k < count; k++) {
      pool.getParticle(
        enemy.x,
        enemy.y,
        (Math.random() - 0.5) * velocityRange,
        (Math.random() - 0.5) * velocityRange,
        enemy.color
      );
    }
  }

  /**
   * Spawn gems with luck-based bonuses.
   *
   * Luck Effects:
   * - Base 5% rare gem chance + 3% per luck point
   * - 10% per luck point chance for bonus gem
   */
  private static spawnGemForEnemy(pool: PoolManager, enemy: Enemy, player: Player): void {
    const { GEMS, LUCK } = COMBAT_CONFIG;

    // Get effective luck from BuffManager if available, with system-level cap
    const rawLuck = BuffManager.isInitialized()
      ? BuffManager.getDecoratedStats().getLuck()
      : player.luck;
    const luck = Math.min(rawLuck, PLAYER_STATS.MAX_LUCK);

    // Rare gem chance: base + per-luck bonus (capped)
    const rareChance = Math.min(
      LUCK.MAX_RARE_CHANCE,
      LUCK.BASE_RARE_CHANCE + luck * LUCK.RARE_CHANCE_PER_LUCK
    );
    const isRare = Math.random() < rareChance;

    const baseValue = enemy.type === 'whale' ? GEMS.BASE_VALUE_WHALE : GEMS.BASE_VALUE_NORMAL;
    // Rare gems worth more, plus luck bonus
    const luckValueBonus = 1 + luck * LUCK.VALUE_BONUS_PER_LUCK;
    const rareMultiplier = isRare ? GEMS.RARE_MULTIPLIER : 1;
    const leverageMultiplier = DifficultyManager.getXpMultiplier();
    const value = Math.floor(baseValue * rareMultiplier * luckValueBonus * leverageMultiplier);

    pool.getGem(
      enemy.x,
      enemy.y,
      value,
      isRare ? GEMS.RARE_SIZE : GEMS.NORMAL_SIZE,
      isRare ? COLORS.RARE_GEM : COLORS.GEM,
      isRare
    );

    // Bonus gem chance: per-luck chance (capped)
    const bonusGemChance = Math.min(
      LUCK.MAX_BONUS_GEM_CHANCE,
      luck * LUCK.BONUS_GEM_CHANCE_PER_LUCK
    );
    if (Math.random() < bonusGemChance) {
      // Spawn smaller bonus gem slightly offset
      const bonusValue = Math.floor(baseValue * LUCK.BONUS_VALUE_MULTIPLIER * luckValueBonus);
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
