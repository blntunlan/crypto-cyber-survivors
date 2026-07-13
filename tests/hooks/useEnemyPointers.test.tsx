import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEnemyPointers } from '../../hooks/useEnemyPointers';
import { GameStatus } from '../../types';
import type { GameEnemy } from '../../factories/EnemyFactory';

describe('useEnemyPointers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('scans enemies without allocating through Array.filter', () => {
    let frameCallback: FrameRequestCallback = () => undefined;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback;
        return 1;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const enemies = [
      { active: true, x: -20, y: 100, color: '#f00', type: 'bear' },
      { active: true, x: 200, y: 100, color: '#0f0', type: 'bull' },
    ] as GameEnemy[];
    const filterSpy = vi.spyOn(enemies, 'filter');
    const container = document.createElement('div');
    for (let i = 0; i < 10; i++) {
      container.appendChild(document.createElement('div'));
    }

    renderHook(() =>
      useEnemyPointers({
        status: GameStatus.PLAYING,
        enemies,
        width: 100,
        height: 100,
        globalScale: 1,
        pointerContainerRef: { current: container },
      })
    );

    act(() => frameCallback(16));

    expect(filterSpy).not.toHaveBeenCalled();
    expect((container.children[0] as HTMLElement).style.opacity).toBe('1');
  });
});
