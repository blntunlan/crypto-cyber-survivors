export const DIFFICULTY_RUNTIME_MODES = ['current', 'shadow', 'modular'] as const;

export type DifficultyRuntimeMode = (typeof DIFFICULTY_RUNTIME_MODES)[number];
export type DirectorRuntimeMode = DifficultyRuntimeMode;

export type DirectorRuntimePlan = {
  mode: DifficultyRuntimeMode;
  runsCurrentAdapter: boolean;
  runsModularShadow: boolean;
  appliesModularSnapshot: boolean;
};

export const parseDifficultyRuntimeMode = (
  rawMode: string | undefined
): DifficultyRuntimeMode => {
  if (rawMode === undefined) return 'current';
  const normalizedMode = rawMode.trim().toLowerCase();
  return DIFFICULTY_RUNTIME_MODES.includes(normalizedMode as DifficultyRuntimeMode)
    ? (normalizedMode as DifficultyRuntimeMode)
    : 'current';
};

export const resolveDirectorRuntimePlan = (
  mode: DifficultyRuntimeMode
): DirectorRuntimePlan => {
  switch (mode) {
    case 'current':
      return {
        mode,
        runsCurrentAdapter: true,
        runsModularShadow: false,
        appliesModularSnapshot: false,
      };
    case 'shadow':
      return {
        mode,
        runsCurrentAdapter: true,
        runsModularShadow: true,
        appliesModularSnapshot: false,
      };
    case 'modular':
      return {
        mode,
        runsCurrentAdapter: false,
        runsModularShadow: true,
        appliesModularSnapshot: true,
      };
  }
};
