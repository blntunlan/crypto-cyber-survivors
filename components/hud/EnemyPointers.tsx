import React from 'react';

interface EnemyPointersProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * EnemyPointers - Arrow indicators pointing to off-screen enemies
 * 
 * Note: Position, rotation, and visibility are controlled via Direct DOM
 * manipulation from the parent's RAF loop.
 */
export const EnemyPointers: React.FC<EnemyPointersProps> = ({ containerRef }) => {
    return (
        <div ref={containerRef} className="absolute inset-0 z-[105]">
            {[...Array(10)].map((_, i) => (
                <div
                    key={i}
                    className="absolute top-0 left-0 w-8 h-8 flex items-center justify-center transition-opacity duration-200"
                    style={{ opacity: 0, willChange: 'transform, opacity' }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        stroke="white"
                        strokeWidth="2"
                        className="w-full h-full drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                    >
                        <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
                    </svg>
                </div>
            ))}
        </div>
    );
};
