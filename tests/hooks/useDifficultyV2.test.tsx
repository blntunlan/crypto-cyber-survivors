import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDifficultyV2 } from '../../hooks/useDifficultyV2';

describe('useDifficultyV2', () => {
  it('returns neutral presentation data without a legacy difficulty subscription', () => {
    const { result } = renderHook(() => useDifficultyV2());

    expect(result.current.fovReduction).toBe(0);
    expect(result.current.shockActive).toBe(false);
    expect(result.current.total).toBe(1);
  });
});
