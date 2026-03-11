import type { TickContext } from '../contracts';

export interface GameLoopPhase<TContext extends TickContext = TickContext> {
  id: string;
  execute: (context: TContext) => void | Promise<void>;
}

export type GameLoopErrorPolicy = 'collect' | 'throw';

export type GameLoopErrorStage = 'beforePhase' | 'phase' | 'afterPhase' | 'onError';

export interface GameLoopPhaseError<TContext extends TickContext = TickContext> {
  phaseId: string;
  stage: GameLoopErrorStage;
  error: unknown;
  context: TContext;
}

export interface GameLoopCoordinatorHooks<TContext extends TickContext = TickContext> {
  beforePhase?: (
    phase: GameLoopPhase<TContext>,
    context: TContext
  ) => void | Promise<void>;
  afterPhase?: (
    phase: GameLoopPhase<TContext>,
    context: TContext,
    phaseHadError: boolean
  ) => void | Promise<void>;
  onError?: (phaseError: GameLoopPhaseError<TContext>) => void | Promise<void>;
}

export interface GameLoopCoordinatorOptions<
  TContext extends TickContext = TickContext,
> {
  errorPolicy?: GameLoopErrorPolicy;
  hooks?: GameLoopCoordinatorHooks<TContext>;
}

export interface GameLoopTickResult<TContext extends TickContext = TickContext> {
  completedPhaseIds: string[];
  errors: GameLoopPhaseError<TContext>[];
}

const DEFAULT_ERROR_POLICY: GameLoopErrorPolicy = 'collect';
const SYNC_MODE_ASYNC_ERROR =
  'GameLoopCoordinator.runTickSync received an async phase/hook. Use runTick for async execution.';

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(
    `GameLoopCoordinator encountered a non-Error throw value: ${String(error)}`
  );
};

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
};

export class GameLoopCoordinator<TContext extends TickContext = TickContext> {
  private readonly phases: ReadonlyArray<GameLoopPhase<TContext>>;
  private readonly hooks: GameLoopCoordinatorHooks<TContext> | undefined;
  private readonly errorPolicy: GameLoopErrorPolicy;

  constructor(
    phases: readonly GameLoopPhase<TContext>[],
    options: GameLoopCoordinatorOptions<TContext> = {}
  ) {
    this.phases = [...phases];
    this.hooks = options.hooks;
    this.errorPolicy = options.errorPolicy ?? DEFAULT_ERROR_POLICY;
  }

  public getPhaseOrder(): ReadonlyArray<GameLoopPhase<TContext>> {
    return this.phases;
  }

  public async runTick(context: TContext): Promise<GameLoopTickResult<TContext>> {
    const result: GameLoopTickResult<TContext> = {
      completedPhaseIds: [],
      errors: [],
    };

    for (const phase of this.phases) {
      await this.invokeBeforePhase(phase, context, result);

      let phaseHadError = false;
      try {
        await phase.execute(context);
        result.completedPhaseIds.push(phase.id);
      } catch (error: unknown) {
        phaseHadError = true;
        await this.recordError(
          {
            phaseId: phase.id,
            stage: 'phase',
            error,
            context,
          },
          result
        );
      }

      await this.invokeAfterPhase(phase, context, phaseHadError, result);
    }

    return result;
  }

  public runTickSync(context: TContext): GameLoopTickResult<TContext> {
    const result: GameLoopTickResult<TContext> = {
      completedPhaseIds: [],
      errors: [],
    };

    for (const phase of this.phases) {
      this.invokeBeforePhaseSync(phase, context, result);

      let phaseHadError = false;
      try {
        const execution = phase.execute(context);
        if (isPromiseLike(execution)) {
          throw new Error(SYNC_MODE_ASYNC_ERROR);
        }
        result.completedPhaseIds.push(phase.id);
      } catch (error: unknown) {
        phaseHadError = true;
        this.recordErrorSync(
          {
            phaseId: phase.id,
            stage: 'phase',
            error,
            context,
          },
          result
        );
      }

      this.invokeAfterPhaseSync(phase, context, phaseHadError, result);
    }

    return result;
  }

