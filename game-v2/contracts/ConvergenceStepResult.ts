export type ConvergenceStepResult = {
  /** `true` only on the tick the reached latch flips `0 -> 1` (V2-109). */
  convergenceReachedThisTick: boolean;
};
