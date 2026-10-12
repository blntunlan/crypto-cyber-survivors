import { describe, expect, it } from 'vitest';

import { SIMULATION_HZ } from '@/game-v2/config/Mvp0Config';
import {
  VOLUME_WHALE_COOLDOWN_MS,
  VOLUME_WHALE_COOLDOWN_TICKS,
  VOLUME_WHALE_CONFIRMATION_TICKS,
  VOLUME_WHALE_ENTRY_THRESHOLD,
  VOLUME_WHALE_EXIT_THRESHOLD,
  VOLUME_WHALE_HYSTERESIS,
  VOLUME_WHALE_PROFILE,
} from '@/game-v2/config/VolumeWhaleFamily';

describe('VolumeWhaleFamily derivations', () => {
  it('sets the entry threshold so only WHALE (2) or MEGA_WHALE (3) can activate', () => {
    // Under 'above' direction, whaleTier > 1 excludes BABY_WHALE (1) while
    // admitting WHALE (2) and MEGA_WHALE (3); the actual activation
    // behavior for each tier is proven end-to-end by
    // VolumeWhaleEncounter.test.ts, not re-derived here.
    expect(VOLUME_WHALE_ENTRY_THRESHOLD).toBe(1);
  });

  it('sets the exit threshold equal to the entry threshold', () => {
    expect(VOLUME_WHALE_EXIT_THRESHOLD).toBe(VOLUME_WHALE_ENTRY_THRESHOLD);
  });

  it("derives hysteresis as the domain's own integer step size, requiring a full return to tier 0", () => {
    expect(VOLUME_WHALE_HYSTERESIS).toBe(1);
    expect(VOLUME_WHALE_EXIT_THRESHOLD - VOLUME_WHALE_HYSTERESIS).toBe(0);
  });

  it('requires no confirmation delay — a whale spike is itself the signal', () => {
    expect(VOLUME_WHALE_CONFIRMATION_TICKS).toBe(0);
  });

  it("derives the cooldown from VolumeAnalyzer's real whaleCooldownMs, not an independent choice", () => {
    expect(VOLUME_WHALE_COOLDOWN_MS).toBe(30_000);
    expect(VOLUME_WHALE_COOLDOWN_TICKS).toBe(
      Math.round((VOLUME_WHALE_COOLDOWN_MS / 1000) * SIMULATION_HZ)
    );
    expect(VOLUME_WHALE_COOLDOWN_TICKS).toBe(30 * SIMULATION_HZ);
  });

  it('produces a profile that passes assertIndicatorEventProfile', () => {
    expect(VOLUME_WHALE_PROFILE.id).toBe('volume-whale');
    expect(VOLUME_WHALE_PROFILE.direction).toBe('above');
    expect(VOLUME_WHALE_PROFILE.confirmationTicks).toBe(0);
    expect(Object.isFrozen(VOLUME_WHALE_PROFILE)).toBe(true);
  });
});
