import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/ScreenService';

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
    className="w-full h-full drop-shadow-[0_0_4px_rgba(0,0,0,0.6)]"
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
    className="w-full h-full drop-shadow-[0_0_4px_rgba(0,0,0,0.6)]"
  >
    <path d="M12 4L6 18L12 16L18 18L12 4Z" />
  </svg>
);

export const EnemyPointers: React.FC<EnemyPointersProps> = memo(({ containerRef }) => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-[105]">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className={`absolute top-0 left-0 w-5 h-5 flex items-center justify-center transition-opacity duration-200`}
          style={{ opacity: 0, willChange: 'transform, opacity' }}
        >
          {isMobile ? <MobilePointer /> : <DesktopPointer />}
        </div>
      ))}
    </div>
  );
});
