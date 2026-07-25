/**
 * DashButton - Touch Button for Dash Action
 *
 * A large touch-friendly button for triggering dash.
 * Shows cooldown state visually via requestAnimationFrame (no React state loop).
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { EventBus } from '../../services/core/EventBus';
import { useTheme } from '../../contexts/useTheme';
import { Zap } from 'lucide-react';
import { GAME_ENGINE } from '../../constants';
import { TimeService } from '../../services/core/TimeService';

interface DashButtonProps {
  /** Called when dash is triggered (press start) */
  onDash: () => void;
  /** Called when dash button is released */
  onDashRelease?: () => void;
  /** Cooldown duration in milliseconds */
  cooldownMs?: number;
  /** Window after the first dash where a second touch can queue double dash */
  doubleDashWindowMs?: number;
  /** Button size in pixels */
  size?: number;
  /** Enable haptic feedback */
  hapticFeedback?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export const DashButton: React.FC<DashButtonProps> = ({
  onDash,
  onDashRelease,
  cooldownMs = 500,
  doubleDashWindowMs = GAME_ENGINE.DASH_DURATION_MOBILE,
  size = 80,
  hapticFeedback = true,
  disabled = false,
}) => {
  const { theme, isRetro } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [isReady, setIsReady] = useState(!disabled);
  const [isDoubleDashReady, setIsDoubleDashReady] = useState(false);

  const cooldownEndRef = useRef<number>(0);
  const totalCooldownDurationRef = useRef(cooldownMs);
  const cooldownOverlayRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const doubleDashWindowEndRef = useRef(0);
  const doubleDashConsumedRef = useRef(false);

  const accentColor = theme.colors.primary;
  const accentColorRgb = theme.colors.primary.startsWith('#')
    ? hexToRgb(theme.colors.primary)
    : '34, 211, 238';

  // Update isReady if disabled prop changes
  useEffect(() => {
    setIsReady(!disabled && TimeService.getGameTime() >= cooldownEndRef.current);
  }, [disabled]);

  const updateCooldownVisual = useCallback(() => {
    const now = TimeService.getGameTime();
    const remaining = Math.max(0, cooldownEndRef.current - now);

    if (remaining <= 0) {
      if (cooldownOverlayRef.current) {
        cooldownOverlayRef.current.style.display = 'none';
        cooldownOverlayRef.current.style.height = '0%';
      }
      setIsReady(!disabled);
      setIsDoubleDashReady(false);
      return; // Stop animation loop
    }

    if (doubleDashWindowEndRef.current > 0 && now > doubleDashWindowEndRef.current) {
      doubleDashWindowEndRef.current = 0;
      setIsDoubleDashReady(false);
    }

    const percent =
      totalCooldownDurationRef.current > 0
        ? remaining / totalCooldownDurationRef.current
        : 0;

    if (cooldownOverlayRef.current) {
      cooldownOverlayRef.current.style.display = 'block';
      cooldownOverlayRef.current.style.height = `${percent * 100}%`;
    }

    frameRef.current = requestAnimationFrame(updateCooldownVisual);
  }, [disabled]);

  const startCooldown = useCallback(
    (duration: number) => {
      cooldownEndRef.current = TimeService.getGameTime() + duration;
      totalCooldownDurationRef.current = duration;
      setIsReady(false);

      if (cooldownOverlayRef.current) {
        cooldownOverlayRef.current.style.display = 'block';
        cooldownOverlayRef.current.style.height = '100%';
      }

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = requestAnimationFrame(updateCooldownVisual);
    },
    [updateCooldownVisual]
  );

  // Listen for global engine dash events to sync cooldown visuals
  useEffect(() => {
    const unsub = EventBus.on('playerDash', data => {
      if (data.isDoubleDash) {
        doubleDashWindowEndRef.current = 0;
        doubleDashConsumedRef.current = true;
        setIsDoubleDashReady(false);
      } else {
        doubleDashWindowEndRef.current =
          TimeService.getGameTime() + Math.max(data.duration, doubleDashWindowMs);
        doubleDashConsumedRef.current = false;
        setIsDoubleDashReady(true);
      }
      startCooldown(data.cooldown);
    });
    return () => {
      unsub();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [doubleDashWindowMs, startCooldown]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      const canQueueDoubleDash =
        !doubleDashConsumedRef.current &&
        doubleDashWindowEndRef.current > 0 &&
        TimeService.getGameTime() <= doubleDashWindowEndRef.current;

      if (disabled || (!isReady && !canQueueDoubleDash)) return;

      if (canQueueDoubleDash) {
        doubleDashConsumedRef.current = true;
        doubleDashWindowEndRef.current = 0;
        setIsDoubleDashReady(false);
      }

      setIsPressed(true);
      if (!canQueueDoubleDash) {
        startCooldown(cooldownMs);
      }
      onDash();

      // Haptic feedback (with safe check for unsupported browsers like Safari iOS)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- navigator.vibrate doesn't exist on Safari iOS
      if (hapticFeedback) navigator.vibrate?.(20);
    },
    [onDash, hapticFeedback, disabled, isReady, startCooldown, cooldownMs]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsPressed(false);
      onDashRelease?.();
    },
    [onDashRelease]
  );

  // Styles
  const buttonStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    borderRadius: isRetro ? '0' : '50%',
    background: isPressed
      ? `radial-gradient(circle, rgba(${accentColorRgb}, 0.8) 0%, rgba(${accentColorRgb}, 0.4) 100%)`
      : isReady || isDoubleDashReady
        ? 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)'
        : 'radial-gradient(circle, rgba(100, 100, 100, 0.3) 0%, rgba(100, 100, 100, 0.1) 100%)',
    border: `${isRetro ? '4px' : '3px'} solid ${isReady || isDoubleDashReady ? accentColor : 'rgba(100, 100, 100, 0.4)'}`,
    boxShadow: isPressed
      ? `0 0 30px rgba(${accentColorRgb}, 0.6), inset 0 0 20px rgba(${accentColorRgb}, 0.3)`
      : isReady || isDoubleDashReady
        ? `0 0 15px rgba(${accentColorRgb}, 0.3)`
        : 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    touchAction: 'none',
    userSelect: 'none',
    cursor: isReady || isDoubleDashReady ? 'pointer' : 'not-allowed',
    transition: 'box-shadow 0.1s ease, background 0.1s ease',
    overflow: 'hidden',
  };

  const iconStyle: React.CSSProperties = {
    width: size * 0.5,
    height: size * 0.5,
    color:
      isReady || isDoubleDashReady
        ? isRetro
          ? '#ffffff'
          : accentColor
        : 'rgba(255, 255, 255, 0.4)',
    pointerEvents: 'none',
    zIndex: 1,
    fill: isPressed ? 'currentColor' : 'none',
  };

  const cooldownOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '0%', // Managed by ref
    display: 'none',
    background: 'rgba(0, 0, 0, 0.5)',
    pointerEvents: 'none',
  };

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: isRetro ? 4 : 8,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: isRetro ? 8 : 10,
    color: isReady || isDoubleDashReady ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    fontFamily: isRetro ? '"Pixelify Sans", cursive' : 'inherit',
    fontWeight: 'bold',
    letterSpacing: 1,
    whiteSpace: 'nowrap',
    zIndex: 2,
  };

  return (
    <div
      data-testid="dash-button"
      style={buttonStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div ref={cooldownOverlayRef} style={cooldownOverlayStyle} />
      <Zap style={iconStyle} />
      <span style={labelStyle}>DASH</span>
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
