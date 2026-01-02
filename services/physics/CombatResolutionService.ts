import { type PoolManager } from '../PoolManager';
import { type Player, type Enemy } from '../../types';
import { DifficultyManager } from '../DifficultyManager';
import { EventBus } from '../EventBus';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { COLORS } from '../../constants';
import { PLAYER_STATS } from '../../config/PlayerConfig';
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
    enemy.active = false;
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
      // Heal amount: 2-5 HP based on enemy type
      const healAmount = enemy.type === 'whale' ? 8 : 3;
      const newHp = Math.min(player.hp + healAmount, player.maxHp);
      const actualHeal = newHp - player.hp;
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
    const baseCount = isSuperCrit ? 30 : 10;
    const count = Math.round(baseCount * perfConfig.particleMultiplier);

    for (let k = 0; k < count; k++) {
      pool.getParticle(
        enemy.x,
        enemy.y,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
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
    // Get effective luck from BuffManager if available, with system-level cap
    const rawLuck = BuffManager.isInitialized()
      ? BuffManager.getDecoratedStats().getLuck()
      : player.luck;
    const luck = Math.min(rawLuck, PLAYER_STATS.MAX_LUCK);

    // Rare gem chance: 5% base + 3% per luck (capped at 50%)
    const rareChance = Math.min(0.5, 0.05 + luck * 0.03);
    const isRare = Math.random() < rareChance;

    const baseValue = enemy.type === 'whale' ? 100 : 15;
    // Rare gems are worth 3x, plus luck bonus (1% per luck point)
    const luckValueBonus = 1 + luck * 0.01;
    const value = Math.floor(baseValue * (isRare ? 3 : 1) * luckValueBonus);

    pool.getGem(
      enemy.x,
      enemy.y,
      value,
      isRare ? 10 : 7,
      isRare ? COLORS.RARE_GEM : COLORS.GEM,
      isRare
    );

    // Bonus gem chance: 10% per luck point (capped at 50%)
    const bonusGemChance = Math.min(0.5, luck * 0.1);
    if (Math.random() < bonusGemChance) {
      // Spawn smaller bonus gem slightly offset
      const bonusValue = Math.floor(baseValue * 0.5 * luckValueBonus);
      pool.getGem(
        enemy.x + (Math.random() - 0.5) * 20,
        enemy.y + (Math.random() - 0.5) * 20,
        bonusValue,
        5,
        COLORS.GEM,
        false
      );
    }
  }
}
