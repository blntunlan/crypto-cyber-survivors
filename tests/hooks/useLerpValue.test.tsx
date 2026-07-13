import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLerpValues } from '../../hooks/useLerpValue';
import { EventBus } from '../../services/core/EventBus';

describe('useLerpValues', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reuses the emitted value object across animation frames', () => {
    let frameCallback: FrameRequestCallback = () => undefined;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback;
        return 1;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const { rerender } = renderHook(
      ({ hp }) => useLerpValues({ hp }, { speed: 0.5, decimals: 2 }),
      { initialProps: { hp: 100 } }
    );

    rerender({ hp: 0 });
    act(() => frameCallback(16));
    const firstPayload = emitSpy.mock.calls.find(
      call => call[0] === 'hudValuesUpdated'
    )?.[1];
    act(() => frameCallback(32));
    const payloads = emitSpy.mock.calls.filter(call => call[0] === 'hudValuesUpdated');

    expect(payloads).toHaveLength(2);
    expect(payloads[1]?.[1]).toBe(firstPayload);
  });
});
