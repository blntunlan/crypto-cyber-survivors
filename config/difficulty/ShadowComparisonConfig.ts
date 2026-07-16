export const SHADOW_CONTINUOUS_DIMENSIONS = [
  'threatTarget',
  'creditRate',
  'spawnWindowSeconds',
  'enemyHealthMultiplier',
  'enemyDamageMultiplier',
  'enemySpeedMultiplier',
  'mercy',
  'recoveryNeed',
  'presentationIntensity',
] as const;

export type ShadowContinuousDimension = (typeof SHADOW_CONTINUOUS_DIMENSIONS)[number];

export type ShadowApprovedDrift = {
  id: string;
  scenarioId: string;
  dimension: ShadowContinuousDimension;
  maximumDrift: number;
  rationale: string;
  owner: 'Core Gameplay';
  expiryReviewDate: string;
};

export type ShadowComparisonConfig = {
  version: string;
  manifestVersion: string;
  capacity: number;
  continuousTolerances: Record<ShadowContinuousDimension, number>;
  approvedDrifts: readonly ShadowApprovedDrift[];
};

export const SHADOW_COMPARISON_CONFIG: ShadowComparisonConfig = {
  version: 'modular-difficulty-shadow-v1',
  manifestVersion: 'modular-difficulty-approved-drift-v1',
  capacity: 256,
  continuousTolerances: {
    threatTarget: 0.025,
    creditRate: 0.025,
    spawnWindowSeconds: 0.05,
    enemyHealthMultiplier: 0.025,
    enemyDamageMultiplier: 0.025,
    enemySpeedMultiplier: 0.025,
    mercy: 0.025,
    recoveryNeed: 0.025,
    presentationIntensity: 0.025,
  },
  approvedDrifts: [
    {
      id: 'fixture-pressure-tuning-v1',
      scenarioId: 'approved-pressure',
      dimension: 'threatTarget',
      maximumDrift: 0.025,
      rationale: 'Temporary baseline pressure tuning parity window.',
      owner: 'Core Gameplay',
      expiryReviewDate: '2026-08-15',
    },
  ],
};
