import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';

interface EnemyPointersProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * EnemyPointers - Arrow indicators pointing to off-screen enemies
 *
 * Note: Position, rotation, and visibility are controlled via Direct DOM
 * manipulation from the parent's RAF loop.
 */

const DesktopPointer: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="white"
    strokeWidth="1.5"
    className="h-full w-full drop-shadow-[0_0_4px_rgba(0,0,0,0.6)]"
  >
    <path d="M12 4L6 18L12 16L18 18L12 4Z" />
  </svg>
);

const MobilePointer: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="white"
    strokeWidth="1.5"
    className="h-full w-full drop-shadow-[0_0_4px_rgba(0,0,0,0.6)]"
  >
    <path d="M12 4L6 18L12 16L18 18L12 4Z" />
  </svg>
);

const POINTER_SLOTS = Array.from(
  { length: 10 },
  (_, index) => `enemy-pointer-${index}`
);

export const EnemyPointers: React.FC<EnemyPointersProps> = memo(({ containerRef }) => {
  const [isMobile, setIsMobile] = useState(() => screenService.isMobile());
  const { rs } = useResponsiveUI();

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  const pointerSize = isMobile ? rs(20) : 20;

  return (
    <div
      ref={containerRef}
      id="enemy-pointer-container"
      className="absolute inset-0 z-[105]"
    >
      {POINTER_SLOTS.map(pointerKey => (
        <div
          key={pointerKey}
          className={`absolute left-0 top-0 flex items-center justify-center transition-opacity duration-200`}
          style={{
            opacity: 0,
            width: pointerSize,
            height: pointerSize,
          }}
        >
          {isMobile ? <MobilePointer /> : <DesktopPointer />}
        </div>
      ))}
    </div>
  );
});
