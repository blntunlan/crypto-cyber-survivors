import { EventBus } from './EventBus';

/**
 * Priority bands for reset handlers.
 *
 *   0- 99: Core (EventBus, TimeService)
 * 100-199: Data (DifficultyContext, MetricsService)
 * 200-299: Game systems (FlowState, LeverageEngine, PoolManager)
 * 300-399: Gameplay (Portal, Combat, BuffManager)
 * 400-499: UI/Visual
 */
export const RESET_PRIORITY = {
  CORE: 0,
  DATA: 100,
  DIFFICULTY_RUNTIME: 125,
  GAME_SYSTEMS: 200,
  GAMEPLAY: 300,
  UI: 400,
} as const;

interface ResetHandler {
  priority: number;
  name: string;
  handler: () => void;
  /**
   * Optional dev-only cleanliness assertion. Called after the reset pass in
   * DEV/test builds; returning `false` means the system still holds run state
   * after its own `reset()` ran — i.e. a leak. See {@link Resettable}.
   */
  debugIsClean?: () => boolean;
}

/**
 * Canonical contract for any system that holds per-run state and must be
 * cleared on a new game. Register with {@link ResetOrchestratorClass.registerResettable}.
 *
 * This is the single, verifiable reset path (the "GameLifecycle"): handlers run
 * in deterministic priority order, and `debugIsClean` lets DEV builds catch a
 * system that forgot to clear a field — the class of bug that silently leaked a
 * weapon from one run into the next.
 */
export interface Resettable {
  /** Human-readable name for debugging and leak reports. */
  resetName: string;
  /** Priority band (use RESET_PRIORITY constants); lower runs first. */
  resetPriority: number;
  /** Clear all per-run state. Must be idempotent. */
  reset(): void;
  /**
   * Optional: return `true` when no run state remains after `reset()`.
   * Used only in DEV/test for leak detection; never called in production.
   */
  debugIsClean?(): boolean;
}

/**
 * ResetOrchestrator — guarantees deterministic reset order.
 *
 * Services register their reset handlers with a priority.
 * When `orchestrateReset()` is called, handlers run in ascending
 * priority order, eliminating race conditions from unordered
 * EventBus listeners.
 *
 * The legacy `gameReset` event is still emitted after orchestrated
 * handlers complete, for backward compatibility during migration.
 */
class ResetOrchestratorClass {
  private static instance: ResetOrchestratorClass | null = null;
  private handlers: ResetHandler[] = [];
  private sorted = false;

  private constructor() {}

  static getInstance(): ResetOrchestratorClass {
    return (ResetOrchestratorClass.instance ??= new ResetOrchestratorClass());
  }

  /**
   * Register a reset handler with a priority.
   * Lower priority = runs first.
   *
   * @param priority Priority band (use RESET_PRIORITY constants)
   * @param name Human-readable name for debugging
   * @param handler Reset function to call
   * @returns Unregister function
   */
  registerResetHandler(
    priority: number,
    name: string,
    handler: () => void
  ): () => void {
    const entry: ResetHandler = { priority, name, handler };
    this.handlers.push(entry);
    this.sorted = false;

    return () => {
      const idx = this.handlers.indexOf(entry);
      if (idx >= 0) {
        this.handlers.splice(idx, 1);
      }
    };
  }

  /**
   * Register a {@link Resettable} system. Preferred over `registerResetHandler`
   * because it also captures `debugIsClean` for DEV leak detection.
   *
   * @returns Unregister function
   */
  registerResettable(system: Resettable): () => void {
    const entry: ResetHandler = {
      priority: system.resetPriority,
      name: system.resetName,
      handler: () => system.reset(),
      debugIsClean: system.debugIsClean ? () => system.debugIsClean!() : undefined,
    };
    this.handlers.push(entry);
    this.sorted = false;

    return () => {
      const idx = this.handlers.indexOf(entry);
      if (idx >= 0) {
        this.handlers.splice(idx, 1);
      }
    };
  }

  /**
   * Execute all reset handlers in priority order, then emit `gameReset`.
   * In DEV/test builds, verify each registered system is clean afterwards.
   */
  orchestrateReset(): void {
    if (!this.sorted) {
      this.handlers.sort((a, b) => a.priority - b.priority);
      this.sorted = true;
    }

    for (let i = 0; i < this.handlers.length; i++) {
      const h = this.handlers[i]!;
      try {
        h.handler();
      } catch (err) {
        console.error(`[ResetOrchestrator] Error in handler '${h.name}':`, err);
      }
    }

    // Emit legacy event for services not yet migrated
    EventBus.emit('gameReset', {} as Record<string, never>);

    // DEV-only leak detection: after every system has reset (including the
    // legacy `gameReset` subscribers above), assert nothing still holds run
    // state. Loud console.error so leaks surface immediately during play/tests.
    this.verifyCleanState();
  }

  /**
   * DEV/test-only: call every registered `debugIsClean()` and report leaks.
   * No-op in production (tree-shaken via `import.meta.env.DEV`).
   */
  private verifyCleanState(): void {
    if (!import.meta.env.DEV) return;

    for (let i = 0; i < this.handlers.length; i++) {
      const h = this.handlers[i]!;
      if (!h.debugIsClean) continue;
      let clean: boolean;
      try {
        clean = h.debugIsClean();
      } catch (err) {
        console.error(`[GameLifecycle] LEAK CHECK threw for '${h.name}':`, err);
        continue;
      }
      if (!clean) {
        console.error(
          `[GameLifecycle] LEAK: '${h.name}' still holds run state after reset. ` +
            `Its reset() likely forgot to clear a field.`
        );
      }
    }
  }

  /**
   * Get registered handlers (for debugging)
   */
  getRegisteredHandlers(): Array<{ priority: number; name: string }> {
    return this.handlers.map(h => ({ priority: h.priority, name: h.name }));
  }

  /**
   * Reset the orchestrator itself (for testing)
   */
  reset(): void {
    this.handlers = [];
    this.sorted = false;
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.reset();
      this.instance = null;
    }
  }
}

export const ResetOrchestrator = ResetOrchestratorClass.getInstance();
