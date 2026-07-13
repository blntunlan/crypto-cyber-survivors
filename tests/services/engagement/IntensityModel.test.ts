import { describe, expect, it } from 'vitest';
import {
  IntensityModel,
  createPracticeAssistPolicy,
} from '../../../services/engagement/IntensityModel';

const updateForSeconds = (frameRate: number) => {
  const model = new IntensityModel();
  const deltaSeconds = 1 / frameRate;
  let snapshot = model.update({
    deltaSeconds,
    hpRatio: 0.6,
    damageTakenPerSecond: 12,
    nearbyThreatPressure: 0.7,
    escapeResourcePressure: 0.3,
    killsPerMinute: 18,
    combatMastery: 0.5,
    buildPower: 0.4,
    mobilityUsage: 0.6,
  });

  for (let frame = 1; frame < frameRate * 10; frame += 1) {
    snapshot = model.update({
      deltaSeconds,
      hpRatio: 0.6,
      damageTakenPerSecond: 12,
      nearbyThreatPressure: 0.7,
      escapeResourcePressure: 0.3,
      killsPerMinute: 18,
      combatMastery: 0.5,
      buildPower: 0.4,
      mobilityUsage: 0.6,
    });
  }

  return snapshot;
};

describe('IntensityModel', () => {
  it('reuses its output object and exposes measurements without corrections', () => {
    const model = new IntensityModel();
    const first = model.update({
      deltaSeconds: 1 / 60,
      hpRatio: 0.5,
      damageTakenPerSecond: 5,
      nearbyThreatPressure: 0.4,
      escapeResourcePressure: 0.2,
      killsPerMinute: 12,
      combatMastery: 0.5,
      buildPower: 0.4,
      mobilityUsage: 0.5,
    });
    const second = model.update({
      deltaSeconds: 1 / 60,
      hpRatio: 0.5,
      damageTakenPerSecond: 5,
      nearbyThreatPressure: 0.4,
      escapeResourcePressure: 0.2,
      killsPerMinute: 12,
      combatMastery: 0.5,
      buildPower: 0.4,
      mobilityUsage: 0.5,
    });

    expect(second).toBe(first);
    expect(second).toMatchObject({
      healthRatio: 0.5,
      nearbyThreatPressure: 0.4,
      recoveryNeed: expect.any(Number),
    });
    expect(second).not.toHaveProperty('spawnRateMultiplier');
    expect(second).not.toHaveProperty('enemyDamageMultiplier');
  });

  it('produces time-equivalent telemetry at 30, 60, and 120 FPS', () => {
    const at30 = updateForSeconds(30);
    const at60 = updateForSeconds(60);
    const at120 = updateForSeconds(120);

    expect(at30.recoveryNeed).toBeCloseTo(at60.recoveryNeed, 5);
    expect(at60.recoveryNeed).toBeCloseTo(at120.recoveryNeed, 5);
    expect(at30.recentDamagePressure).toBeCloseTo(at120.recentDamagePressure, 5);
  });

  it('allows assist policy creation only for explicitly labeled practice runs', () => {
    expect(() => createPracticeAssistPolicy('TOKEN')).toThrow(
      'Practice Assist is unavailable'
    );
    expect(() => createPracticeAssistPolicy('MIRROR_PVP')).toThrow(
      'Practice Assist is unavailable'
    );
    expect(
      createPracticeAssistPolicy('PRACTICE').getRecoveryAssist(0.8)
    ).toBeGreaterThan(0);
  });
});
