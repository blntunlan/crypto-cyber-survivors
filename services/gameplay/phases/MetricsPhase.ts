import type { PhaseInput } from '../contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';
import { ComboSystem } from '../../combat/ComboSystem';
import { BuffManager } from '../../patterns/decorators/BuffManager';
import { MetricsService } from '../../core/MetricsService';

/**
 * MetricsPhase — updates metrics, combo system, and buff manager.
 *
 * Extracted from GameEngine.tsx update loop:
 *   - ComboSystem.update()
 *   - BuffManager.update()
 *   - MetricsService.update(...)
 *
 * Note: BuffManager.updateBaseStats(player) remains in GameEngine because
 * it needs the mutable player ref, and BuffGemSpawner/SpeedLine updates
 * need dimensions and marketData from the outer scope.
 */
export class MetricsPhase implements IGameplayPhase<'metrics'> {
  public readonly phase = 'metrics' as const;
  private readonly result = createBaselinePhaseResult(this.phase);

  public execute(input: PhaseInput<'metrics'>): BaselinePhaseResult<'metrics'> {
    const { clock, marketData, world } = input.context;

    // Update combo system
    ComboSystem.update();

    // Update buff manager (handles effect expiration)
    BuffManager.update();

    // Update metrics system
    const pool = world.pool.current;
    const player = world.player.current;
    const hpPercent = player
      ? (player.hp / (100 + (player.level - 1) * 10)) * 100
      : 100;

    MetricsService.update(
      clock.deltaMs,
      marketData.pnl,
      marketData.difficulty,
      hpPercent,
      pool.activeEnemies.length,
      pool.activeBullets.length,
      pool.activeParticles.length,
      'active', // AI Director V2: Wave phases removed
      marketData.atrPercent ?? 0.01
    );

    return this.result;
  }
}
