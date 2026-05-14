import { GAME_ENGINE } from '../../constants';

export type NearMissTimingState = {
  nearMissCooldown: number;
  nearMissTimer: number;
};

export function updateNearMissFeedbackTimers(
  state: NearMissTimingState,
  deltaTime: number
): number {
  if (state.nearMissCooldown > 0) state.nearMissCooldown -= deltaTime;
  if (state.nearMissTimer > 0) state.nearMissTimer -= deltaTime;

  return deltaTime / GAME_ENGINE.TARGET_FRAME_TIME;
}
