import { DIFFICULTY_RUNTIME_CONFIG } from '../../../config/difficulty/DifficultyRuntimeConfig';
import { type TrendAlignment } from '../../../types/runtimeDifficulty';
import { type RuntimeDifficultySnapshot } from '../../../types/runtimeDifficulty';
import { EventBus } from '../../core/EventBus';
import { type DifficultyOutputV2, type LiquidationWarning } from '../types';

export class DifficultyV2CompatibilityAdapter {
  public toOutput(snapshot: RuntimeDifficultySnapshot): DifficultyOutputV2 {
    const liquidationWarning = this.getLiquidationWarning(
      snapshot.signals.position.liquidationProximity
    );
    const cadence = snapshot.pressure.spawnCadence;
    return {
      total: snapshot.pressure.total,
      wavePhase: 'active',
      liquidationWarning,
      fovReduction:
        snapshot.signals.position.liquidationProximity *
        DIFFICULTY_RUNTIME_CONFIG.compatibility.maximumFovReduction,
      shockActive:
        snapshot.signals.market.volatility >=
        DIFFICULTY_RUNTIME_CONFIG.compatibility.shockThreshold,
      spawnRate: cadence > 0 ? 1 / cadence : 1,
      enemySpeed: snapshot.enemy.speedMultiplier,
      enemyHP: snapshot.enemy.healthMultiplier,
      enemyDamage: snapshot.enemy.damageMultiplier,
      enemyVariety: snapshot.enemy.varietyMultiplier,
      chaosLevel: snapshot.presentation.intensity,
      mercyFactor: snapshot.recovery.mercy,
      pressureIntensity: snapshot.pressure.total,
      whaleProbability: snapshot.signals.market.whalePressure,
      xpMultiplier: snapshot.rewards.xpMultiplier,
      gemDropRate: snapshot.rewards.gemDropMultiplier,
    };
  }

  public emitTransitions(
    previous: RuntimeDifficultySnapshot | null,
    current: RuntimeDifficultySnapshot
  ): void {
    const proximity = current.signals.position.liquidationProximity;
    const warning = this.getLiquidationWarning(proximity);
    const previousWarning =
      previous === null
        ? 'NONE'
        : this.getLiquidationWarning(previous.signals.position.liquidationProximity);
    if (warning !== previousWarning) {
      EventBus.emit('liquidationWarning', {
        level: warning,
        distance: 1 - proximity,
        distanceToLiquidation: 1 - proximity,
        fovReduction:
          proximity * DIFFICULTY_RUNTIME_CONFIG.compatibility.maximumFovReduction,
        sourceSnapshotRevision: current.meta.revision,
      });
    }

    const shockActive =
      current.signals.market.volatility >=
      DIFFICULTY_RUNTIME_CONFIG.compatibility.shockThreshold;
    const previousShockActive =
      previous !== null &&
      previous.signals.market.volatility >=
        DIFFICULTY_RUNTIME_CONFIG.compatibility.shockThreshold;
    if (shockActive && !previousShockActive) {
      EventBus.emit('shockDetected', {
        intensity: current.signals.market.volatility,
        direction: current.signals.market.trend < 0 ? 'down' : 'up',
        sourceSnapshotRevision: current.meta.revision,
      });
    }

    EventBus.emit('difficultyUpdated', {
      trendAlignment: this.getTrendAlignment(current),
      lootboxDropChance: this.getLootboxDropChance(current),
      sourceSnapshotRevision: current.meta.revision,
    });
  }

  private getLiquidationWarning(proximity: number): LiquidationWarning {
    const config = DIFFICULTY_RUNTIME_CONFIG.compatibility;
    if (proximity >= config.liquidationCriticalThreshold) return 'CRITICAL';
    if (proximity >= config.liquidationDangerThreshold) return 'DANGER';
    if (proximity >= config.liquidationCautionThreshold) return 'CAUTION';
    return 'NONE';
  }

  private getTrendAlignment(snapshot: RuntimeDifficultySnapshot): TrendAlignment {
    const alignment =
      snapshot.signals.market.trend * snapshot.signals.position.alignment;
    if (alignment > 0) return 'with_player';
    if (alignment < 0) return 'against_player';
    return 'neutral';
  }

  private getLootboxDropChance(snapshot: RuntimeDifficultySnapshot): number {
    const config = DIFFICULTY_RUNTIME_CONFIG.compatibility;
    return (
      config.baseLootboxDropChance +
      Math.max(0, snapshot.rewards.lootOpportunityMultiplier - 1) *
        config.lootboxOpportunityScale
    );
  }
}
