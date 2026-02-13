import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useHUDUpdateLoop } from '../../hooks/useHUDUpdateLoop';
import { GameStatus } from '../../types';

describe('useHUDUpdateLoop', () => {
  it('is a no-op hook that does not throw', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(null);
      useHUDUpdateLoop({
        status: GameStatus.PLAYING,
        containerRef: ref,
      });
      return true;
    });

    expect(result.current).toBe(true);
  });
});
