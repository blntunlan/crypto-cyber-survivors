import { type DirectorRuntimePlan } from './DirectorRuntimeMode';

export const SPAWN_AUTHORITIES = ['LEGACY', 'DIRECTOR'] as const;

export type SpawnAuthority = (typeof SPAWN_AUTHORITIES)[number];

/**
 * In production Director mode, a missing plan skips the spawn tick rather
 * than falling back to the legacy multiplier pipeline. Rollback remains an
 * explicit runtime-mode transition.
 */
export const resolveSpawnAuthority = (
  runtimePlan: DirectorRuntimePlan,
  _hasDirectorSpawnPlan: boolean
): SpawnAuthority => (runtimePlan.appliesModularSnapshot ? 'DIRECTOR' : 'LEGACY');
