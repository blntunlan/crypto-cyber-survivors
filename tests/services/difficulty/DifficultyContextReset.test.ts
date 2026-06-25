/**
 * DifficultyContext Reset Regression Tests
 *
 * P0 Beta Checklist Item:
 *   "DifficultyContext reset regresyonunu kapat: game over, cash out,
 *    liquidation ve cycle continue sonrası difficulty state sızıntısı
 *    olmadığını testle."
 *
 * Ensures zero state leakage across all terminal game transitions:
 *   - death (gameOver event)
 *   - cash out (explicit reset + gameOver)
 *   - liquidation (forced gameOver)
 *   - cycle continue (resetForCycleContinue)
 *   - resetFlowState (UI controller reset)
 *   - ResetOrchestrator (deterministic ordered reset)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../services/core/EventBus';
import { difficultyContext } from '../../../services/difficulty/DifficultyContext';
import { MarketInputAggregator } from '../../../services/difficulty/aggregators/MarketInputAggregator';
import { PlayerMetricsAggregator } from '../../../services/difficulty/aggregators/PlayerMetricsAggregator';
import { LeverageStateProvider } from '../../../services/difficulty/aggregators/LeverageStateProvider';
import { ResetOrchestrator } from '../../../services/core/ResetOrchestrator';
import {
  UnifiedDirector,
  type UnifiedInputs,
} from '../../../services/difficulty/UnifiedDirector';
import { DifficultyManager } from '../../../services/gameplay/DifficultyManager';

/**
 * Helper: pollute all difficulty state categories to detectable values.
 * After any reset path, NONE of these values should remain.
 */
function polluteAllState() {
  // Time
  difficultyContext.updateTime(999);

  // Market
  difficultyContext.updateInputs({
    pnlPercent: 0.75,
    currentPrice: 99999,
    rsi: 85,
    rsiState: 'OVERBOUGHT',
    normalizedVolume: 0.95,
    atrPercent: 0.03,
    whaleTier: 3,
  });

  // Player
  difficultyContext.updateInputs({
    level: 20,
    hpPercent: 0.1,
    killStreak: 55,
    timeSinceLastKill: 2,
    dps: 300,
    playerPower: 5.0,
    offensePower: 3.0,
    counterPressure: 2.0,
    rangedPressure: 1.5,
    screenDensity: 0.9,
  });

  // Leverage / Cycle
  difficultyContext.updateInputs({
    leverage: 100,
    entryPrice: 45000,
    cycleFactor: 3.5,
  });
}

/** Assert all inputs are at their default state */
function expectDefaultState() {
  const s = difficultyContext.inputs;

  // Time
  expect(s.elapsedSeconds).toBe(0);

  // Market
  expect(s.pnlPercent).toBe(0);
  expect(s.currentPrice).toBe(0);
  expect(s.rsi).toBe(50);
  expect(s.rsiState).toBe('NEUTRAL');
  expect(s.normalizedVolume).toBe(0);
  expect(s.atrPercent).toBe(0);
  expect(s.whaleTier).toBe(0);
  expect(s.pnlHistory).toHaveLength(0);
  expect(s.macd).toEqual({ histogram: 0, signal: 0, macd: 0, value: 0 });

  // Player
  expect(s.level).toBe(1);
  expect(s.hpPercent).toBe(1.0);
  expect(s.killStreak).toBe(0);
  expect(s.timeSinceLastKill).toBe(-1);
  expect(s.dps).toBe(0);
  expect(s.playerPower).toBe(0);
  expect(s.offensePower).toBe(0);
  expect(s.counterPressure).toBe(0);
  expect(s.rangedPressure).toBe(0);
  expect(s.screenDensity).toBe(0);

  // Leverage / Cycle
  expect(s.cycleFactor).toBe(1);
  expect(s.leverage).toBe(5); // default leverage
  expect(s.entryPrice).toBe(0);

  // Stress
  expect(s.stress).toEqual({
    score: 0,
    damageRate: 0,
    dashUsage: 0,
    nearDeathDuration: 0,
  });
}

