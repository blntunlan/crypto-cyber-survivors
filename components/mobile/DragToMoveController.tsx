import React, { useRef, useCallback, useState } from 'react';
import { DRAG_THRESHOLDS } from '../../types/MobileSettings';
import { Z_LAYERS } from '../../constants/ZIndex';
import { useTheme } from '../../contexts/useTheme';

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
  onDashRelease?: () => void;
  disabled?: boolean;
  showVisualFeedback?: boolean;
  hapticFeedback?: boolean;
  sensitivity?: number;
  scale?: number;
}

export const DragToMoveController: React.FC<DragToMoveProps> = ({
  onMove,
  onDash,
  onDashRelease,
  disabled = false,
  showVisualFeedback = true,
  hapticFeedback = true,
  sensitivity = 1.0,
  scale = 1.0,
}) => {
  const { theme } = useTheme();
  const accentColor = theme.colors.primary;
  const accentColorRgb = theme.colors.primary.startsWith('#')
    ? hexToRgb(theme.colors.primary)
    : '34, 211, 238';

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

      const DEADZONE = DRAG_THRESHOLDS.DEADZONE * scale;
      const WALK_START = DRAG_THRESHOLDS.WALK_START * scale;
      const RUN_START = DRAG_THRESHOLDS.RUN_START * scale;
      const MAX_DISTANCE = DRAG_THRESHOLDS.MAX_DISTANCE * scale;

      if (distance < DEADZONE) return { dx: 0, dy: 0, speed: 0 };

      const dirX = deltaX / Math.hypot(deltaX, deltaY);
      const dirY = deltaY / Math.hypot(deltaX, deltaY);

      let speedMultiplier = 0;
      if (distance < WALK_START) speedMultiplier = 0;
      else if (distance < RUN_START) {
        speedMultiplier = ((distance - WALK_START) / (RUN_START - WALK_START)) * 0.5;
      } else if (distance < MAX_DISTANCE) {
        speedMultiplier =
          0.5 + ((distance - RUN_START) / (MAX_DISTANCE - RUN_START)) * 0.5;
      } else speedMultiplier = 1.0;

      return {
        dx: dirX * speedMultiplier,
        dy: dirY * speedMultiplier,
        speed: speedMultiplier,
      };
    },
    [sensitivity, scale]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      // FIX: Don't intercept touches on interactive UI elements (pause button, etc.)
      // Safari iOS: e.target may be this overlay div itself, so we use elementsFromPoint
      // to check ALL elements at the touch coordinates (respecting z-index stacking)
      const touch = e.touches[0] ?? e.changedTouches[0];
      if (touch) {
        // Get all elements at touch point, ordered by z-index (topmost first)
        const elementsAtPoint = document.elementsFromPoint(
          touch.clientX,
          touch.clientY
        );

        // Check if any element in the stack is interactive
        const hasInteractiveElement = elementsAtPoint.some(
          el =>
            el.tagName === 'BUTTON' ||
            el.closest('button') !== null ||
            el.classList.contains('pointer-events-auto') ||
            el.closest('.pointer-events-auto') !== null
        );

        if (hasInteractiveElement) {
          // Let the interactive element handle the touch natively
          return;
        }
      }

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

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- navigator.vibrate doesn't exist on Safari iOS
          if (hapticFeedback) navigator.vibrate?.(10);
        } else if (secondTouchIdRef.current === null) {
          // Dash trigger
          secondTouchIdRef.current = touch.identifier;
          setSecondTouchActive(true);
          onDash();
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- navigator.vibrate doesn't exist on Safari iOS
          if (hapticFeedback) navigator.vibrate?.(25);
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
          onDashRelease?.();
        }
      }
    },
    [onMove, onDashRelease]
  );

  return (
    <div
      data-testid="drag-controller"
      className="fixed inset-0 touch-none"
      style={{ zIndex: Z_LAYERS.MOBILE_CONTROLS }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {showVisualFeedback && uiState.active && (
        <>
          {/* Start point */}
          <div
            className="pointer-events-none fixed z-[1001] -ml-5 -mt-5 h-10 w-10 rounded-full border-2 border-white/30"
            style={{ left: uiState.startX, top: dragRef.current.startY }}
          />
          {/* Direction line */}
          <svg className="pointer-events-none fixed inset-0 z-[1000] h-full w-full">
            <line
              x1={uiState.startX}
              y1={dragRef.current.startY}
              x2={uiState.currentX}
              y2={uiState.currentY}
              stroke={`rgba(${accentColorRgb}, ${0.3 + uiState.speed * 0.5})`}
              strokeWidth={2 + uiState.speed * 2}
              strokeLinecap="round"
            />
          </svg>
          {/* Glow at finger */}
          <div
            className="pointer-events-none fixed z-[1001] -ml-6 -mt-6 h-12 w-12 rounded-full"
            style={{
              left: uiState.currentX,
              top: uiState.currentY,
              background: `radial-gradient(circle, rgba(${accentColorRgb}, ${0.3 + uiState.speed * 0.4}) 0%, transparent 70%)`,
            }}
          />
        </>
      )}

      {secondTouchActive && (
        <div
          className="pointer-events-none fixed left-1/2 top-1/2 z-[1003] -translate-x-1/2 -translate-y-1/2 animate-pulse text-5xl"
          style={{ color: accentColor }}
        >
          ⚡
        </div>
      )}
    </div>
  );
};

// Helper to convert hex to rgb string
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255, 255, 255';
  const [, r, g, b] = result;
  if (!r || !g || !b) return '255, 255, 255';
  return `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}`;
}
