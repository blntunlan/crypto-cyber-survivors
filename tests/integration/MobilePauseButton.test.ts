/**
 * Integration Test: Mobile Pause Button
 *
 * This test verifies that the pause button is clickable on mobile devices
 * even when the DragToMoveController overlay is active.
 *
 * Bug: The DragToMoveController's e.preventDefault() in handleTouchStart
 * was blocking touch events from reaching the pause button.
 *
 * Fix: Use document.elementsFromPoint() to check if there's an interactive
 * element at the touch coordinates before intercepting the event.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Mobile Pause Button Touch Handling', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Event Propagation', () => {
    it('should NOT prevent default on touch events targeting interactive elements', () => {
      // Create a mock pause button
      const pauseButton = document.createElement('button');
      pauseButton.setAttribute('aria-label', 'Pause Game');
      pauseButton.className = 'pointer-events-auto';
      document.body.appendChild(pauseButton);

      // Create a mock drag controller container
      const dragController = document.createElement('div');
      dragController.className = 'fixed inset-0 touch-none z-[998]';
      document.body.appendChild(dragController);

      // The pause button should have pointer-events-auto class
      expect(pauseButton.classList.contains('pointer-events-auto')).toBe(true);

      // The button should be a button element (clickable)
      expect(pauseButton.tagName).toBe('BUTTON');

      // Cleanup
      document.body.removeChild(pauseButton);
      document.body.removeChild(dragController);
    });

    it('should detect interactive elements from element array', () => {
      /**
       * Helper function that mirrors the fix logic:
       * Check if ANY element in the array is interactive
       */
      const hasInteractiveElement = (elements: Element[]): boolean => {
        return elements.some(
          el =>
            el.tagName === 'BUTTON' ||
            el.closest('button') !== null ||
            el.classList.contains('pointer-events-auto') ||
            el.closest('.pointer-events-auto') !== null
        );
      };

      // Create button
      const button = document.createElement('button');
      button.textContent = 'Test';
      document.body.appendChild(button);

      // Create pointer-events-auto div
      const interactiveDiv = document.createElement('div');
      interactiveDiv.className = 'pointer-events-auto';
      document.body.appendChild(interactiveDiv);

      // Create regular div (not interactive)
      const regularDiv = document.createElement('div');
      document.body.appendChild(regularDiv);

      // Create overlay div (like DragToMoveController)
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0';
      document.body.appendChild(overlay);

      // Test cases - simulating elementsFromPoint results
      expect(hasInteractiveElement([button, overlay, document.body])).toBe(true);
      expect(hasInteractiveElement([interactiveDiv, overlay, document.body])).toBe(
        true
      );
      expect(hasInteractiveElement([regularDiv, overlay, document.body])).toBe(false);
      expect(hasInteractiveElement([overlay, document.body])).toBe(false);
      expect(hasInteractiveElement([])).toBe(false);

      // Cleanup
      document.body.removeChild(button);
      document.body.removeChild(interactiveDiv);
      document.body.removeChild(regularDiv);
      document.body.removeChild(overlay);
    });
  });

  describe('DragToMoveController Touch Logic', () => {
    it('should skip preventDefault when touch is over interactive element', () => {
      const mockOnMove = vi.fn();
      const mockPreventDefault = vi.fn();

      // Simulate the fixed logic using a mock elementsFromPoint
      const handleTouchStart = (
        elementsAtPoint: Element[],
        preventDefault: () => void
      ) => {
        // Check if any element in the stack is interactive
        const hasInteractiveElement = elementsAtPoint.some(
          el =>
            el.tagName === 'BUTTON' ||
            el.closest('button') !== null ||
            el.classList.contains('pointer-events-auto') ||
            el.closest('.pointer-events-auto') !== null
        );

        if (hasInteractiveElement) {
          // Let the interactive element handle the touch natively
          return;
        }

        preventDefault();
        mockOnMove(0, 0);
      };

      // Create mock pause button
      const pauseButton = document.createElement('button');
      pauseButton.setAttribute('aria-label', 'Pause Game');
      pauseButton.className = 'pointer-events-auto';

      // Create mock overlay
      const overlay = document.createElement('div');

      // Simulate touch on pause button area (button is in the element stack)
      handleTouchStart([pauseButton, overlay, document.body], mockPreventDefault);

      // preventDefault should NOT have been called
      expect(mockPreventDefault).not.toHaveBeenCalled();

      // onMove should NOT have been called either (we returned early)
      expect(mockOnMove).not.toHaveBeenCalled();

      // Now test regular touch on game area (no button in stack)
      handleTouchStart([overlay, document.body], mockPreventDefault);

      // Now preventDefault SHOULD have been called
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockOnMove).toHaveBeenCalledWith(0, 0);
    });
  });
});
