import { describe, expect, it } from 'vitest';
import { LEVERAGE_OPTIONS, MAXIMUM_PUBLIC_LEVERAGE } from '../../../types';
import { DIRECTOR_CONFIG_V1 } from '../../../services/director/config/DirectorConfigV1';

/**
 * Drift lock for "Core Loop & Dynamic Difficulty — Final Design Contract v1.0".
 *
 * Every number here is quoted from the contract, not from the config, so a
 * silent retune shows up as a failing assertion naming the contract section.
 * Changing a value requires editing the contract first.
 */
describe('Final Design Contract v1.0 conformance', () => {
  const config = DIRECTOR_CONFIG_V1;

  it('§3 survival curve matches the published pressure table', () => {
    expect(config.survival.pressurePoints).toEqual([
      { elapsedSeconds: 0, pressure: 0.2 },
      { elapsedSeconds: 180, pressure: 0.3 },
      { elapsedSeconds: 480, pressure: 0.55 },
      { elapsedSeconds: 900, pressure: 0.85 },
      { elapsedSeconds: 1500, pressure: 1.15 },
      { elapsedSeconds: 2100, pressure: 1.4 },
    ]);
    expect(config.survival.pressureCap).toBe(1.4);
  });

  it('§6 publishes exactly the 1/2/5/10/20 leverage ladder', () => {
    expect(LEVERAGE_OPTIONS).toEqual([1, 2, 5, 10, 20]);
    expect(MAXIMUM_PUBLIC_LEVERAGE).toBe(20);
    expect(config.position.maximumPublicLeverage).toBe(20);
    expect(config.position.publicLeverageTiers).toEqual([1, 2, 5, 10, 20]);
    expect(LEVERAGE_OPTIONS).not.toContain(50);
  });

  it('§5 alignment uses a 5% scale and an eight second EMA', () => {
    expect(config.position.alignmentScale).toBe(0.05);
    expect(config.position.alignmentEmaSeconds).toBe(8);
  });

  it('§7 pacing durations and threat multipliers match the state table', () => {
    expect(config.pacing.buildUp).toEqual({
      minSeconds: 45,
      maxSeconds: 70,
      threatMultiplier: 0.75,
    });
    expect(config.pacing.peak).toEqual({
      minSeconds: 20,
      maxSeconds: 35,
      threatMultiplier: 1.25,
    });
    expect(config.pacing.peakFade).toEqual({
      minSeconds: 8,
      maxSeconds: 12,
      threatMultiplier: 0.85,
    });
    expect(config.pacing.recovery).toEqual({
      minSeconds: 25,
      maxSeconds: 40,
      threatMultiplier: 0.35,
    });
    expect(config.pacing.marketSurge).toEqual({
      maxSeconds: 20,
      threatMultiplier: 1.4,
    });
  });

  it('§7 event telegraph, lockout, cooldown, and queue limits hold', () => {
    expect(config.marketEvents.minTelegraphSeconds).toBe(2);
    expect(config.marketEvents.initialSurgeLockoutSeconds).toBe(90);
    expect(config.marketEvents.defaultCooldownSeconds).toBe(75);
    expect(config.marketEvents.whaleCooldownSeconds).toBe(120);
    expect(config.marketEvents.queueCapacity).toBe(1);
    expect(config.marketEvents.maxPrimaryEncounters).toBe(1);
    expect(config.marketEvents.maxSupportEncounters).toBe(1);
  });

  it('§8 Doom starts at 25 minutes and stacks every five', () => {
    expect(config.survival.doomStartsAtSeconds).toBe(1500);
    expect(config.survival.doomStackIntervalSeconds).toBe(300);
    expect(config.survival.recoveryReductionPerDoomStackSeconds).toBe(2);
    expect(config.survival.minimumRecoverySeconds).toBe(8);
    expect(config.survival.minimumSupportEfficiency).toBe(0.4);
    expect(config.survival.doomStacksPerComplexitySlot).toBe(2);
  });

  it('§9 threat weights, bounds, and credit bank match the formula', () => {
    expect(config.threat.weights.market).toBe(0.35);
    expect(config.threat.weights.headwind).toBe(0.35);
    expect(config.threat.weights.greed).toBe(1);
    expect(config.threat.weights.encounter).toBe(0.3);
    expect(config.threat.minimumTarget).toBe(0.2);
    expect(config.threat.maximumTarget).toBe(2);
    expect(config.threat.maximumCreditBankSeconds).toBe(8);
  });

  it('§9 normal enemy stat caps are 2.20 / 1.80 / 1.35', () => {
    expect(config.enemyStatCaps.normalHealth).toBe(2.2);
    expect(config.enemyStatCaps.normalDamage).toBe(1.8);
    expect(config.enemyStatCaps.normalSpeed).toBe(1.35);
  });

  it('§10 advantage keeps one active mechanic and a 45 second bank', () => {
    expect(config.advantage.maximumActiveMechanics).toBe(1);
    expect(config.advantage.maximumCreditBankSeconds).toBe(45);
    expect(config.advantage.regimeConfidenceBaseMultiplier).toBe(0.6);
    expect(config.advantage.regimeConfidenceWeight).toBe(0.4);
  });

  it('§11 an event may drive at most two mechanical channels', () => {
    expect(config.encounters.maximumHeadwindChannels).toBe(2);
    expect(config.encounters.maximumConcurrentStatSpikes).toBe(3);
  });

  it('§12 cash-out eligibility, quote window, and grace match policy v1', () => {
    expect(config.cashOut.firstEligibilitySeconds).toBe(300);
    expect(config.cashOut.forcedRecoveryAtSeconds).toBe(345);
    expect(config.cashOut.quoteDurationSeconds).toBe(15);
    expect(config.cashOut.maximumOfferDelaySeconds).toBe(45);
    expect(config.cashOut.nextEligibilityBaseSeconds).toBe(240);
    expect(config.cashOut.nextEligibilityPerGreedSeconds).toBe(30);
    expect(config.cashOut.nextEligibilityGreedCap).toBe(4);
  });

  it('§13 greed pressure and recovery reduction match the published curve', () => {
    expect(config.greed.pressurePerLevel).toBe(0.1);
    expect(config.greed.maximumPressure).toBe(0.5);
    expect(config.greed.recoveryReductionPerLevel).toBe(0.07);
    expect(config.greed.maximumRecoveryReduction).toBe(0.35);
  });

  it('§21.4 market pressure weights are 0.35 / 0.25 / 0.20 / 0.10 / 0.10', () => {
    expect(config.marketPressure.weights).toEqual({
      volatility: 0.35,
      volume: 0.25,
      trend: 0.2,
      rsiExtremity: 0.1,
      whale: 0.1,
    });
  });

  it('§21.6 regime thresholds keep their published hysteresis', () => {
    expect(config.regimeThresholds.rsi).toEqual({
      overboughtEnter: 70,
      overboughtExit: 65,
      oversoldEnter: 30,
      oversoldExit: 35,
      confirmationFrames: 3,
    });
    expect(config.regimeThresholds.volatility).toEqual({
      highEnter: 0.75,
      extremeEnter: 0.9,
      highExit: 0.6,
      confirmationFrames: 3,
    });
    expect(config.regimeThresholds.volume).toEqual({
      surgeEnter: 0.8,
      surgeExit: 0.6,
      confirmationFrames: 3,
    });
    expect(config.regime.macdConfirmationFrames).toBe(2);
    expect(config.regime.minimumTrendStrength).toBe(0.6);
    expect(config.regime.whaleEventMinimumTier).toBe(2);
  });
});
