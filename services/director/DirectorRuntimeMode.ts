export const DIRECTOR_RUNTIME_MODES = ['LEGACY', 'SHADOW', 'NEW_AUTHORITY'] as const;

export type DirectorRuntimeMode = (typeof DIRECTOR_RUNTIME_MODES)[number];

export type DirectorRuntimePlan = {
  mode: DirectorRuntimeMode;
  runsLegacyPipeline: boolean;
  runsShadowDirector: boolean;
  appliesDirectorSnapshot: boolean;
};

export type DirectorRuntimeState = {
  mode: DirectorRuntimeMode;
  transitionGeneration: number;
  lastProcessedTick: number | null;
  latestSnapshotRevision: number | null;
};

export const resolveDirectorRuntimePlan = (
  mode: DirectorRuntimeMode
): DirectorRuntimePlan => {
  switch (mode) {
    case 'LEGACY':
      return {
        mode,
        runsLegacyPipeline: true,
        runsShadowDirector: false,
        appliesDirectorSnapshot: false,
      };
    case 'SHADOW':
      return {
        mode,
        runsLegacyPipeline: true,
        runsShadowDirector: true,
        appliesDirectorSnapshot: false,
      };
    case 'NEW_AUTHORITY':
      return {
        mode,
        runsLegacyPipeline: false,
        runsShadowDirector: true,
        appliesDirectorSnapshot: true,
      };
  }
};

export const createDirectorRuntimeState = (
  mode: DirectorRuntimeMode
): DirectorRuntimeState => ({
  mode,
  transitionGeneration: 0,
  lastProcessedTick: null,
  latestSnapshotRevision: null,
});

/**
 * Director state is never migrated across authority boundaries. A flag change
 * creates a new Director epoch and clears only Director-owned bookkeeping;
 * game, run, and legacy pipeline state remain outside this contract.
 */
export const transitionDirectorRuntimeState = (
  currentState: DirectorRuntimeState,
  nextMode: DirectorRuntimeMode
): DirectorRuntimeState => {
  if (currentState.mode === nextMode) return currentState;

  return {
    mode: nextMode,
    transitionGeneration: currentState.transitionGeneration + 1,
    lastProcessedTick: null,
    latestSnapshotRevision: null,
  };
};
