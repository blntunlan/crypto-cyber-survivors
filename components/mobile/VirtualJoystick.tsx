/**
 * VirtualJoystick - Classic Touch Joystick Component
 * 
 * A fixed-position virtual joystick for movement control.
 * Provides smooth directional input with deadzone support.
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { JOYSTICK_SIZES, JoystickSize } from '../../types/MobileSettings';

interface JoystickState {
    active: boolean;
    touchId: number | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

interface VirtualJoystickProps {
    /** Called with movement vector on each touch move */
    onMove: (dx: number, dy: number) => void;
    /** Joystick size preset */
    size?: JoystickSize;
    /** Deadzone radius (0-1, default 0.15) */
    deadzone?: number;
    /** Enable haptic feedback */
    hapticFeedback?: boolean;
    /** Disabled state */
    disabled?: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
    onMove,
    size = 'medium',
    deadzone = 0.15,
    hapticFeedback = true,
    disabled = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [state, setState] = useState<JoystickState>({
        active: false,
        touchId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
    });

    const joystickSize = JOYSTICK_SIZES[size];
    const thumbSize = joystickSize * 0.4;
    const maxDistance = (joystickSize - thumbSize) / 2;

    // Calculate thumb position relative to center
    const getThumbOffset = useCallback(() => {
        if (!state.active) return { x: 0, y: 0 };

        const dx = state.currentX - state.startX;
        const dy = state.currentY - state.startY;
        const distance = Math.hypot(dx, dy);

        if (distance === 0) return { x: 0, y: 0 };

        // Clamp to max distance
        const clampedDistance = Math.min(distance, maxDistance);
        const ratio = clampedDistance / distance;

        return {
            x: dx * ratio,
            y: dy * ratio,
        };
    }, [state, maxDistance]);

    // Calculate movement vector
    const calculateMovement = useCallback(() => {
        if (!state.active) return { dx: 0, dy: 0 };

        const dx = state.currentX - state.startX;
        const dy = state.currentY - state.startY;
        const distance = Math.hypot(dx, dy);

        // Normalize to -1 to 1 range based on max distance
        const normalizedDistance = Math.min(distance / maxDistance, 1);

        // Apply deadzone
        if (normalizedDistance < deadzone) {
            return { dx: 0, dy: 0 };
        }

        // Remap from deadzone to 1
        const adjustedMagnitude = (normalizedDistance - deadzone) / (1 - deadzone);

        // Calculate direction
        const dirX = distance > 0 ? dx / distance : 0;
        const dirY = distance > 0 ? dy / distance : 0;

        return {
            dx: dirX * adjustedMagnitude,
            dy: dirY * adjustedMagnitude,
        };
    }, [state, maxDistance, deadzone]);

    // Touch handlers
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled || state.active) return;
        e.preventDefault();

        const touch = e.changedTouches[0];
        if (!touch) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Center of joystick
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        setState({
            active: true,
            touchId: touch.identifier,
            startX: centerX,
            startY: centerY,
            currentX: touch.clientX,
            currentY: touch.clientY,
        });

        // Haptic feedback
        if (hapticFeedback) {
            navigator.vibrate?.(10);
        }
    }, [disabled, state.active, hapticFeedback]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!state.active) return;
        e.preventDefault();

        for (const touch of Array.from(e.changedTouches)) {
            if (touch.identifier === state.touchId) {
                setState(prev => ({
                    ...prev,
                    currentX: touch.clientX,
                    currentY: touch.clientY,
                }));
            }
        }
    }, [state.active, state.touchId]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        for (const touch of Array.from(e.changedTouches)) {
            if (touch.identifier === state.touchId) {
                setState({
                    active: false,
                    touchId: null,
                    startX: 0,
                    startY: 0,
                    currentX: 0,
                    currentY: 0,
                });
                onMove(0, 0);
            }
        }
    }, [state.touchId, onMove]);

    // Update movement on state change
    useEffect(() => {
        if (state.active) {
            const { dx, dy } = calculateMovement();
            onMove(dx, dy);
        }
    }, [state.currentX, state.currentY, state.active, calculateMovement, onMove]);

    const thumbOffset = getThumbOffset();

    // Styles
    const containerStyle: React.CSSProperties = {
        position: 'relative',
        width: joystickSize,
        height: joystickSize,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        touchAction: 'none',
        userSelect: 'none',
        opacity: disabled ? 0.5 : 1,
    };

    const thumbStyle: React.CSSProperties = {
        position: 'absolute',
        width: thumbSize,
        height: thumbSize,
        borderRadius: '50%',
        background: state.active
            ? 'radial-gradient(circle, rgba(34, 211, 238, 0.9) 0%, rgba(34, 211, 238, 0.5) 100%)'
            : 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
        boxShadow: state.active
            ? '0 0 20px rgba(34, 211, 238, 0.5)'
            : '0 0 10px rgba(255, 255, 255, 0.2)',
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${thumbOffset.x}px), calc(-50% + ${thumbOffset.y}px))`,
        transition: state.active ? 'none' : 'transform 0.15s ease-out',
        pointerEvents: 'none',
    };

    return (
        <div
            ref={containerRef}
            style={containerStyle}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            <div style={thumbStyle} />
        </div>
    );
};
