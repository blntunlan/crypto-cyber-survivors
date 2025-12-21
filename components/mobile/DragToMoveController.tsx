import React, { useRef, useCallback, useState } from 'react';
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
  onMove: (dx: number, dy: number, speed: number) => void;
  onDash: () => void;
  disabled?: boolean;
  showVisualFeedback?: boolean;
  hapticFeedback?: boolean;
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
  // 1. Logic State (Ref) - Zero Latency
  const dragRef = useRef<DragState>({
    active: false,
    touchId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  // 2. UI State (State) - Only for visual feedback
  const [uiState, setUiState] = useState({
    active: false,
    currentX: 0,
    currentY: 0,
    startX: 0,
    speed: 0,
  });
  const [secondTouchActive, setSecondTouchActive] = useState(false);
  const secondTouchIdRef = useRef<number | null>(null);

  // High performance movement calculation
  const getMovement = useCallback(
    (currentX: number, currentY: number, startX: number, startY: number) => {
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      const distance = Math.hypot(deltaX, deltaY) * sensitivity;

      const { DEADZONE, WALK_START, RUN_START, MAX_DISTANCE } = DRAG_THRESHOLDS;

      if (distance < DEADZONE) return { dx: 0, dy: 0, speed: 0 };

      const dirX = deltaX / Math.hypot(deltaX, deltaY);
      const dirY = deltaY / Math.hypot(deltaX, deltaY);

      let speedMultiplier = 0;
      if (distance < WALK_START) speedMultiplier = 0;
      else if (distance < RUN_START)
        speedMultiplier = ((distance - WALK_START) / (RUN_START - WALK_START)) * 0.5;
      else if (distance < MAX_DISTANCE)
        speedMultiplier = 0.5 + ((distance - RUN_START) / (MAX_DISTANCE - RUN_START)) * 0.5;
      else speedMultiplier = 1.0;

      return { dx: dirX * speedMultiplier, dy: dirY * speedMultiplier, speed: speedMultiplier };
    },
    [sensitivity]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();

      for (const touch of Array.from(e.changedTouches)) {
        if (dragRef.current.touchId === null) {
          // Initialize drag
          const state = {
            active: true,
            touchId: touch.identifier,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
          };
          dragRef.current = state;

          // Immediate logic update
          onMove(0, 0, 0);

          // Visual update
          setUiState({ ...state, speed: 0 });

          if (hapticFeedback) navigator.vibrate(10);
        } else if (secondTouchIdRef.current === null) {
          // Dash trigger
          secondTouchIdRef.current = touch.identifier;
          setSecondTouchActive(true);
          onDash();
          if (hapticFeedback) navigator.vibrate(25);
        }
      }
    },
    [disabled, onMove, onDash, hapticFeedback]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragRef.current.active) return;
      e.preventDefault();

      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === dragRef.current.touchId) {
          const d = dragRef.current;
          d.currentX = touch.clientX;
          d.currentY = touch.clientY;

          // 3. DIRECT MAPPING: Calculate and call onMove immediately
          const move = getMovement(d.currentX, d.currentY, d.startX, d.startY);
          onMove(move.dx, move.dy, move.speed);

          // Update UI state for feedback (can be slightly throttled if needed, but keeping simple for now)
          if (showVisualFeedback) {
            setUiState({
              active: true,
              currentX: d.currentX,
              currentY: d.currentY,
              startX: d.startX,
              speed: move.speed,
            });
          }
        }
      }
    },
    [onMove, getMovement, showVisualFeedback]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === dragRef.current.touchId) {
          dragRef.current = {
            active: false,
            touchId: null,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
          };
          onMove(0, 0, 0);
          setUiState(prev => ({ ...prev, active: false }));
        }
        if (touch.identifier === secondTouchIdRef.current) {
          secondTouchIdRef.current = null;
          setSecondTouchActive(false);
        }
      }
    },
    [onMove]
  );

  return (
    <div
      className="fixed inset-0 touch-none z-[998]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {showVisualFeedback && uiState.active && (
        <>
          {/* Start point */}
          <div
            className="fixed w-10 h-10 -ml-5 -mt-5 rounded-full border-2 border-white/30 pointer-events-none z-[1001]"
            style={{ left: uiState.startX, top: dragRef.current.startY }}
          />
          {/* Direction line */}
          <svg className="fixed inset-0 w-full h-full pointer-events-none z-[1000]">
            <line
              x1={uiState.startX}
              y1={dragRef.current.startY}
              x2={uiState.currentX}
              y2={uiState.currentY}
              stroke={`rgba(34, 211, 238, ${0.3 + uiState.speed * 0.5})`}
              strokeWidth={2 + uiState.speed * 2}
              strokeLinecap="round"
            />
          </svg>
          {/* Glow at finger */}
          <div
            className="fixed w-12 h-12 -ml-6 -mt-6 rounded-full pointer-events-none z-[1001]"
            style={{
              left: uiState.currentX,
              top: uiState.currentY,
              background: `radial-gradient(circle, rgba(34, 211, 238, ${0.3 + uiState.speed * 0.4}) 0%, transparent 70%)`,
            }}
          />
        </>
      )}

      {secondTouchActive && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl text-cyan-400/80 pointer-events-none z-[1003] animate-pulse">
          ⚡
        </div>
      )}
    </div>
  );
};
