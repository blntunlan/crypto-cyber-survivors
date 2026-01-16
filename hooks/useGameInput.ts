import { useEffect, useRef } from 'react';

export const useGameInput = () => {
  const keys = useRef<Record<string, boolean>>({});
  const touchVector = useRef({ dx: 0, dy: 0 });
  const touchDash = useRef(false);
  const touchDashIntents = useRef(0); // Counter for dash intents to avoid losing fast taps

  // Track if space was released since last dash (for double dash detection)
  const spaceConsumed = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key] = false;
      // Reset consumed state when space is released
      if (e.key === ' ' || e.key === 'Spacebar') {
        spaceConsumed.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const setTouchMovement = (dx: number, dy: number) => {
    touchVector.current = { dx, dy };
  };

  const setTouchDash = (active: boolean) => {
    touchDash.current = active;
    if (active) {
      touchDashIntents.current += 1;
    } else {
      spaceConsumed.current = false;
      // Also clear buffered intents on release to prevent sticky dashes
      touchDashIntents.current = 0;
    }
  };

  const getMovementVector = () => {
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
      return { dx: touchVector.current.dx, dy: touchVector.current.dy };
    }

    return { dx: kdx, dy: kdy };
  };

  const isSpacePressed = () => {
    const kSpace = keys.current[' '] ?? keys.current['Spacebar'] ?? false;
    return kSpace || touchDash.current || touchDashIntents.current > 0;
  };

  /**
   * Check if space was freshly pressed (not held from previous dash)
   * Used for double dash - requires user to release and press again
   */
  const isSpaceFreshPress = () => {
    const kSpace = keys.current[' '] ?? keys.current['Spacebar'] ?? false;
    const pressed = kSpace || touchDash.current || touchDashIntents.current > 0;
    return pressed && !spaceConsumed.current;
  };

  /**
   * Resets the dash state after it's processed by the engine
   */
  const consumeDash = () => {
    touchDash.current = false;
    if (touchDashIntents.current > 0) {
      touchDashIntents.current -= 1;
    }
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
