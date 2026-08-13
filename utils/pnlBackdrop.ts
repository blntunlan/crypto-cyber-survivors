/**
 * PnL Backdrop - resolves the canvas background colour for the current PnL.
 *
 * Danger only. A profitable run used to wash the whole canvas green, which reads
 * as "you are safe" — the opposite of what a leveraged position should feel like,
 * and the last market-driven canvas tint left behind by the 2026-08-02
 * presentation pass that stripped the EffectRenderer market overlays.
 *
 * Writes into a caller-owned target so the RAF loop stays allocation-free.
 */

import { GAME_ENGINE } from '../constants';
import { lerp } from './math';

export type BackdropColor = { r: number; g: number; b: number };

/**
 * @param pnl - Signed PnL ratio (0.1 = +10%).
 * @param minVal - Per-device brightness floor (mobile screens need a lift).
 * @param target - Mutated in place with the resolved colour.
 */
export const resolvePnlBackdrop = (
  pnl: number,
  minVal: number,
  target: BackdropColor
): void => {
  const neutralG = minVal + GAME_ENGINE.BG_NEUTRAL_G_OFFSET;
  const neutralB = minVal + GAME_ENGINE.BG_NEUTRAL_B_OFFSET;

  if (pnl >= 0) {
    target.r = minVal;
    target.g = neutralG;
    target.b = neutralB;
    return;
  }

  // Drawdown ramps the night blue towards a red alert wash.
  const danger = Math.min(1, Math.abs(pnl) * GAME_ENGINE.PNL_VISUAL_SCALE);
  target.r = lerp(minVal, GAME_ENGINE.BG_PNL_DANGER_MAX_R, danger);
  target.g = lerp(neutralG, minVal, danger);
  target.b = lerp(neutralB, minVal, danger);
};
