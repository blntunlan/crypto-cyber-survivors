import { MAX_WORLD_CAPACITY } from '@/game-v2/config/Mvp0Config';
import { type RenderCategorySnapshot } from '@/game-v2/contracts/RenderSnapshot';

export const validateRenderCategoryStorage = (
  category: RenderCategorySnapshot,
  name: string
): number => {
  if (!(category.slots instanceof Uint16Array)) {
    throw new TypeError(`${name} slot storage is invalid`);
  }

  const capacity = category.slots.length;
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > MAX_WORLD_CAPACITY) {
    throw new RangeError(
      `${name} storage capacity must be between 0 and ${MAX_WORLD_CAPACITY}`
    );
  }

  if (
    !(category.previousX instanceof Float32Array) ||
    !(category.previousY instanceof Float32Array) ||
    !(category.currentX instanceof Float32Array) ||
    !(category.currentY instanceof Float32Array) ||
    !(category.radius instanceof Float32Array) ||
    category.previousX.length !== capacity ||
    category.previousY.length !== capacity ||
    category.currentX.length !== capacity ||
    category.currentY.length !== capacity ||
    category.radius.length !== capacity
  ) {
    throw new RangeError(`${name} storage capacity is inconsistent`);
  }

  return capacity;
};
