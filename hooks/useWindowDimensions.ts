/**
 * useWindowDimensions - Window Size Management Hook
 *
 * Tracks window dimensions with resize event handling.
 * Used for responsive game canvas sizing.
 */

import { useState, useEffect } from 'react';

export interface WindowDimensions {
  width: number;
  height: number;
}

/**
 * Hook to track window dimensions with automatic resize handling
 */
export function useWindowDimensions(): WindowDimensions {
  const [dimensions, setDimensions] = useState<WindowDimensions>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
}
