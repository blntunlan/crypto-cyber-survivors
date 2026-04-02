import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GameLoopCoordinator,
  type GameLoopPhase,
} from '../../../../services/gameplay/loop/GameLoopCoordinator';
import type { TickContext } from '../../../../services/gameplay/contracts';

const makeTick = (): TickContext =>
  ({
    clock: { frame: 1, nowMs: 1000, deltaMs: 16.6, elapsedMs: 1000 },
    status: 'PLAYING',
    dimensions: { width: 800, height: 600 },
    world: {
      player: { current: null },
      gameState: { current: {} },
      pool: { current: {} },
    },
    marketData: {},
    telemetry: { phaseDurationsMs: {}, counters: {}, marks: {} },
  }) as unknown as TickContext;

describe('GameLoopCoordinator', () => {
  let phaseA: GameLoopPhase;
  let phaseB: GameLoopPhase;

  beforeEach(() => {
    phaseA = { id: 'phaseA', execute: vi.fn() };
    phaseB = { id: 'phaseB', execute: vi.fn() };
  });

  it('runTickSync executes phases in order', () => {
    const order: string[] = [];
    phaseA.execute = vi.fn(() => {
      order.push('A');
    });
    phaseB.execute = vi.fn(() => {
      order.push('B');
    });

    const coordinator = new GameLoopCoordinator([phaseA, phaseB]);
    const result = coordinator.runTickSync(makeTick());

    expect(order).toEqual(['A', 'B']);
    expect(result.completedPhaseIds).toEqual(['phaseA', 'phaseB']);
    expect(result.errors).toHaveLength(0);
  });

  it('runTickSync collects errors by default and continues', () => {
    phaseA.execute = vi.fn(() => {
      throw new Error('boom');
    });

    const coordinator = new GameLoopCoordinator([phaseA, phaseB]);
    const result = coordinator.runTickSync(makeTick());

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.phaseId).toBe('phaseA');
    expect(result.completedPhaseIds).toEqual(['phaseB']);
  });

  it('runTickSync throws on error when errorPolicy is throw', () => {
    phaseA.execute = vi.fn(() => {
      throw new Error('fatal');
    });

    const coordinator = new GameLoopCoordinator([phaseA, phaseB], {
      errorPolicy: 'throw',
    });

    expect(() => coordinator.runTickSync(makeTick())).toThrow('fatal');
  });

  it('runTickSync reuses pre-allocated result object across frames', () => {
    const coordinator = new GameLoopCoordinator([phaseA]);
    const r1 = coordinator.runTickSync(makeTick());
    const r2 = coordinator.runTickSync(makeTick());

    // Same object reference (zero-alloc)
    expect(r1).toBe(r2);
  });

  it('runTickSync calls beforePhase and afterPhase hooks', () => {
    const beforePhase = vi.fn();
    const afterPhase = vi.fn();

    const coordinator = new GameLoopCoordinator([phaseA], {
      hooks: { beforePhase, afterPhase },
    });
    coordinator.runTickSync(makeTick());

    expect(beforePhase).toHaveBeenCalledTimes(1);
    expect(afterPhase).toHaveBeenCalledTimes(1);
    expect(afterPhase).toHaveBeenCalledWith(phaseA, expect.anything(), false);
  });

  it('runTickSync passes phaseHadError=true to afterPhase when phase throws', () => {
    phaseA.execute = vi.fn(() => {
      throw new Error('fail');
    });
    const afterPhase = vi.fn();

    const coordinator = new GameLoopCoordinator([phaseA], {
      hooks: { afterPhase },
    });
    coordinator.runTickSync(makeTick());

    expect(afterPhase).toHaveBeenCalledWith(phaseA, expect.anything(), true);
  });

  it('async runTick executes phases sequentially', async () => {
    const order: string[] = [];
    phaseA.execute = vi.fn(async () => {
      order.push('A');
    });
    phaseB.execute = vi.fn(async () => {
      order.push('B');
    });

    const coordinator = new GameLoopCoordinator([phaseA, phaseB]);
    const result = await coordinator.runTick(makeTick());

    expect(order).toEqual(['A', 'B']);
    expect(result.completedPhaseIds).toEqual(['phaseA', 'phaseB']);
  });

  it('runTickSync detects async phase and throws', () => {
    phaseA.execute = vi.fn(async () => {
      /* async */
    });

    const coordinator = new GameLoopCoordinator([phaseA]);
    const result = coordinator.runTickSync(makeTick());

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.stage).toBe('phase');
  });

  it('getPhaseOrder returns phases in registration order', () => {
    const coordinator = new GameLoopCoordinator([phaseA, phaseB]);
    const order = coordinator.getPhaseOrder();
    expect(order[0]!.id).toBe('phaseA');
    expect(order[1]!.id).toBe('phaseB');
  });
});
