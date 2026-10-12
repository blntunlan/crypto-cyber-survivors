import { describe, expect, it } from 'vitest';

import { assertWorldEventEncounterOutput } from '@/game-v2/contracts/EncounterOutput';
import { HazardLifecycle } from '@/game-v2/market/HazardLifecycle';

const output = (telegraphTicks: number, hazardId = 'test-hazard') =>
  assertWorldEventEncounterOutput({
    kind: 'WORLD_EVENT',
    hazardId,
    telegraphTicks,
  });

describe('HazardLifecycle', () => {
  it('starts IDLE with no hazard', () => {
    const lifecycle = new HazardLifecycle();

    expect(lifecycle.currentPhase).toBe('IDLE');
  });

  it('transitions TELEGRAPHING -> ACTIVE -> IDLE exactly on the derived boundary ticks', () => {
    const lifecycle = new HazardLifecycle();
    lifecycle.activate(output(3, 'quake'), 2, 10);

    expect(lifecycle.currentPhase).toBe('TELEGRAPHING');

    let result = lifecycle.step(11);
    expect(result).toEqual({
      phase: 'TELEGRAPHING',
      hazardId: 'quake',
      activatedThisTick: false,
      expiredThisTick: false,
    });

    result = lifecycle.step(12);
    expect(result.phase).toBe('TELEGRAPHING');
    expect(result.activatedThisTick).toBe(false);

    // Activation lands exactly telegraphTicks (3) ticks after the arm tick (10 -> 13).
    result = lifecycle.step(13);
    expect(result).toEqual({
      phase: 'ACTIVE',
      hazardId: 'quake',
      activatedThisTick: true,
      expiredThisTick: false,
    });

    result = lifecycle.step(14);
    expect(result.phase).toBe('ACTIVE');
    expect(result.expiredThisTick).toBe(false);

    // Expiry lands exactly activeTicks (2) ticks after activation (13 -> 15).
    result = lifecycle.step(15);
    expect(result).toEqual({
      phase: 'IDLE',
      hazardId: null,
      activatedThisTick: false,
      expiredThisTick: true,
    });
  });

  it('rejects activating a second hazard while one is in flight', () => {
    const lifecycle = new HazardLifecycle();
    lifecycle.activate(output(2), 2, 0);

    expect(() => lifecycle.activate(output(2), 2, 1)).toThrow(
      'hazard lifecycle cannot activate a second hazard while one is in flight'
    );
  });

  it('rejects a non-positive or non-integer activeTicks', () => {
    for (const activeTicks of [0, -1, 1.5]) {
      const lifecycle = new HazardLifecycle();
      expect(() => lifecycle.activate(output(2), activeTicks, 0)).toThrow(
        'active ticks must be a positive integer'
      );
      expect(lifecycle.currentPhase).toBe('IDLE');
    }
  });

  it('rejects a non-increasing tick between activate()/step() calls', () => {
    const lifecycle = new HazardLifecycle();
    lifecycle.activate(output(2), 2, 5);

    expect(() => lifecycle.step(5)).toThrow(
      'tick must strictly increase between activate()/step() calls'
    );
    expect(() => lifecycle.step(4)).toThrow(
      'tick must strictly increase between activate()/step() calls'
    );
  });

  it('resets to a fresh IDLE state and allows a new activation cycle', () => {
    const lifecycle = new HazardLifecycle();
    lifecycle.activate(output(2, 'quake'), 2, 0);
    lifecycle.step(1);

    lifecycle.reset();

    expect(lifecycle.currentPhase).toBe('IDLE');

    // A fresh cycle can restart ticks from 0 without a monotonic-tick violation.
    lifecycle.activate(output(2, 'quake'), 2, 0);
    const result = lifecycle.step(1);
    expect(result.phase).toBe('TELEGRAPHING');
  });
});
