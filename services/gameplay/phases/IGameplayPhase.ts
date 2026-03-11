import type { PhaseInput, PhaseResult } from '../contracts';

export type GameplayPhaseName = 'input' | 'combat' | 'spawn' | 'physics' | 'effects';

export interface BaselinePhaseMetadata<
  TPhase extends GameplayPhaseName = GameplayPhaseName,
> {
  readonly phase: TPhase;
  readonly baseline: true;
  readonly mode: 'pass-through';
}

export type BaselinePhaseShared<TPhase extends GameplayPhaseName = GameplayPhaseName> =
  Record<string, unknown> & {
    readonly __phase: BaselinePhaseMetadata<TPhase>;
  };

export type BaselinePhaseResult<TPhase extends GameplayPhaseName> = PhaseResult<
  TPhase,
  BaselinePhaseShared<TPhase>
>;

export interface IGameplayPhase<TPhase extends GameplayPhaseName = GameplayPhaseName> {
  readonly phase: TPhase;
  execute(_input: PhaseInput<TPhase>): BaselinePhaseResult<TPhase>;
}

/**
 * Shared deterministic result used by scaffold phases.
 */
export const createBaselinePhaseResult = <TPhase extends GameplayPhaseName>(
  phase: TPhase
): BaselinePhaseResult<TPhase> => ({
  phase,
  control: 'continue',
  shared: {
    __phase: {
      phase,
      baseline: true,
      mode: 'pass-through',
    },
  },
});
