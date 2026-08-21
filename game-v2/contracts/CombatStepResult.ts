export type CombatStepResult = {
  playerDied: boolean;
  killCount: number;
  readonly killX: Float32Array;
  readonly killY: Float32Array;
  readonly killXp: Float32Array;
};
