import { describe, expect, it } from 'vitest';
import { DIRECTOR_CONFIG_V1 } from '../../../services/director/config/DirectorConfigV1';
import { PositionRiskModel } from '../../../services/director/position/PositionRiskModel';
import { LEVERAGE_OPTIONS } from '../../../types';

describe('PositionRiskModel', () => {
  it('exposes the complete public leverage tiers', () => {
    expect(LEVERAGE_OPTIONS).toEqual([1, 2, 5, 10, 25, 50, 100]);
  });
  it('treats an equivalent long rise and short fall symmetrically', () => {
    const longModel = new PositionRiskModel();
    const shortModel = new PositionRiskModel();

    const longRisk = longModel.update({
      sequence: 1,
      deltaSeconds: 8,
      currentPrice: 101,
      entryPrice: 100,
      side: 'LONG',
      leverage: 5,
      liquidationPrice: 80,
    });
    const shortRisk = shortModel.update({
      sequence: 1,
      deltaSeconds: 8,
      currentPrice: 99,
      entryPrice: 100,
      side: 'SHORT',
      leverage: 5,
      liquidationPrice: 120,
    });

    expect(shortRisk.directionalReturn).toBeCloseTo(longRisk.directionalReturn, 8);
    expect(shortRisk.alignment).toBeCloseTo(longRisk.alignment, 8);
    expect(shortRisk.advantage).toBeCloseTo(longRisk.advantage, 8);
  });

  it('smooths alignment with an eight-second EMA while bounding gameplay channels', () => {
    const model = new PositionRiskModel();

    const risk = model.update({
      sequence: 1,
      deltaSeconds: 1,
      currentPrice: 101,
      entryPrice: 100,
      side: 'LONG',
      leverage: 5,
      liquidationPrice: 80,
    });

    expect(risk.rawAlignment).toBeGreaterThan(risk.alignment);
    expect(risk.alignment).toBeGreaterThan(0);
    expect(risk.alignment).toBeLessThanOrEqual(1);
    expect(risk.advantage).toBeGreaterThanOrEqual(0);
    expect(risk.headwind).toBeGreaterThanOrEqual(0);
  });

  it('keeps liquidation pressure at zero beyond 30% and near maximum below 5%', () => {
    const model = new PositionRiskModel();

    const safe = model.update({
      sequence: 1,
      deltaSeconds: 1,
      currentPrice: 140,
      entryPrice: 100,
      side: 'LONG',
      leverage: 5,
      liquidationPrice: 100,
    });
    const danger = model.update({
      sequence: 2,
      deltaSeconds: 1,
      currentPrice: 104,
      entryPrice: 100,
      side: 'LONG',
      leverage: 5,
      liquidationPrice: 100,
    });

    expect(safe.liquidationProximity).toBe(0);
    expect(danger.liquidationProximity).toBeGreaterThan(0.95);
  });

  it('accepts every selectable public leverage tier', () => {
    expect(DIRECTOR_CONFIG_V1.position.publicLeverageTiers).toEqual(LEVERAGE_OPTIONS);

    for (const leverage of LEVERAGE_OPTIONS) {
      const model = new PositionRiskModel();

      expect(() =>
        model.update({
          sequence: 1,
          deltaSeconds: 1,
          currentPrice: 100,
          entryPrice: 100,
          side: 'LONG',
          leverage,
          liquidationPrice: 80,
        })
      ).not.toThrow();
    }
  });

  it('rejects leverage outside the public policy', () => {
    const model = new PositionRiskModel();

    expect(() =>
      model.update({
        sequence: 1,
        deltaSeconds: 1,
        currentPrice: 100,
        entryPrice: 100,
        side: 'LONG',
        leverage: 3,
        liquidationPrice: 80,
      })
    ).toThrow('Unsupported public leverage tier');
  });
});
