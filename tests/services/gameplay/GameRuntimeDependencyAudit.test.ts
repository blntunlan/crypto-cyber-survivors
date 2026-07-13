import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('GameRuntime dependency ownership', () => {
  it('constructs and owns runtime services without the EngineRegistry locator', () => {
    const source = readFileSync('services/gameplay/GameRuntime.ts', 'utf8');

    expect(source).not.toContain('EngineRegistry');
  });

  it('updates the difficulty context directly without routing runtime ticks through DifficultyManager', () => {
    const source = readFileSync('services/gameplay/phases/DifficultyPhase.ts', 'utf8');

    expect(source).not.toContain('DifficultyManager');
  });

  it('does not duplicate LeverageEngine market aggregation inside GameEngine', () => {
    const source = readFileSync('components/GameEngine.tsx', 'utf8');

    expect(source).not.toContain('LeverageEngine');
  });

  it('does not let PriceMomentumEngine modify gem rewards directly', () => {
    const source = readFileSync('services/combat/physics/CollectionSystem.ts', 'utf8');

    expect(source).not.toContain('PriceMomentumEngine');
  });

  it('keeps PriceMomentumEngine presentation-only without a legacy modifier switch', () => {
    const source = readFileSync('services/market/PriceMomentumEngine.ts', 'utf8');

    expect(source).not.toContain('gameplayModifiersEnabled');
  });

  it('does not apply CoreGameplayLoop multipliers to spawning or enemy stats', () => {
    const source = readFileSync('components/GameEngine.tsx', 'utf8');

    expect(source).not.toContain('coreLoopOutput.spawnMultiplier');
    expect(source).not.toContain('coreLoopOutput.enemySpeedMultiplier');
    expect(source).not.toContain('coreLoopOutput.enemyDamageMultiplier');
  });

  it('keeps GameEngine on the Director spawn path without legacy authority routing', () => {
    const source = readFileSync('components/GameEngine.tsx', 'utf8');

    expect(source).not.toContain('updateLegacy');
    expect(source).not.toContain('resolveSpawnAuthority');
    expect(source).not.toContain('getDirectorRuntimeConfig');
    expect(source).not.toContain('PlayerPowerAnalyzer');
  });

  it('does not construct obsolete legacy-authority telemetry in GameRuntime', () => {
    const source = readFileSync('services/gameplay/GameRuntime.ts', 'utf8');

    expect(source).not.toContain('SpawnAuthorityTelemetry');
  });

  it('keeps the market signal pipeline free of legacy difficulty decisions', () => {
    const source = readFileSync(
      'services/market/pipeline/MarketSignalPipeline.ts',
      'utf8'
    );

    expect(source).not.toContain('DifficultyManager');
    expect(source).not.toContain('UnifiedDirector');
    expect(source).not.toContain('gameplay:');
  });

  it('keeps legacy difficulty management out of production runtime consumers', () => {
    const consumers = [
      'hooks/useGameFlowController.ts',
      'hooks/useDifficultyV2.ts',
      'hooks/useMarketTimeout.ts',
      'components/GameScreenRouter.tsx',
      'components/hud/CycleDecisionScreen.tsx',
      'services/combat/physics/CombatResolutionService.ts',
      'services/core/GameStateManager.ts',
      'services/system/DebugService.ts',
    ];

    for (const consumer of consumers) {
      expect(readFileSync(consumer, 'utf8')).not.toContain('DifficultyManager');
    }
  });
});
