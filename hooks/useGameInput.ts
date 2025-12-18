import { useEffect, useRef } from 'react';

export const useGameInput = () => {
    const keys = useRef<Record<string, boolean>>({});

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

    const getMovementVector = () => {
        let dx = 0;
        let dy = 0;
        if (keys.current['ArrowUp'] || keys.current['w']) dy -= 1;
        if (keys.current['ArrowDown'] || keys.current['s']) dy += 1;
        if (keys.current['ArrowLeft'] || keys.current['a']) dx -= 1;
        if (keys.current['ArrowRight'] || keys.current['d']) dx += 1;
        return { dx, dy };
    };

    const isSpacePressed = () => keys.current[' '] || keys.current['Spacebar'];

    return { getMovementVector, isSpacePressed };
};
