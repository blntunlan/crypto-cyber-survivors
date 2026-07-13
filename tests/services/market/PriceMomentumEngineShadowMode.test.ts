import { afterEach, describe, expect, it } from 'vitest';
import { PriceMomentumEngine } from '../../../services/market/PriceMomentumEngine';

describe('PriceMomentumEngine shadow isolation', () => {
  afterEach(() => {
    PriceMomentumEngine.reset();
  });

  it('keeps visual momentum while neutralizing legacy gameplay multipliers', () => {
    PriceMomentumEngine.update(50_000, 1_000);
    const momentum = PriceMomentumEngine.update(51_000, 2_000);

    expect(momentum.intensity).toBeGreaterThan(0);
    expect(momentum.enemySpeedMod).toBe(1);
    expect(momentum.spawnRateMod).toBe(1);
    expect(momentum.gemValueMod).toBe(1);
  });

  it('keeps gameplay compatibility fields neutral after reset', () => {
    PriceMomentumEngine.reset();
    PriceMomentumEngine.update(50_000, 1_000);
    const momentum = PriceMomentumEngine.update(51_000, 2_000);

    expect(momentum.enemySpeedMod).toBe(1);
    expect(momentum.spawnRateMod).toBe(1);
    expect(momentum.gemValueMod).toBe(1);
  });
});
