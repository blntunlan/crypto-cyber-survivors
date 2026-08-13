import { describe, it, expect } from 'vitest';
import { resolvePnlBackdrop } from '../../utils/pnlBackdrop';
import { GAME_ENGINE } from '../../constants';

const DESKTOP_FLOOR = 2;
const MOBILE_FLOOR = 12;

const neutral = (floor: number) => ({
  r: floor,
  g: floor + GAME_ENGINE.BG_NEUTRAL_G_OFFSET,
  b: floor + GAME_ENGINE.BG_NEUTRAL_B_OFFSET,
});

describe('resolvePnlBackdrop', () => {
  it('keeps the neutral night blue while in profit, however large the gain', () => {
    const target = { r: 0, g: 0, b: 0 };

    for (const pnl of [0, 0.05, 0.4742, 5]) {
      resolvePnlBackdrop(pnl, DESKTOP_FLOOR, target);
      expect(target).toEqual(neutral(DESKTOP_FLOOR));
    }
  });

  it('never lifts green above the neutral offset (no green wash)', () => {
    const target = { r: 0, g: 0, b: 0 };

    for (const pnl of [-1, -0.5, -0.1, 0, 0.25, 1]) {
      resolvePnlBackdrop(pnl, DESKTOP_FLOOR, target);
      expect(target.g).toBeLessThanOrEqual(
        DESKTOP_FLOOR + GAME_ENGINE.BG_NEUTRAL_G_OFFSET
      );
    }
  });

  it('ramps red on drawdown and saturates at the configured ceiling', () => {
    const target = { r: 0, g: 0, b: 0 };

    resolvePnlBackdrop(-0.1, DESKTOP_FLOOR, target);
    const shallow = target.r;
    expect(shallow).toBeGreaterThan(DESKTOP_FLOOR);
    expect(shallow).toBeLessThan(GAME_ENGINE.BG_PNL_DANGER_MAX_R);

    resolvePnlBackdrop(-0.3, DESKTOP_FLOOR, target);
    expect(target.r).toBeGreaterThan(shallow);

    // PNL_VISUAL_SCALE = 2 -> full alert at -50%, and it stays clamped beyond.
    resolvePnlBackdrop(-0.5, DESKTOP_FLOOR, target);
    expect(target.r).toBeCloseTo(GAME_ENGINE.BG_PNL_DANGER_MAX_R, 5);
    resolvePnlBackdrop(-0.9, DESKTOP_FLOOR, target);
    expect(target.r).toBeCloseTo(GAME_ENGINE.BG_PNL_DANGER_MAX_R, 5);
  });

  it('drains blue and green towards the floor as danger peaks', () => {
    const target = { r: 0, g: 0, b: 0 };

    resolvePnlBackdrop(-0.5, DESKTOP_FLOOR, target);
    expect(target.g).toBeCloseTo(DESKTOP_FLOOR, 5);
    expect(target.b).toBeCloseTo(DESKTOP_FLOOR, 5);
  });

  it('honours the mobile brightness floor', () => {
    const target = { r: 0, g: 0, b: 0 };

    resolvePnlBackdrop(0.2, MOBILE_FLOOR, target);
    expect(target).toEqual(neutral(MOBILE_FLOOR));

    resolvePnlBackdrop(-0.5, MOBILE_FLOOR, target);
    expect(target.g).toBeCloseTo(MOBILE_FLOOR, 5);
  });

  it('writes in place so the RAF loop stays allocation-free', () => {
    const target = { r: 0, g: 0, b: 0 };
    const before = target;

    resolvePnlBackdrop(-0.25, DESKTOP_FLOOR, target);

    expect(target).toBe(before);
  });
});
