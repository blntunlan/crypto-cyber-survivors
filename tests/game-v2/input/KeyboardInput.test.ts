import { describe, expect, it, vi } from 'vitest';

import { KeyboardInput } from '@/game-v2/input/KeyboardInput';
import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';

const dispatchKey = (
  target: EventTarget,
  type: 'keydown' | 'keyup',
  code: string,
  repeat = false
): void => {
  target.dispatchEvent(new KeyboardEvent(type, { code, repeat }));
};

const createIntent = (): PlayerIntent => ({
  moveX: 99,
  moveY: -99,
  dashPressed: true,
});

describe('KeyboardInput', () => {
  it.each([
    ['KeyW', 0, 1],
    ['KeyS', 0, -1],
    ['KeyA', -1, 0],
    ['KeyD', 1, 0],
    ['ArrowUp', 0, 1],
    ['ArrowLeft', -1, 0],
  ] as const)('maps %s to the expected movement axis', (code, moveX, moveY) => {
    const target = new EventTarget();
    const input = new KeyboardInput(target);
    const intent = createIntent();

    dispatchKey(target, 'keydown', code);
    input.sample(intent);

    expect(intent).toEqual({ moveX, moveY, dashPressed: false });
  });

  it('cancels exact opposites independently on both axes', () => {
    const target = new EventTarget();
    const input = new KeyboardInput(target);
    const intent = createIntent();

    dispatchKey(target, 'keydown', 'KeyW');
    dispatchKey(target, 'keydown', 'ArrowDown');
    dispatchKey(target, 'keydown', 'KeyA');
    dispatchKey(target, 'keydown', 'KeyD');
    input.sample(intent);

    expect(intent).toEqual({ moveX: 0, moveY: 0, dashPressed: false });
  });

  it('normalizes a non-zero diagonal to unit magnitude', () => {
    const target = new EventTarget();
    const input = new KeyboardInput(target);
    const intent = createIntent();

    dispatchKey(target, 'keydown', 'KeyW');
    dispatchKey(target, 'keydown', 'KeyD');
    input.sample(intent);

    expect(intent.moveX).toBeCloseTo(0.7071067811865476);
    expect(intent.moveY).toBeCloseTo(0.7071067811865476);
    expect(Math.hypot(intent.moveX, intent.moveY)).toBeCloseTo(1);
  });

  it('stops an axis when its final bound key is released', () => {
    const target = new EventTarget();
    const input = new KeyboardInput(target);
    const intent = createIntent();

    dispatchKey(target, 'keydown', 'KeyD');
    input.sample(intent);
    expect(intent.moveX).toBe(1);

    dispatchKey(target, 'keyup', 'KeyD');
    input.sample(intent);

    expect(intent).toEqual({ moveX: 0, moveY: 0, dashPressed: false });
  });

  it('ignores unknown key codes without changing held movement', () => {
    const target = new EventTarget();
    const input = new KeyboardInput(target);
    const intent = createIntent();

    dispatchKey(target, 'keydown', 'KeyW');
    dispatchKey(target, 'keydown', 'KeyQ');
    dispatchKey(target, 'keyup', 'KeyQ');
    input.sample(intent);

    expect(intent).toEqual({ moveX: 0, moveY: 1, dashPressed: false });
  });

  it('publishes one Space edge while held and ignores repeat keydown events', () => {
    const target = new EventTarget();
    const input = new KeyboardInput(target);
    const intent = createIntent();

    dispatchKey(target, 'keydown', 'Space');
    dispatchKey(target, 'keydown', 'Space', true);
    input.sample(intent);
    expect(intent.dashPressed).toBe(true);

    input.sample(intent);
    expect(intent.dashPressed).toBe(false);

    dispatchKey(target, 'keydown', 'Space');
    input.sample(intent);
    expect(intent.dashPressed).toBe(false);
  });

  it('queues a new Space edge after release and repress', () => {
    const target = new EventTarget();
    const input = new KeyboardInput(target);
    const intent = createIntent();

    dispatchKey(target, 'keydown', 'Space');
    input.sample(intent);
    input.sample(intent);
    dispatchKey(target, 'keyup', 'Space');
    dispatchKey(target, 'keydown', 'Space');
    input.sample(intent);

    expect(intent.dashPressed).toBe(true);
  });

  it('blur clears movement, Space hold, and a pending dash edge', () => {
    const target = new EventTarget();
    const input = new KeyboardInput(target);
    const intent = createIntent();

    dispatchKey(target, 'keydown', 'KeyW');
    dispatchKey(target, 'keydown', 'Space');
    target.dispatchEvent(new Event('blur'));
    input.sample(intent);

    expect(intent).toEqual({ moveX: 0, moveY: 0, dashPressed: false });

    dispatchKey(target, 'keydown', 'Space');
    input.sample(intent);
    expect(intent.dashPressed).toBe(true);
  });

  it('overwrites and reuses the caller-owned intent on every sample', () => {
    const target = new EventTarget();
    const input = new KeyboardInput(target);
    const intent = createIntent();

    input.sample(intent);
    expect(intent).toEqual({ moveX: 0, moveY: 0, dashPressed: false });

    dispatchKey(target, 'keydown', 'KeyA');
    dispatchKey(target, 'keydown', 'Space');
    input.sample(intent);
    expect(intent).toEqual({ moveX: -1, moveY: 0, dashPressed: true });

    input.sample(intent);
    expect(intent).toEqual({ moveX: -1, moveY: 0, dashPressed: false });
  });

  it('removes the exact registered listeners once and remains inert after dispose', () => {
    const target = new EventTarget();
    const addListener = vi.spyOn(target, 'addEventListener');
    const removeListener = vi.spyOn(target, 'removeEventListener');
    const input = new KeyboardInput(target);
    const keydownListener = addListener.mock.calls[0]?.[1];
    const keyupListener = addListener.mock.calls[1]?.[1];
    const blurListener = addListener.mock.calls[2]?.[1];
    const intent = createIntent();

    expect(addListener).toHaveBeenCalledTimes(3);
    input.dispose();
    input.dispose();

    expect(removeListener).toHaveBeenCalledTimes(3);
    expect(removeListener).toHaveBeenNthCalledWith(1, 'keydown', keydownListener);
    expect(removeListener).toHaveBeenNthCalledWith(2, 'keyup', keyupListener);
    expect(removeListener).toHaveBeenNthCalledWith(3, 'blur', blurListener);

    dispatchKey(target, 'keydown', 'KeyD');
    dispatchKey(target, 'keydown', 'Space');
    input.sample(intent);

    expect(intent).toEqual({ moveX: 0, moveY: 0, dashPressed: false });
  });
});
