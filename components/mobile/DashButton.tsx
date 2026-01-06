/**
 * DashButton - Touch Button for Dash Action
 *
 * A large touch-friendly button for triggering dash.
 * Shows cooldown state visually.
 */

import React, { useState, useCallback, useEffect } from 'react';

interface DashButtonProps {
  /** Called when dash is triggered */
  onDash: () => void;
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
  cooldownMs = 500,
  size = 80,
  hapticFeedback = true,
  disabled = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const isReady = cooldownRemaining <= 0 && !disabled;

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const interval = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 50));
    }, 50);

    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      if (!isReady) return;

      setIsPressed(true);
      // Only lock button briefly to allow double/triple dash if engine permits
      // The visual cooldown is misleading for multi-charge dash systems, so we use a short debounce
      setCooldownRemaining(100);
      onDash();

      // Haptic feedback (with safe check for unsupported browsers like Safari iOS)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- navigator.vibrate doesn't exist on Safari iOS
      if (hapticFeedback) navigator.vibrate?.(20);
    },
    [isReady, onDash, hapticFeedback]
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsPressed(false);
  }, []);

  // Calculate cooldown percentage for visual
  const cooldownPercent = cooldownRemaining / cooldownMs;

  // Styles
  const buttonStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    borderRadius: '50%',
    background: isPressed
      ? 'radial-gradient(circle, rgba(34, 211, 238, 0.8) 0%, rgba(34, 211, 238, 0.4) 100%)'
      : isReady
        ? 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)'
        : 'radial-gradient(circle, rgba(100, 100, 100, 0.3) 0%, rgba(100, 100, 100, 0.1) 100%)',
    border: `3px solid ${isReady ? 'rgba(34, 211, 238, 0.6)' : 'rgba(100, 100, 100, 0.4)'}`,
    boxShadow: isPressed
      ? '0 0 30px rgba(34, 211, 238, 0.6), inset 0 0 20px rgba(34, 211, 238, 0.3)'
      : isReady
        ? '0 0 15px rgba(34, 211, 238, 0.3)'
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
    fontSize: size * 0.35,
    color: isReady ? '#22d3ee' : 'rgba(255, 255, 255, 0.4)',
    pointerEvents: 'none',
    zIndex: 1,
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
    bottom: -20,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={buttonStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {cooldownRemaining > 0 && <div style={cooldownOverlayStyle} />}
      <span style={iconStyle}>⚡</span>
      <span style={labelStyle}>DASH</span>
    </div>
  );
};
