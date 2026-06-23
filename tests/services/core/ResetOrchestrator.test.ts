import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  ResetOrchestrator,
  RESET_PRIORITY,
  type Resettable,
} from '../../../services/core/ResetOrchestrator';

describe('ResetOrchestrator (GameLifecycle)', () => {
  beforeEach(() => {
    ResetOrchestrator.reset(); // clear registered handlers between tests
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs registered resettables in ascending priority order', () => {
    const order: string[] = [];
    const make = (name: string, priority: number): Resettable => ({
      resetName: name,
      resetPriority: priority,
      reset: () => order.push(name),
    });

    // Register out of order; orchestrator must sort by priority.
    ResetOrchestrator.registerResettable(make('gameplay', RESET_PRIORITY.GAMEPLAY));
    ResetOrchestrator.registerResettable(make('core', RESET_PRIORITY.CORE));
    ResetOrchestrator.registerResettable(make('data', RESET_PRIORITY.DATA));

    ResetOrchestrator.orchestrateReset();

    expect(order).toEqual(['core', 'data', 'gameplay']);
  });

  it('reports a LEAK when a registered system is not clean after reset', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // A system whose reset() forgot to clear its state — debugIsClean stays false.
    ResetOrchestrator.registerResettable({
      resetName: 'LeakySystem',
      resetPriority: RESET_PRIORITY.GAMEPLAY,
      reset: () => {
        /* oops: forgot to clear */
      },
      debugIsClean: () => false,
    });

    ResetOrchestrator.orchestrateReset();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("LEAK: 'LeakySystem'")
    );
  });

  it('does NOT report a leak when the system is clean after reset', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let dirty = true;
    ResetOrchestrator.registerResettable({
      resetName: 'CleanSystem',
      resetPriority: RESET_PRIORITY.GAMEPLAY,
      reset: () => {
        dirty = false;
      },
      debugIsClean: () => !dirty,
    });

    ResetOrchestrator.orchestrateReset();

    const leakCalls = errorSpy.mock.calls.filter(
      args => typeof args[0] === 'string' && args[0].includes('LEAK')
    );
    expect(leakCalls).toHaveLength(0);
  });

  it('still invokes legacy registerResetHandler entries', () => {
    const handler = vi.fn();
    ResetOrchestrator.registerResetHandler(RESET_PRIORITY.UI, 'legacy', handler);

    ResetOrchestrator.orchestrateReset();

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
