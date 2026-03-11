export enum GameplaySessionState {
  BOOT = 'boot',
  MAIN_MENU = 'main_menu',
  RUN_LOADING = 'run_loading',
  RUN_ACTIVE = 'run_active',
  RUN_PAUSED = 'run_paused',
  RUN_RESULTS = 'run_results',
}

const GAMEPLAY_SESSION_TRANSITIONS: Readonly<
  Record<GameplaySessionState, readonly GameplaySessionState[]>
> = {
  [GameplaySessionState.BOOT]: [GameplaySessionState.MAIN_MENU],
  [GameplaySessionState.MAIN_MENU]: [GameplaySessionState.RUN_LOADING],
  [GameplaySessionState.RUN_LOADING]: [
    GameplaySessionState.MAIN_MENU,
    GameplaySessionState.RUN_ACTIVE,
  ],
  [GameplaySessionState.RUN_ACTIVE]: [
    GameplaySessionState.RUN_PAUSED,
    GameplaySessionState.RUN_RESULTS,
    GameplaySessionState.MAIN_MENU,
  ],
  [GameplaySessionState.RUN_PAUSED]: [
    GameplaySessionState.RUN_ACTIVE,
    GameplaySessionState.RUN_RESULTS,
    GameplaySessionState.MAIN_MENU,
  ],
  [GameplaySessionState.RUN_RESULTS]: [
    GameplaySessionState.MAIN_MENU,
    GameplaySessionState.RUN_LOADING,
  ],
};

export const canTransitionGameplaySessionState = (
  fromState: GameplaySessionState,
  toState: GameplaySessionState
): boolean => {
  return GAMEPLAY_SESSION_TRANSITIONS[fromState].includes(toState);
};

export interface GameplaySessionTransition {
  from: GameplaySessionState;
  to: GameplaySessionState;
  reason?: string;
  timestampMs: number;
}

export interface GameplaySessionTransitionResult {
  accepted: boolean;
  transition?: GameplaySessionTransition;
  reason?: string;
}

export interface GameplaySessionOrchestratorOptions {
  initialState?: GameplaySessionState;
  now?: () => number;
  onTransition?: (transition: GameplaySessionTransition) => void;
}

const defaultNow = (): number => Date.now();

export class GameplaySessionOrchestrator {
  private currentState: GameplaySessionState;
  private readonly now: () => number;
  private readonly onTransition:
    | ((transition: GameplaySessionTransition) => void)
    | undefined;

  constructor(options: GameplaySessionOrchestratorOptions = {}) {
    this.currentState = options.initialState ?? GameplaySessionState.BOOT;
    this.now = options.now ?? defaultNow;
    this.onTransition = options.onTransition;
  }

  public getState(): GameplaySessionState {
    return this.currentState;
  }

  public canTransition(toState: GameplaySessionState): boolean {
    return canTransitionGameplaySessionState(this.currentState, toState);
  }

  public transitionTo(
    toState: GameplaySessionState,
    reason?: string
  ): GameplaySessionTransitionResult {
    const fromState = this.currentState;
    if (!canTransitionGameplaySessionState(fromState, toState)) {
      return {
        accepted: false,
        reason: `Invalid session transition: ${fromState} -> ${toState}`,
      };
    }

    this.currentState = toState;
    const transition: GameplaySessionTransition = {
      from: fromState,
      to: toState,
      reason,
      timestampMs: this.now(),
    };

    this.onTransition?.(transition);

    return {
      accepted: true,
      transition,
    };
  }

  public reset(toState: GameplaySessionState = GameplaySessionState.BOOT): void {
    this.currentState = toState;
  }
}
