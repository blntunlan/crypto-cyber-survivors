import {
  parseDifficultyRuntimeMode,
  resolveDirectorRuntimePlan,
  type DirectorRuntimePlan,
} from '../services/director/DirectorRuntimeMode';

export const getDirectorRuntimeConfig = (
  rawMode: string | undefined = import.meta.env.VITE_DIFFICULTY_RUNTIME_MODE
): DirectorRuntimePlan =>
  resolveDirectorRuntimePlan(parseDifficultyRuntimeMode(rawMode));
