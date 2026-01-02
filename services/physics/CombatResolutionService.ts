import { type PoolManager } from '../PoolManager';
import { type Player, type Enemy } from '../../types';
import { DifficultyManager } from '../DifficultyManager';
import { EventBus } from '../EventBus';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { COLORS } from '../../constants';

/**
 * CombatResolutionService - Pure logic for resolving combat events.
 * Handles entity death rewards and effects.
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

  private static spawnGemForEnemy(pool: PoolManager, enemy: Enemy, player: Player): void {
    const isRare = Math.random() < 0.05 + player.luck * 0.05;
    const baseValue = enemy.type === 'whale' ? 100 : 15;
    const value = baseValue * (isRare ? 3 : 1);

    pool.getGem(
      enemy.x,
      enemy.y,
      value,
      isRare ? 10 : 7,
      isRare ? COLORS.RARE_GEM : COLORS.GEM,
      isRare
    );
  }
}
