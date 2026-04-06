import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 640; // Tailwind `sm`
const XL_BREAKPOINT = 1280; // Tailwind `xl`

export const HUB_GRID_CLASS =
  'grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:gap-4 xl:grid-cols-3';

function computeColumnCount(): number {
  if (typeof window === 'undefined') {
    return 1;
  }

  const width = window.innerWidth;
  if (width >= XL_BREAKPOINT) return 3;
  if (width >= MOBILE_BREAKPOINT) return 2;
  return 1;
}

/**
 * Returns a column count (1/2/3) that tracks the hub grid layout.
 * Keeps keyboard navigation aligned with the visual CSS grid.
 */
export function useResponsiveHubColumns(): number {
  const [columns, setColumns] = useState<number>(() => computeColumnCount());

  useEffect(() => {
    const handleResize = () => {
      setColumns(computeColumnCount());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return columns;
}

/**
 * Shared helper for applying the consistent grid classes in JSX.
 * Kept as a function for future expansion if we ever need dynamic classes.
 */
export function useHubGridClassName(): string {
  return HUB_GRID_CLASS;
}
