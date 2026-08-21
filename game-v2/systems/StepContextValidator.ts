import { type StepContext } from '@/game-v2/contracts/StepContext';

export const assertStepContext = (context: StepContext): void => {
  if (!Number.isSafeInteger(context.tick) || context.tick < 0) {
    throw new RangeError('tick must be a safe non-negative integer');
  }

  if (!Number.isFinite(context.deltaSeconds) || context.deltaSeconds <= 0) {
    throw new RangeError('delta seconds must be positive and finite');
  }

  if (
    !Number.isFinite(context.intent.moveX) ||
    !Number.isFinite(context.intent.moveY)
  ) {
    throw new RangeError('intent axes must be finite');
  }

  if (typeof context.intent.dashPressed !== 'boolean') {
    throw new TypeError('dashPressed must be boolean');
  }
};
