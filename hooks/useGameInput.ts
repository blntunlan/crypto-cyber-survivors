import { useEffect, useRef } from 'react';

export const useGameInput = () => {
  const keys = useRef<Record<string, boolean>>({});
  const touchVector = useRef({ dx: 0, dy: 0 });
  const touchDash = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key] = false;
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
  };

  const getMovementVector = () => {
    // Keyboard input
    let kdx = 0;
    let kdy = 0;
    if (keys.current['ArrowUp'] || keys.current['w']) kdy -= 1;
    if (keys.current['ArrowDown'] || keys.current['s']) kdy += 1;
    if (keys.current['ArrowLeft'] || keys.current['a']) kdx -= 1;
    if (keys.current['ArrowRight'] || keys.current['d']) kdx += 1;

    // Combine inputs (Keyboard + Touch)
    // If touch is active (non-zero), it takes priority or can be additive.
    // Usually, games prioritize the active input method.
    if (touchVector.current.dx !== 0 || touchVector.current.dy !== 0) {
      return { dx: touchVector.current.dx, dy: touchVector.current.dy };
    }

    return { dx: kdx, dy: kdy };
  };

  const isSpacePressed = () => keys.current[' '] ?? keys.current['Spacebar'] ?? touchDash.current;

  /**
   * Resets the dash state after it's processed by the engine
   */
  const consumeDash = () => {
    touchDash.current = false;
  };

  return { getMovementVector, isSpacePressed, setTouchMovement, setTouchDash, consumeDash };
};
