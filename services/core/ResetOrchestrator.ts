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
  GAME_SYSTEMS: 200,
  GAMEPLAY: 300,
  UI: 400,
} as const;

interface ResetHandler {
  priority: number;
  name: string;
  handler: () => void;
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
   * Execute all reset handlers in priority order, then emit `gameReset`.
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
