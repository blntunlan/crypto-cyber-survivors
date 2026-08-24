import { describe, expect, it, vi } from 'vitest';

import {
  VOLATILITY_SURGE_ACTIVE_TICKS,
  VOLATILITY_SURGE_TELEGRAPH_TICKS,
} from '@/game-v2/config/VolatilitySurgeFamily';
import { assertWorldEventEncounterOutput } from '@/game-v2/contracts/EncounterOutput';
import { HazardLifecycle } from '@/game-v2/market/HazardLifecycle';
import { VOLATILITY_SURGE_HAZARD_ID } from '@/game-v2/market/VolatilitySurgeEncounter';
import { WorldEventEncounterConsumer } from '@/game-v2/market/WorldEventEncounterConsumer';

const realOutput = assertWorldEventEncounterOutput({
  kind: 'WORLD_EVENT',
  hazardId: VOLATILITY_SURGE_HAZARD_ID,
  telegraphTicks: VOLATILITY_SURGE_TELEGRAPH_TICKS,
});

describe('WorldEventEncounterConsumer', () => {
  it('activates a real volatility-tremor output and reaches ACTIVE at the real telegraph boundary', () => {
    const consumer = new WorldEventEncounterConsumer();
    consumer.activate(realOutput, 0);

    let result = consumer.step(VOLATILITY_SURGE_TELEGRAPH_TICKS - 1);
    expect(result.phase).toBe('TELEGRAPHING');

    result = consumer.step(VOLATILITY_SURGE_TELEGRAPH_TICKS);
    expect(result.phase).toBe('ACTIVE');
    expect(result.hazardId).toBe(VOLATILITY_SURGE_HAZARD_ID);
  });

  it('expires at the real telegraph + active boundary, exactly when a fresh cooldown-cleared activation could arm', () => {
    const consumer = new WorldEventEncounterConsumer();
    consumer.activate(realOutput, 0);

    const expiryTick = VOLATILITY_SURGE_TELEGRAPH_TICKS + VOLATILITY_SURGE_ACTIVE_TICKS;

    let result = consumer.step(expiryTick - 1);
    expect(result.phase).toBe('ACTIVE');

    result = consumer.step(expiryTick);
    expect(result.phase).toBe('IDLE');
    expect(result.hazardId).toBeNull();
  });

  it('throws on an unrecognized hazardId', () => {
    const consumer = new WorldEventEncounterConsumer();
    const unknownOutput = assertWorldEventEncounterOutput({
      kind: 'WORLD_EVENT',
      hazardId: 'liquidity-vacuum',
      telegraphTicks: 5,
    });

    expect(() => consumer.activate(unknownOutput, 0)).toThrow(
      'world event encounter consumer received an unrecognized hazardId: liquidity-vacuum'
    );
  });

  it('delegates activation to the injected HazardLifecycle with the resolved activeTicks', () => {
    const activateSpy = vi.fn();
    const fakeLifecycle = {
      activate: activateSpy,
      step: vi.fn(),
      reset: vi.fn(),
    } as unknown as HazardLifecycle;
    const consumer = new WorldEventEncounterConsumer(fakeLifecycle);

    consumer.activate(realOutput, 7);

    expect(activateSpy).toHaveBeenCalledExactlyOnceWith(
      realOutput,
      VOLATILITY_SURGE_ACTIVE_TICKS,
      7
    );
  });

  it('honours an injected known-hazard-id-to-activeTicks map over the default', () => {
    const consumer = new WorldEventEncounterConsumer(
      new HazardLifecycle(),
      new Map([['liquidity-vacuum', 42]])
    );

    expect(() => consumer.activate(realOutput, 0)).toThrow(
      `world event encounter consumer received an unrecognized hazardId: ${VOLATILITY_SURGE_HAZARD_ID}`
    );

    const otherOutput = assertWorldEventEncounterOutput({
      kind: 'WORLD_EVENT',
      hazardId: 'liquidity-vacuum',
      telegraphTicks: 5,
    });
    expect(() => consumer.activate(otherOutput, 0)).not.toThrow();
  });

  it('resets the underlying lifecycle', () => {
    const resetSpy = vi.fn();
    const fakeLifecycle = {
      activate: vi.fn(),
      step: vi.fn(),
      reset: resetSpy,
    } as unknown as HazardLifecycle;
    const consumer = new WorldEventEncounterConsumer(fakeLifecycle);

    consumer.reset();

    expect(resetSpy).toHaveBeenCalledOnce();
  });
});
