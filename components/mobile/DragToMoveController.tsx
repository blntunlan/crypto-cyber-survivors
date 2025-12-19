/**
 * DragToMoveController - Modern Touch Control System
 * 
 * Touch anywhere to set movement origin, drag to move.
 * Second finger tap triggers dash in movement direction.
 * Provides smooth, threshold-based speed control.
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { DRAG_THRESHOLDS } from '../../types/MobileSettings';

interface DragState {
    active: boolean;
    touchId: number | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

interface DragToMoveProps {
    /** Called with movement vector on each update */
    onMove: (dx: number, dy: number, speed: number) => void;
    /** Called when dash is triggered */
    onDash: () => void;
    /** Disabled state */
    disabled?: boolean;
    /** Show visual feedback lines */
    showVisualFeedback?: boolean;
    /** Enable haptic feedback */
    hapticFeedback?: boolean;
    /** Sensitivity multiplier */
    sensitivity?: number;
}

export const DragToMoveController: React.FC<DragToMoveProps> = ({
    onMove,
    onDash,
    disabled = false,
    showVisualFeedback = true,
    hapticFeedback = true,
    sensitivity = 1.0,
}) => {
    const [dragState, setDragState] = useState<DragState>({
        active: false,
        touchId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
    });

    const [secondTouchActive, setSecondTouchActive] = useState(false);
    const secondTouchIdRef = useRef<number | null>(null);
    const lastMoveRef = useRef({ dx: 0, dy: 0, speed: 0 });

    // Calculate movement with threshold-based speed
    const calculateMovement = useCallback((state: DragState) => {
        if (!state.active) return { dx: 0, dy: 0, speed: 0 };

        const deltaX = state.currentX - state.startX;
        const deltaY = state.currentY - state.startY;
        const distance = Math.hypot(deltaX, deltaY) * sensitivity;

        // Apply thresholds
        const { DEADZONE, WALK_START, RUN_START, MAX_DISTANCE } = DRAG_THRESHOLDS;

        if (distance < DEADZONE) {
            return { dx: 0, dy: 0, speed: 0 };
        }

        // Calculate direction (normalized)
        const dirX = deltaX / Math.hypot(deltaX, deltaY);
        const dirY = deltaY / Math.hypot(deltaX, deltaY);

        // Calculate speed multiplier (0 to 1)
        let speedMultiplier = 0;

        if (distance < WALK_START) {
            speedMultiplier = 0;
        } else if (distance < RUN_START) {
            // Linear ramp 0 to 0.5
            const progress = (distance - WALK_START) / (RUN_START - WALK_START);
            speedMultiplier = progress * 0.5;
        } else if (distance < MAX_DISTANCE) {
            // Linear ramp 0.5 to 1.0
            const progress = (distance - RUN_START) / (MAX_DISTANCE - RUN_START);
            speedMultiplier = 0.5 + progress * 0.5;
        } else {
            speedMultiplier = 1.0;
        }

        return {
            dx: dirX * speedMultiplier,
            dy: dirY * speedMultiplier,
            speed: speedMultiplier,
        };
    }, [sensitivity]);

    // Touch start handler
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled) return;
        e.preventDefault();

        for (const touch of Array.from(e.changedTouches)) {
            // First finger - movement
            if (dragState.touchId === null) {
                setDragState({
                    active: true,
                    touchId: touch.identifier,
                    startX: touch.clientX,
                    startY: touch.clientY,
                    currentX: touch.clientX,
                    currentY: touch.clientY,
                });

                if (hapticFeedback) {
                    navigator.vibrate?.(10);
                }
            }
            // Second finger - DASH!
            else if (secondTouchIdRef.current === null) {
                secondTouchIdRef.current = touch.identifier;
                setSecondTouchActive(true);
                onDash();

                if (hapticFeedback) {
                    navigator.vibrate?.(25);
                }
            }
        }
    }, [disabled, dragState.touchId, onDash, hapticFeedback]);

    // Touch move handler
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!dragState.active) return;
        e.preventDefault();

        for (const touch of Array.from(e.changedTouches)) {
            if (touch.identifier === dragState.touchId) {
                setDragState(prev => ({
                    ...prev,
                    currentX: touch.clientX,
                    currentY: touch.clientY,
                }));
            }
        }
    }, [dragState.active, dragState.touchId]);

    // Touch end handler
    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        for (const touch of Array.from(e.changedTouches)) {
            // Movement finger lifted
            if (touch.identifier === dragState.touchId) {
                setDragState({
                    active: false,
                    touchId: null,
                    startX: 0,
                    startY: 0,
                    currentX: 0,
                    currentY: 0,
                });
                lastMoveRef.current = { dx: 0, dy: 0, speed: 0 };
                onMove(0, 0, 0);
            }

            // Dash finger lifted
            if (touch.identifier === secondTouchIdRef.current) {
                secondTouchIdRef.current = null;
                setSecondTouchActive(false);
            }
        }
    }, [dragState.touchId, onMove]);

    // Update movement on drag change
    useEffect(() => {
        if (dragState.active) {
            const movement = calculateMovement(dragState);
            lastMoveRef.current = movement;
            onMove(movement.dx, movement.dy, movement.speed);
        }
    }, [dragState, calculateMovement, onMove]);

    // Visual feedback rendering
    const renderFeedback = () => {
        if (!showVisualFeedback || !dragState.active) return null;

        const movement = lastMoveRef.current;
        const distance = Math.min(
            Math.hypot(
                dragState.currentX - dragState.startX,
                dragState.currentY - dragState.startY
            ),
            DRAG_THRESHOLDS.MAX_DISTANCE
        );

        // Only show if moving past deadzone
        if (distance < DRAG_THRESHOLDS.DEADZONE) return null;

        return (
            <>
                {/* Start point indicator */}
                <div
                    style={{
                        position: 'fixed',
                        left: dragState.startX - 20,
                        top: dragState.startY - 20,
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        pointerEvents: 'none',
                        zIndex: 1001,
                    }}
                />

                {/* Direction line */}
                <svg
                    style={{
                        position: 'fixed',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 1000,
                    }}
                >
                    <line
                        x1={dragState.startX}
                        y1={dragState.startY}
                        x2={dragState.currentX}
                        y2={dragState.currentY}
                        stroke={`rgba(34, 211, 238, ${0.3 + movement.speed * 0.5})`}
                        strokeWidth={2 + movement.speed * 2}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Current position indicator */}
                <div
                    style={{
                        position: 'fixed',
                        left: dragState.currentX - 25,
                        top: dragState.currentY - 25,
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, 
              rgba(34, 211, 238, ${0.3 + movement.speed * 0.4}) 0%, 
              transparent 70%)`,
                        pointerEvents: 'none',
                        zIndex: 1001,
                    }}
                />

                {/* Speed indicator */}
                {movement.speed > 0 && (
                    <div
                        style={{
                            position: 'fixed',
                            left: dragState.startX + 30,
                            top: dragState.startY - 10,
                            fontSize: 12,
                            color: 'rgba(255, 255, 255, 0.6)',
                            pointerEvents: 'none',
                            zIndex: 1002,
                        }}
                    >
                        {Math.round(movement.speed * 100)}%
                    </div>
                )}
            </>
        );
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                touchAction: 'none',
                zIndex: 998,
                // Don't block pointer events on UI elements - transparent
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            {renderFeedback()}

            {/* Dash indicator when second touch is active */}
            {secondTouchActive && (
                <div
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: 48,
                        color: 'rgba(34, 211, 238, 0.8)',
                        textShadow: '0 0 20px rgba(34, 211, 238, 0.6)',
                        pointerEvents: 'none',
                        zIndex: 1003,
                        animation: 'pulse 0.3s ease-out',
                    }}
                >
                    ⚡
                </div>
            )}
        </div>
    );
};
