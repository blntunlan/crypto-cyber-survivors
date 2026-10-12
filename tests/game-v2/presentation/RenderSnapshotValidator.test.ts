import { describe, expect, it } from 'vitest';

import { MAX_WORLD_CAPACITY } from '@/game-v2/config/Mvp0Config';
import { type RenderCategorySnapshot } from '@/game-v2/contracts/RenderSnapshot';
import { validateRenderCategoryStorage } from '@/game-v2/presentation/RenderSnapshotValidator';

const makeCategory = (capacity: number): RenderCategorySnapshot => ({
  slots: new Uint16Array(capacity),
  previousX: new Float32Array(capacity),
  previousY: new Float32Array(capacity),
  currentX: new Float32Array(capacity),
  currentY: new Float32Array(capacity),
  radius: new Float32Array(capacity),
});

describe('validateRenderCategoryStorage', () => {
  it('returns the valid category capacity and slot length', () => {
    const category = makeCategory(3);

    const capacity = validateRenderCategoryStorage(category, 'enemies');

    expect(capacity).toBe(3);
    expect(capacity).toBe(category.slots.length);
  });

  it.each([
    ['a plain array', [] as unknown as Uint16Array],
    ['a Float32Array', new Float32Array(2) as unknown as Uint16Array],
  ] as const)(
    'rejects slots supplied as %s and includes the category name',
    (_label, slots) => {
      const category = {
        ...makeCategory(2),
        slots,
      } as unknown as RenderCategorySnapshot;

      expect(() => validateRenderCategoryStorage(category, 'projectiles')).toThrow(
        new TypeError('projectiles slot storage is invalid')
      );
    }
  );

  it('rejects capacity above MAX_WORLD_CAPACITY with a RangeError', () => {
    const category = makeCategory(MAX_WORLD_CAPACITY + 1);

    expect(() => validateRenderCategoryStorage(category, 'enemies')).toThrow(
      RangeError
    );
  });

  it.each([
    ['previousX', { previousX: new Float32Array(1) }],
    ['previousY', { previousY: new Float32Array(1) }],
    ['currentX', { currentX: new Float32Array(1) }],
    ['currentY', { currentY: new Float32Array(1) }],
    ['radius', { radius: new Float32Array(1) }],
  ] as const)('rejects a %s length inconsistent with slots', (_field, override) => {
    const category = { ...makeCategory(2), ...override };

    expect(() => validateRenderCategoryStorage(category, 'enemies')).toThrow(
      RangeError
    );
  });

  it.each([
    ['previousX', { previousX: new Float64Array(2) as unknown as Float32Array }],
    ['previousY', { previousY: new Float64Array(2) as unknown as Float32Array }],
    ['currentX', { currentX: new Float64Array(2) as unknown as Float32Array }],
    ['currentY', { currentY: new Float64Array(2) as unknown as Float32Array }],
    ['radius', { radius: new Float64Array(2) as unknown as Float32Array }],
  ] as const)('rejects a %s with the wrong typed-array type', (_field, override) => {
    const category = { ...makeCategory(2), ...override };

    expect(() => validateRenderCategoryStorage(category, 'enemies')).toThrow(
      RangeError
    );
  });

  it('accepts capacity zero and returns zero', () => {
    const category = makeCategory(0);

    expect(validateRenderCategoryStorage(category, 'empty')).toBe(0);
  });
});
