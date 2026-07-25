import { useEffect, useRef } from 'react';
import { TimeService } from '../services/core/TimeService';

// Global AI Override State
export const AI_INPUT_STATE = {
  active: false,
  dx: 0,
  dy: 0,
  dash: false,
};

export const useGameInput = () => {
  const keys = useRef<Record<string, boolean>>({});
  const touchVector = useRef({ dx: 0, dy: 0 });
  const movementVector = useRef({ dx: 0, dy: 0 });
  const touchDash = useRef(false);
  const touchDashTimestamp = useRef<number | null>(null);
  const BUFFER_WINDOW = 400; // ms to keep dash input valid

  // Track if space was released since last dash (for double dash detection)
  const spaceConsumed = useRef(false);

  const resetInputState = () => {
    keys.current = {};
    touchVector.current.dx = 0;
    touchVector.current.dy = 0;
    movementVector.current.dx = 0;
    movementVector.current.dy = 0;
    touchDash.current = false;
    touchDashTimestamp.current = null;
    spaceConsumed.current = false;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      keys.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      keys.current[e.key] = false;
      // Reset consumed state when space is released
      if (e.key === ' ' || e.key === 'Spacebar') {
        spaceConsumed.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        resetInputState();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetInputState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetInputState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const setTouchMovement = (dx: number, dy: number) => {
    touchVector.current.dx = dx;
    touchVector.current.dy = dy;
  };

  const setTouchDash = (active: boolean) => {
    touchDash.current = active;
    if (active) {
      // Record timestamp for input buffering
      touchDashTimestamp.current = TimeService.getGameTime();
    } else {
      spaceConsumed.current = false;
      // Do NOT clear timestamp on release - this is crucial for detecting fast taps (tap < frame time)
    }
  };

  const getMovementVector = () => {
    const output = movementVector.current;
    if (AI_INPUT_STATE.active) {
      output.dx = AI_INPUT_STATE.dx;
      output.dy = AI_INPUT_STATE.dy;
      return output;
    }

    // Keyboard input
    let kdx = 0;
    let kdy = 0;
    if (keys.current['ArrowUp'] || keys.current['w'] || keys.current['W']) kdy -= 1;
    if (keys.current['ArrowDown'] || keys.current['s'] || keys.current['S']) kdy += 1;
    if (keys.current['ArrowLeft'] || keys.current['a'] || keys.current['A']) kdx -= 1;
    if (keys.current['ArrowRight'] || keys.current['d'] || keys.current['D']) kdx += 1;

    // Combine inputs (Keyboard + Touch)
    // Add epsilon check to prevent noisy touch drivers from blocking keyboard
    const TOUCH_EPSILON = 0.01;
    if (
      Math.abs(touchVector.current.dx) > TOUCH_EPSILON ||
      Math.abs(touchVector.current.dy) > TOUCH_EPSILON
    ) {
      output.dx = touchVector.current.dx;
      output.dy = touchVector.current.dy;
      return output;
    }

    output.dx = kdx;
    output.dy = kdy;
    return output;
  };

  const isTouchBuffered = () => {
    return (
      touchDashTimestamp.current !== null &&
      TimeService.getGameTime() - touchDashTimestamp.current < BUFFER_WINDOW
    );
  };

  const isSpacePressed = () => {
    if (AI_INPUT_STATE.active) {
      return AI_INPUT_STATE.dash;
    }
    const kSpace = keys.current[' '] ?? keys.current['Spacebar'] ?? false;
    // Check key, physical hold, or buffered input
    return kSpace || touchDash.current || isTouchBuffered();
  };

  /**
   * Check if space was freshly pressed (not held from previous dash)
   * Used for double dash - requires user to release and press again
   */
  const isSpaceFreshPress = () => {
    if (AI_INPUT_STATE.active) {
      return AI_INPUT_STATE.dash && !spaceConsumed.current;
    }
    const kSpace = keys.current[' '] ?? keys.current['Spacebar'] ?? false;
    const pressed = kSpace || touchDash.current || isTouchBuffered();
    return pressed && !spaceConsumed.current;
  };

  /**
   * Resets the dash state after it's processed by the engine
   */
  const consumeDash = () => {
    if (AI_INPUT_STATE.active) {
      spaceConsumed.current = true;
      return;
    }
    touchDash.current = false;
    touchDashTimestamp.current = null; // Clear buffer
    spaceConsumed.current = true; // Mark space as consumed until released
  };

  return {
    getMovementVector,
    isSpacePressed,
    isSpaceFreshPress,
    setTouchMovement,
    setTouchDash,
    consumeDash,
  };
};
