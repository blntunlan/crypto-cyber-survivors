import { describe, expect, it, vi } from 'vitest';
import { GameStatus } from '../../../types';
import type { TickContext } from '../../../services/gameplay/contracts';
import {
  GameLoopCoordinator,
  type GameLoopPhase,
} from '../../../services/gameplay/loop/GameLoopCoordinator';

const createContext = (): TickContext =>
  ({
    clock: {
      frame: 1,
      nowMs: 1000,
      deltaMs: 16,
      elapsedMs: 1000,
    },
    status: GameStatus.PLAYING,
    dimensions: {
      width: 1280,
      height: 720,
    },
    world: {
      player: { current: null },
      gameState: { current: {} as never },
      pool: {
        current: {
          activeEnemies: [],
          activeBullets: [],
          activeGems: [],
          activeParticles: [],
        },
      },
    },
    marketData: {} as never,
    telemetry: {},
  }) as TickContext;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

describe('GameLoopCoordinator', () => {
  it('executes phases in configured order', async () => {
    const context = createContext();
    const order: string[] = [];
    const phases: GameLoopPhase<TickContext>[] = ['clock', 'input', 'combat'].map(
      id => ({
        id,
        execute: vi.fn(() => {
          order.push(id);
        }),
      })
    );
    const coordinator = new GameLoopCoordinator(phases);

    const result = await coordinator.runTick(context);

    expect(order).toEqual(['clock', 'input', 'combat']);
    expect(result.completedPhaseIds).toEqual(['clock', 'input', 'combat']);
    expect(result.errors).toEqual([]);
  });

  it('collects errors and continues phase execution when error policy is collect', async () => {
    const context = createContext();
    const firstError = new Error('phase one failed');
    const thirdError = new Error('phase three failed');
    const runOrder: string[] = [];
    const phases: GameLoopPhase<TickContext>[] = [
      {
        id: 'phase-one',
        execute: vi.fn(() => {
          runOrder.push('phase-one');
          throw firstError;
        }),
      },
      {
        id: 'phase-two',
        execute: vi.fn(() => {
          runOrder.push('phase-two');
        }),
      },
      {
        id: 'phase-three',
        execute: vi.fn(() => {
          runOrder.push('phase-three');
          throw thirdError;
        }),
      },
    ];
    const coordinator = new GameLoopCoordinator(phases, { errorPolicy: 'collect' });

    const result = await coordinator.runTick(context);

    expect(runOrder).toEqual(['phase-one', 'phase-two', 'phase-three']);
    expect(result.completedPhaseIds).toEqual(['phase-two']);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toMatchObject({
      phaseId: 'phase-one',
      stage: 'phase',
      context,
    });
    expect(result.errors[0]?.error).toBe(firstError);
    expect(result.errors[1]).toMatchObject({
      phaseId: 'phase-three',
      stage: 'phase',
      context,
    });
    expect(result.errors[1]?.error).toBe(thirdError);
  });

  it('throws the first phase error when error policy is throw', async () => {
    const context = createContext();
    const firstError = new Error('stop immediately');
    const secondExecute = vi.fn();
    const phases: GameLoopPhase<TickContext>[] = [
      {
        id: 'phase-one',
        execute: vi.fn(() => {
          throw firstError;
        }),
      },
      {
        id: 'phase-two',
        execute: secondExecute,
      },
    ];
    const coordinator = new GameLoopCoordinator(phases, { errorPolicy: 'throw' });

    await expect(coordinator.runTick(context)).rejects.toBe(firstError);
    expect(secondExecute).not.toHaveBeenCalled();
  });

  it('calls beforePhase and afterPhase hooks with expected phase ids', async () => {
    const context = createContext();
    const phaseError = new Error('phase failure');
    const beforePhase = vi.fn();
    const afterPhase = vi.fn();
    const phases: GameLoopPhase<TickContext>[] = [
      { id: 'clock', execute: vi.fn(() => undefined) },
      {
        id: 'combat',
        execute: vi.fn(() => {
          throw phaseError;
        }),
      },
    ];
    const coordinator = new GameLoopCoordinator(phases, {
      errorPolicy: 'collect',
      hooks: {
        beforePhase,
        afterPhase,
      },
    });

    await coordinator.runTick(context);

    expect(beforePhase).toHaveBeenCalledTimes(2);
    expect(beforePhase).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'clock' }),
      context
    );
    expect(beforePhase).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'combat' }),
      context
    );

    expect(afterPhase).toHaveBeenCalledTimes(2);
    expect(afterPhase).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'clock' }),
      context,
      false
    );
    expect(afterPhase).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'combat' }),
      context,
      true
    );
  });

  it('passes phase error details to onError hook', async () => {
    const context = createContext();
    const phaseError = new Error('boom');
    const onError = vi.fn();
    const phases: GameLoopPhase<TickContext>[] = [
      {
        id: 'combat',
        execute: vi.fn(() => {
          throw phaseError;
        }),
      },
    ];
    const coordinator = new GameLoopCoordinator(phases, {
      errorPolicy: 'collect',
      hooks: {
        onError,
      },
    });

    const result = await coordinator.runTick(context);

    expect(result.errors).toHaveLength(1);
    expect(onError).toHaveBeenCalledTimes(1);
    const received = onError.mock.calls[0]?.[0];
    expect(received).toMatchObject({
      phaseId: 'combat',
      stage: 'phase',
      context,
    });
    expect(received?.error).toBe(phaseError);
  });

  it('runTickSync records async phase usage under collect policy and continues', () => {
    const context = createContext();
    const asyncPhaseExecute = vi.fn(() => Promise.resolve());
    const syncPhaseExecute = vi.fn();
    const phases: GameLoopPhase<TickContext>[] = [
      {
        id: 'async-phase',
        execute: asyncPhaseExecute,
      },
      {
        id: 'sync-phase',
        execute: syncPhaseExecute,
      },
    ];
    const coordinator = new GameLoopCoordinator(phases, { errorPolicy: 'collect' });

    const result = coordinator.runTickSync(context);

    expect(asyncPhaseExecute).toHaveBeenCalledTimes(1);
    expect(syncPhaseExecute).toHaveBeenCalledTimes(1);
    expect(result.completedPhaseIds).toEqual(['sync-phase']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      phaseId: 'async-phase',
      stage: 'phase',
      context,
    });
    expect(getErrorMessage(result.errors[0]?.error)).toContain(
      'runTickSync received an async phase/hook'
    );
  });

  it('runTickSync records async hook usage under collect policy', () => {
    const context = createContext();
    const execute = vi.fn();
    const phases: GameLoopPhase<TickContext>[] = [{ id: 'clock', execute }];
    const coordinator = new GameLoopCoordinator(phases, {
      errorPolicy: 'collect',
      hooks: {
        beforePhase: vi.fn(() => Promise.resolve()),
      },
    });

    const result = coordinator.runTickSync(context);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.completedPhaseIds).toEqual(['clock']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      phaseId: 'clock',
      stage: 'beforePhase',
      context,
    });
    expect(getErrorMessage(result.errors[0]?.error)).toContain(
      'runTickSync received an async phase/hook'
    );
  });

  it('runTickSync throws on async hook usage under throw policy', () => {
    const context = createContext();
    const execute = vi.fn();
    const phases: GameLoopPhase<TickContext>[] = [{ id: 'clock', execute }];
    const coordinator = new GameLoopCoordinator(phases, {
      errorPolicy: 'throw',
      hooks: {
        beforePhase: () => Promise.resolve(),
      },
    });

    expect(() => coordinator.runTickSync(context)).toThrowError(
      /runTickSync received an async phase\/hook/
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('runTickSync throws on async phase usage under throw policy', () => {
    const context = createContext();
    const asyncPhaseExecute = vi.fn(() => Promise.resolve());
    const coordinator = new GameLoopCoordinator(
      [{ id: 'async-phase', execute: asyncPhaseExecute }],
      { errorPolicy: 'throw' }
    );

    expect(() => coordinator.runTickSync(context)).toThrowError(
      /runTickSync received an async phase\/hook/
    );
    expect(asyncPhaseExecute).toHaveBeenCalledTimes(1);
  });
});
