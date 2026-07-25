import { type MarketPosition } from '../../types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type SpawnPlan } from '../director/contracts';

export type SpawnExecutorWorld = {
  pool: IPoolManager;
  position: MarketPosition;
  maxActiveEnemies: number;
};

export type SpawnExecutionResult = {
  executedCount: number;
  spentThreat: number;
};

/** Applies an already-authorized SpawnPlan; it never reads market or player state. */
export class SpawnExecutor {
  private readonly result: SpawnExecutionResult = { executedCount: 0, spentThreat: 0 };
  private lastExecutedRevision = -1;

  public execute(plan: SpawnPlan, world: SpawnExecutorWorld): SpawnExecutionResult {
    this.result.executedCount = 0;
    this.result.spentThreat = 0;
    if (plan.revision <= this.lastExecutedRevision) return this.result;
    this.lastExecutedRevision = plan.revision;

    let activeEnemies = world.pool.activeEnemies.length;
    const activeLimit = Math.min(plan.maxActiveEnemies, world.maxActiveEnemies);

    for (const intent of plan.intents) {
      if (activeEnemies >= activeLimit) break;

      world.pool.getEnemy(
        intent.x,
        intent.y,
        intent.difficulty,
        world.position,
        intent.enemyType as Parameters<IPoolManager['getEnemy']>[4],
        undefined,
        intent.damageMultiplier,
        intent.speedMultiplier,
        undefined,
        intent.healthMultiplier,
        intent.intent,
        intent.powerTier
      );
      activeEnemies += 1;
      this.result.executedCount += 1;
      this.result.spentThreat += intent.threatCost;
    }

    return this.result;
  }

  public reset(): void {
    this.lastExecutedRevision = -1;
  }
}