  private async invokeBeforePhase(
    phase: GameLoopPhase<TContext>,
    context: TContext,
    result: GameLoopTickResult<TContext>
  ): Promise<void> {
    if (!this.hooks?.beforePhase) {
      return;
    }

    try {
      await this.hooks.beforePhase(phase, context);
    } catch (error: unknown) {
      await this.recordError(
        {
          phaseId: phase.id,
          stage: 'beforePhase',
          error,
          context,
        },
        result
      );
    }
  }

  private async invokeAfterPhase(
    phase: GameLoopPhase<TContext>,
    context: TContext,
    phaseHadError: boolean,
    result: GameLoopTickResult<TContext>
  ): Promise<void> {
    if (!this.hooks?.afterPhase) {
      return;
    }

    try {
      await this.hooks.afterPhase(phase, context, phaseHadError);
    } catch (error: unknown) {
      await this.recordError(
        {
          phaseId: phase.id,
          stage: 'afterPhase',
          error,
          context,
        },
        result
      );
    }
  }

  private invokeBeforePhaseSync(
    phase: GameLoopPhase<TContext>,
    context: TContext,
    result: GameLoopTickResult<TContext>
  ): void {
    if (!this.hooks?.beforePhase) {
      return;
    }

    try {
      const hookResult = this.hooks.beforePhase(phase, context);
      if (isPromiseLike(hookResult)) {
        throw new Error(SYNC_MODE_ASYNC_ERROR);
      }
    } catch (error: unknown) {
      this.recordErrorSync(
        {
          phaseId: phase.id,
          stage: 'beforePhase',
          error,
          context,
        },
        result
      );
    }
  }

  private invokeAfterPhaseSync(
    phase: GameLoopPhase<TContext>,
    context: TContext,
    phaseHadError: boolean,
    result: GameLoopTickResult<TContext>
  ): void {
    if (!this.hooks?.afterPhase) {
      return;
    }

    try {
      const hookResult = this.hooks.afterPhase(phase, context, phaseHadError);
      if (isPromiseLike(hookResult)) {
        throw new Error(SYNC_MODE_ASYNC_ERROR);
      }
    } catch (error: unknown) {
      this.recordErrorSync(
        {
          phaseId: phase.id,
          stage: 'afterPhase',
          error,
          context,
        },
        result
      );
    }
  }

  private async recordError(
    phaseError: GameLoopPhaseError<TContext>,
    result: GameLoopTickResult<TContext>
  ): Promise<void> {
    result.errors.push(phaseError);

    if (this.hooks?.onError) {
      try {
        await this.hooks.onError(phaseError);
      } catch (error: unknown) {
        result.errors.push({
          phaseId: phaseError.phaseId,
          stage: 'onError',
          error,
          context: phaseError.context,
        });
        this.maybeThrow(error);
      }
    }

    this.maybeThrow(phaseError.error);
  }

  private recordErrorSync(
    phaseError: GameLoopPhaseError<TContext>,
    result: GameLoopTickResult<TContext>
  ): void {
    result.errors.push(phaseError);

    if (this.hooks?.onError) {
      try {
        const hookResult = this.hooks.onError(phaseError);
        if (isPromiseLike(hookResult)) {
          throw new Error(SYNC_MODE_ASYNC_ERROR);
        }
      } catch (error: unknown) {
        result.errors.push({
          phaseId: phaseError.phaseId,
          stage: 'onError',
          error,
          context: phaseError.context,
        });
        this.maybeThrow(error);
      }
    }

    this.maybeThrow(phaseError.error);
  }

  private maybeThrow(error: unknown): void {
    if (this.errorPolicy === 'throw') {
      throw toError(error);
    }
  }
}
