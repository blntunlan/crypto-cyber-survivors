/**
 * MobileControls - Mobile Touch Controls Container
 *
 * Renders either VirtualJoystick or DragToMove based on settings.
 * Handles touch input and forwards movement/dash to game engine.
 */

import React, { useCallback, useRef } from 'react';
import { VirtualJoystick } from './VirtualJoystick';
import { DashButton } from './DashButton';
import { DragToMoveController } from './DragToMoveController';
import {
  type MobileControlSettings,
  DEFAULT_MOBILE_SETTINGS,
} from '../../types/MobileSettings';
import { GameStatus } from '../../types';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';

interface MobileControlsProps {
  /** Current game status */
  status: GameStatus;
  /** Control settings */
  settings?: Partial<MobileControlSettings>;
  /** Called with movement vector */
  onMove: (dx: number, dy: number) => void;
  /** Called when dash is triggered */
  onDash: () => void;
  /** Dash cooldown in ms (passed to button) */
  dashCooldownMs?: number;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  status,
  settings: userSettings,
  onMove,
  onDash,
  dashCooldownMs = 500,
}) => {
  const { scale, rs } = useResponsiveUI();

  // Merge user settings with defaults
  const settings: MobileControlSettings = {
    ...DEFAULT_MOBILE_SETTINGS,
    ...userSettings,
  };

  // Track last movement for dash direction (joystick mode)
  const lastMoveRef = useRef({ dx: 0, dy: 0 });

  // Only show controls during gameplay
  const isActive = status === GameStatus.PLAYING;

  // Handle movement from either control system
  const handleMove = useCallback(
    (dx: number, dy: number, _speed?: number) => {
      lastMoveRef.current = { dx, dy };
      onMove(dx, dy);
    },
    [onMove]
  );

  // Handle dash
  const handleDash = useCallback(() => {
    onDash();
  }, [onDash]);

  if (!isActive) {
    return null;
  }

  // Render based on control type
  if (settings.controlType === 'drag') {
    return (
      <DragToMoveController
        onMove={handleMove}
        onDash={handleDash}
        showVisualFeedback={settings.showDragFeedback}
        hapticFeedback={settings.hapticFeedback}
        sensitivity={settings.sensitivity}
        disabled={!isActive}
        scale={scale}
      />
    );
  }

  // Joystick mode with separate dash button
  return (
    <>
      {/* Left zone - Joystick */}
      <div
        className="mobile-controls-zone mobile-controls-zone--left"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent:
            settings.joystickPosition === 'left' ? 'flex-start' : 'flex-end',
          padding: rs(20),
          paddingBottom: rs(40),
        }}
      >
        <VirtualJoystick
          onMove={handleMove}
          size={settings.joystickSize}
          hapticFeedback={settings.hapticFeedback}
          disabled={!isActive}
          scale={scale}
        />
      </div>

      {/* Right zone - Dash Button */}
      <div
        className="mobile-controls-zone mobile-controls-zone--right"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent:
            settings.joystickPosition === 'left' ? 'flex-end' : 'flex-start',
          padding: rs(20),
          paddingBottom: rs(40),
        }}
      >
        <DashButton
          onDash={handleDash}
          cooldownMs={dashCooldownMs}
          hapticFeedback={settings.hapticFeedback}
          disabled={!isActive}
          size={rs(80)}
        />
      </div>
    </>
  );
};
