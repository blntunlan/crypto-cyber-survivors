import { fireEvent, render } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { DragToMoveController } from '../../../components/mobile/DragToMoveController';

vi.mock('../../../contexts/useTheme', () => ({
  useTheme: () => ({
    theme: { colors: { primary: '#22d3ee' } },
  }),
}));

describe('DragToMoveController', () => {
  it('releases the dash input when the second touch ends', () => {
    const onDash = vi.fn();
    const onDashRelease = vi.fn();
    const originalElementsFromPoint = document.elementsFromPoint;
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: vi.fn(() => []),
    });
    const { getByTestId } = render(
      <DragToMoveController
        onMove={vi.fn()}
        onDash={onDash}
        onDashRelease={onDashRelease}
      />
    );
    const controller = getByTestId('drag-controller');
    const movementTouch = { identifier: 1, clientX: 80, clientY: 500 };
    const dashTouch = { identifier: 2, clientX: 300, clientY: 500 };

    fireEvent.touchStart(controller, {
      touches: [movementTouch],
      changedTouches: [movementTouch],
    });
    fireEvent.touchStart(controller, {
      touches: [movementTouch, dashTouch],
      changedTouches: [dashTouch],
    });
    fireEvent.touchEnd(controller, {
      touches: [movementTouch],
      changedTouches: [dashTouch],
    });

    expect(onDash).toHaveBeenCalledTimes(1);
    expect(onDashRelease).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: originalElementsFromPoint,
    });
  });
});
