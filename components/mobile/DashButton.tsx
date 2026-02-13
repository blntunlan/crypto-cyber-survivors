/**
 * DashButton - Touch Button for Dash Action
 *
 * A large touch-friendly button for triggering dash.
 * Shows cooldown state visually.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { EventBus } from '../../services/core/EventBus';
import { useTheme } from '../../contexts/useTheme';
import { Zap } from 'lucide-react';

interface DashButtonProps {
  /** Called when dash is triggered (press start) */
  onDash: () => void;
  /** Called when dash button is released */
  onDashRelease?: () => void;
  /** Cooldown duration in milliseconds */
  cooldownMs?: number;
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
  size = 80,
  hapticFeedback = true,
  disabled = false,
}) => {
  const { theme, isRetro } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [totalCooldownDuration, setTotalCooldownDuration] = useState(cooldownMs);

  const isReady = cooldownRemaining <= 0 && !disabled;
  const accentColor = theme.colors.primary;
  const accentColorRgb = theme.colors.primary.startsWith('#')
    ? hexToRgb(theme.colors.primary)
    : '34, 211, 238';

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const interval = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 50));
    }, 50);

    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // Listen for global engine dash events to sync cooldown visuals
  useEffect(() => {
    const unsub = EventBus.on('playerDash', data => {
      setCooldownRemaining(data.cooldown);
      setTotalCooldownDuration(data.cooldown);
    });
    return unsub;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      if (disabled) return;

      setIsPressed(true);
      // Fallback visual cooldown if engine event is delayed
      setCooldownRemaining(cooldownMs);
      setTotalCooldownDuration(cooldownMs);
      onDash();

      // Haptic feedback (with safe check for unsupported browsers like Safari iOS)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- navigator.vibrate doesn't exist on Safari iOS
      if (hapticFeedback) navigator.vibrate?.(20);
    },
    [onDash, hapticFeedback, disabled, cooldownMs]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsPressed(false);
      onDashRelease?.();
    },
    [onDashRelease]
  );

  // Calculate cooldown percentage for visual
  const cooldownPercent =
    totalCooldownDuration > 0 ? cooldownRemaining / totalCooldownDuration : 0;

  // Styles
  const buttonStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    borderRadius: isRetro ? '0' : '50%',
    background: isPressed
      ? `radial-gradient(circle, rgba(${accentColorRgb}, 0.8) 0%, rgba(${accentColorRgb}, 0.4) 100%)`
      : isReady
        ? 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)'
        : 'radial-gradient(circle, rgba(100, 100, 100, 0.3) 0%, rgba(100, 100, 100, 0.1) 100%)',
    border: `${isRetro ? '4px' : '3px'} solid ${isReady ? accentColor : 'rgba(100, 100, 100, 0.4)'}`,
    boxShadow: isPressed
      ? `0 0 30px rgba(${accentColorRgb}, 0.6), inset 0 0 20px rgba(${accentColorRgb}, 0.3)`
      : isReady
        ? `0 0 15px rgba(${accentColorRgb}, 0.3)`
        : 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    touchAction: 'none',
    userSelect: 'none',
    cursor: isReady ? 'pointer' : 'not-allowed',
    transition: 'box-shadow 0.1s ease, background 0.1s ease',
    overflow: 'hidden',
  };

  const iconStyle: React.CSSProperties = {
    width: size * 0.5,
    height: size * 0.5,
    color: isReady ? (isRetro ? '#ffffff' : accentColor) : 'rgba(255, 255, 255, 0.4)',
    pointerEvents: 'none',
    zIndex: 1,
    fill: isPressed ? 'currentColor' : 'none',
  };

  const cooldownOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: `${cooldownPercent * 100}%`,
    background: 'rgba(0, 0, 0, 0.5)',
    transition: 'height 0.05s linear',
    pointerEvents: 'none',
  };

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: isRetro ? 4 : 8,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: isRetro ? 8 : 10,
    color: isReady ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    fontFamily: isRetro ? '"Pixelify Sans", cursive' : 'inherit',
    fontWeight: 'bold',
    letterSpacing: 1,
    whiteSpace: 'nowrap',
    zIndex: 2,
  };

  return (
    <div
      style={buttonStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {cooldownRemaining > 0 && <div style={cooldownOverlayStyle} />}
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