describe('DifficultyContext Reset Regression', () => {
  beforeEach(() => {
    difficultyContext.reset();
    UnifiedDirector.reset();
    vi.restoreAllMocks();
  });

  // ─── gameOver event path ───────────────────────────────────────────────

  describe('gameOver event (death)', () => {
    it('resets ALL state categories after gameOver', () => {
      polluteAllState();
      EventBus.emit('gameOver', { finalLevel: 20, finalPnl: 0.75 });
      expectDefaultState();
    });

    it('clears cycleFactor specifically (known regression)', () => {
      difficultyContext.updateInputs({ cycleFactor: 2.5 });
      expect(difficultyContext.inputs.cycleFactor).toBe(2.5);

      EventBus.emit('gameOver', { finalLevel: 1, finalPnl: 0 });
      expect(difficultyContext.inputs.cycleFactor).toBe(1);
    });

    it('clears pnlHistory on death', () => {
      difficultyContext.updateInputs({ pnlPercent: 0.05 });
      difficultyContext.updateInputs({ pnlPercent: 0.1 });
      difficultyContext.updateInputs({ pnlPercent: 0.15 });
      expect(difficultyContext.inputs.pnlHistory.length).toBeGreaterThan(0);

      EventBus.emit('gameOver', { finalLevel: 5, finalPnl: 0.15 });
      expect(difficultyContext.inputs.pnlHistory).toHaveLength(0);
    });
  });

  // ─── cash out path ────────────────────────────────────────────────────

  describe('cash out (explicit reset + gameOver)', () => {
    it('difficultyContext.reset() before handleGameOver clears state fully', () => {
      polluteAllState();

      // Simulate cash out: reset() is called explicitly in handleCashOut,
      // then handleGameOver also calls reset()
      difficultyContext.reset();
      expectDefaultState();

      // gameOver event fires inside handleGameOver — should still be clean
      EventBus.emit('gameOver', { finalLevel: 20, finalPnl: 0.75 });
      expectDefaultState();
    });

    it('double reset is idempotent — no state drift', () => {
      polluteAllState();
      difficultyContext.reset();
      const firstSnapshot = { ...difficultyContext.inputs };

      difficultyContext.reset();
      const secondSnapshot = difficultyContext.inputs;

      expect(secondSnapshot.cycleFactor).toBe(firstSnapshot.cycleFactor);
      expect(secondSnapshot.level).toBe(firstSnapshot.level);
      expect(secondSnapshot.elapsedSeconds).toBe(firstSnapshot.elapsedSeconds);
      expect(secondSnapshot.leverage).toBe(firstSnapshot.leverage);
      expect(secondSnapshot.rsi).toBe(firstSnapshot.rsi);
    });
  });

  // ─── liquidation path ─────────────────────────────────────────────────

  describe('liquidation (forced gameOver at -100% PnL)', () => {
    it('resets ALL state even when cycleFactor is compounded', () => {
      // Simulate multiple cycles before liquidation
      difficultyContext.updateInputs({ cycleFactor: 1.5 });
      difficultyContext.resetForCycleContinue();
      difficultyContext.updateInputs({ cycleFactor: 2.0 });
      difficultyContext.resetForCycleContinue();
      difficultyContext.updateInputs({ cycleFactor: 2.5 });

      // Now liquidation happens
      difficultyContext.updateInputs({ pnlPercent: -1.0 });
      EventBus.emit('gameOver', { finalLevel: 8, finalPnl: -1.0 });

      expectDefaultState();
    });

    it('resets all aggregator slices on liquidation gameOver', () => {
      polluteAllState();
      EventBus.emit('gameOver', { finalLevel: 20, finalPnl: -1.0 });

      // Verify aggregator internal state is also clean
      expect(MarketInputAggregator.slice.pnlPercent).toBe(0);
      expect(MarketInputAggregator.slice.rsi).toBe(50);
      expect(PlayerMetricsAggregator.slice.level).toBe(1);
      expect(PlayerMetricsAggregator.slice.killStreak).toBe(0);
      expect(LeverageStateProvider.slice.cycleFactor).toBe(1.0);
      expect(LeverageStateProvider.slice.leverage).toBe(5);
    });
  });

  // ─── cycle continue path ─────────────────────────────────────────────

  describe('cycle continue (resetForCycleContinue)', () => {
    it('resets per-cycle state but preserves session-level state', () => {
      // Session-level: leverage, entryPrice, market indicators
      difficultyContext.updateInputs({
        leverage: 10,
        entryPrice: 45000,
        rsi: 65,
        currentPrice: 50000,
      });
      difficultyContext.updateTime(300);

      // Per-cycle state
      difficultyContext.updateInputs({
        cycleFactor: 1.5,
        level: 8,
        killStreak: 25,
        hpPercent: 0.3,
      });

      difficultyContext.resetForCycleContinue();

      const after = difficultyContext.inputs;

      // Per-cycle → reset
      expect(after.cycleFactor).toBe(1.0);
      expect(after.level).toBe(1);
      expect(after.killStreak).toBe(0);
      expect(after.hpPercent).toBe(1.0);

      // Session-level → preserved
      expect(after.leverage).toBe(10);
      expect(after.entryPrice).toBe(45000);
      expect(after.rsi).toBe(65);
      expect(after.currentPrice).toBe(50000);
      expect(after.elapsedSeconds).toBe(300);
    });

    it('clears pnlHistory but keeps live market data', () => {
      difficultyContext.updateInputs({ pnlPercent: 0.1, rsi: 70 });
      difficultyContext.updateInputs({ pnlPercent: 0.2 });
      expect(difficultyContext.inputs.pnlHistory.length).toBeGreaterThan(0);

      difficultyContext.resetForCycleContinue();

      expect(difficultyContext.inputs.pnlHistory).toHaveLength(0);
      expect(difficultyContext.inputs.rsi).toBe(70);
    });

    it('does NOT compound cycleFactor across continues when resetForCycleContinue is called', () => {
      // Cycle 1: cycleFactor = 1.5
      difficultyContext.updateInputs({ cycleFactor: 1.5, level: 5 });
      difficultyContext.resetForCycleContinue();
      expect(difficultyContext.inputs.cycleFactor).toBe(1.0);

      // Cycle 2: set new cycleFactor, should NOT stack on old one
      difficultyContext.updateInputs({ cycleFactor: 2.0 });
      expect(difficultyContext.inputs.cycleFactor).toBe(2.0);

      difficultyContext.resetForCycleContinue();
      expect(difficultyContext.inputs.cycleFactor).toBe(1.0);

      // Cycle 3: verify no drift
      difficultyContext.updateInputs({ cycleFactor: 2.5 });
      expect(difficultyContext.inputs.cycleFactor).toBe(2.5);
    });

    it('consecutive continues do not leak player metrics', () => {
      for (let cycle = 1; cycle <= 5; cycle++) {
        difficultyContext.updateInputs({
          level: cycle * 3,
          killStreak: cycle * 10,
          hpPercent: 0.2,
          dps: cycle * 50,
        });

        difficultyContext.resetForCycleContinue();

        expect(difficultyContext.inputs.level).toBe(1);
        expect(difficultyContext.inputs.killStreak).toBe(0);
        expect(difficultyContext.inputs.hpPercent).toBe(1.0);
        expect(difficultyContext.inputs.dps).toBe(0);
      }
    });
  });

  // ─── gameReset event path ─────────────────────────────────────────────

  describe('gameReset event (legacy)', () => {
    it('resets all state on gameReset', () => {
      polluteAllState();
      EventBus.emit('gameReset', {});
      expectDefaultState();
    });
  });

  // ─── ResetOrchestrator path ───────────────────────────────────────────

  describe('ResetOrchestrator.orchestrateReset()', () => {
    it('resets DifficultyContext through orchestrated reset', () => {
      polluteAllState();

      // Verify DifficultyContext is registered
      const handlers = ResetOrchestrator.getRegisteredHandlers();
      const dcHandler = handlers.find(h => h.name === 'DifficultyContext');
      expect(dcHandler).toBeDefined();

      // Orchestrate reset (this also emits gameReset)
      ResetOrchestrator.orchestrateReset();

      expectDefaultState();
    });
  });

  // ─── Cross-scenario regressions ───────────────────────────────────────

  describe('cross-scenario regressions', () => {
    it('state after gameOver → new game → accumulate → gameOver returns to defaults', () => {
      // First game
      polluteAllState();
      EventBus.emit('gameOver', { finalLevel: 20, finalPnl: 0.75 });
      expectDefaultState();

      // New game starts
      EventBus.emit('gameStart', {
        leverage: 10,
        position: 'LONG',
        entryPrice: 50000,
      });

      // Accumulate state during second game
      difficultyContext.updateInputs({
        level: 5,
        cycleFactor: 1.2,
        killStreak: 10,
      });
      difficultyContext.updateTime(120);

      // Second death
      EventBus.emit('gameOver', { finalLevel: 5, finalPnl: -0.3 });
      expectDefaultState();
    });

    it('state after cycle continue → death fully resets', () => {
      // Play through cycle
      difficultyContext.updateInputs({
        leverage: 10,
        entryPrice: 45000,
        cycleFactor: 1.5,
        level: 8,
      });
      difficultyContext.updateTime(300);

      // Continue to next cycle
      difficultyContext.resetForCycleContinue();
      difficultyContext.updateInputs({ cycleFactor: 2.0 });

      // Accumulate more state
      difficultyContext.updateInputs({ level: 4, killStreak: 12 });
      difficultyContext.updateTime(420);

      // Die in second cycle
      EventBus.emit('gameOver', { finalLevel: 4, finalPnl: -0.5 });
      expectDefaultState();
    });

    it('multiple rapid continues then liquidation clears everything', () => {
      for (let i = 1; i <= 3; i++) {
        difficultyContext.updateInputs({
          cycleFactor: 1 + i * 0.5,
          level: i * 3,
        });
        difficultyContext.resetForCycleContinue();
      }

      // Final cycle before liquidation
      difficultyContext.updateInputs({ cycleFactor: 3.0, pnlPercent: -1.0 });

      // Liquidation
      difficultyContext.reset();
      EventBus.emit('gameOver', { finalLevel: 1, finalPnl: -1.0 });
      expectDefaultState();
    });
  });

  // ─── UnifiedDirector reset coverage ──────────────────────────────────

  describe('UnifiedDirector reset coverage', () => {
    /** Inputs that produce non-default difficulty outputs */
    const extremeInputs: UnifiedInputs = {
      rsi: 0.85,
      rsiMomentum: 0.5,
      atrPercent: 0.06,
      volumeNorm: 0.95,
      priceChange: 0.12,
      trendStrength: 0.8,
      macdHistogram: 0.06,
      side: 'long',
      hpPercent: 0.08,
      pnlRatio: 0.6,
      killsPerMin: 40,
      dashFrequency: 0.85,
      playerDPS: 250,
      damageTakenRate: 0.6,
      elapsedMinutes: 6,
      playerLevel: 25,
      leverage: 1.0,
      gemPileup: 80,
      engagementScore: 0.9,
      frustrationScore: 0.6,
    };

    /** Assert UnifiedDirector outputs are at defaults */
    function expectUnifiedDefaults() {
      const o = UnifiedDirector.getOutputs();
      expect(o.spawnRate).toBe(1.0);
      expect(o.enemySpeed).toBe(1.0);
      expect(o.enemyHP).toBe(1.0);
      expect(o.enemyDamage).toBe(1.0);
      expect(o.gemDropRate).toBe(1.0);
      expect(o.enemyVariety).toBe(1.0);
      expect(o.chaosLevel).toBe(0);
      expect(o.mercyFactor).toBe(0);
      expect(o.pressureIntensity).toBe(0);
      expect(o.whaleProbability).toBe(0);
      expect(o.xpMultiplier).toBe(1.0);
      expect(o.trendAlignment).toBe('neutral');
      expect(o.lootboxDropChance).toBe(0.03);
    }

    it('reset() clears polluted smoothedOutputs to defaults', () => {
      // Pollute
      UnifiedDirector.update(extremeInputs, Date.now());
      UnifiedDirector.snapToTargets();
      const polluted = UnifiedDirector.getOutputs();
      // At least one value should have moved away from default
      const moved =
        polluted.spawnRate !== 1.0 ||
        polluted.enemyHP !== 1.0 ||
        polluted.chaosLevel !== 0 ||
        polluted.pressureIntensity !== 0;
      expect(moved).toBe(true);

      // Reset
      UnifiedDirector.reset();
      expectUnifiedDefaults();
    });

    it('gameOver event resets UnifiedDirector (belt-and-suspenders via DifficultyManager)', () => {
      // Pollute
      UnifiedDirector.update(extremeInputs, Date.now());
      UnifiedDirector.snapToTargets();

      // gameOver event should trigger DifficultyManager's listener
      EventBus.emit('gameOver', { finalLevel: 10, finalPnl: 0.5 });

      expectUnifiedDefaults();
    });

    it('gameReset event resets UnifiedDirector via DifficultyManager.reset()', () => {
      // Pollute
      UnifiedDirector.update(extremeInputs, Date.now());
      UnifiedDirector.snapToTargets();

      EventBus.emit('gameReset', {});

      expectUnifiedDefaults();
    });

    it('ResetOrchestrator.orchestrateReset() resets UnifiedDirector', () => {
      // Pollute
      UnifiedDirector.update(extremeInputs, Date.now());
      UnifiedDirector.snapToTargets();

      ResetOrchestrator.orchestrateReset();

      expectUnifiedDefaults();
    });

    it('DifficultyManager.reset() resets both DifficultyContext and UnifiedDirector', () => {
      // Pollute both
      polluteAllState();
      UnifiedDirector.update(extremeInputs, Date.now());
      UnifiedDirector.snapToTargets();

      DifficultyManager.reset();

      expectDefaultState();
      expectUnifiedDefaults();
    });

    it('DifficultyManager.resetForCycleContinue() resets UnifiedDirector', () => {
      // Pollute
      UnifiedDirector.update(extremeInputs, Date.now());
      UnifiedDirector.snapToTargets();

      DifficultyManager.resetForCycleContinue();

      expectUnifiedDefaults();
    });

    it('UnifiedDirector does not leak across gameOver → new game cycle', () => {
      // First game: pollute
      UnifiedDirector.update(extremeInputs, Date.now());
      UnifiedDirector.snapToTargets();

      // Game over
      EventBus.emit('gameOver', { finalLevel: 20, finalPnl: 0.75 });
      expectUnifiedDefaults();

      // New game starts
      EventBus.emit('gameStart', { leverage: 10, position: 'LONG', entryPrice: 50000 });

      // Pollute again in second game
      UnifiedDirector.update(extremeInputs, Date.now());
      UnifiedDirector.snapToTargets();

      // Second death
      EventBus.emit('gameOver', { finalLevel: 5, finalPnl: -0.3 });
      expectUnifiedDefaults();
    });
  });
});
