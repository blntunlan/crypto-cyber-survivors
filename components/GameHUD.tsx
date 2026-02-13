/**
 * GameHUD - Heads-Up Display Component
 *
 * Renders all in-game HUD elements.
 * Uses custom hooks for performance-critical updates.
 *
 * Hooks:
 * - useHUDEvents: EventBus subscriptions
 * - useHUDUpdateLoop: High-frequency DOM updates
 * - useEnemyPointers: Off-screen enemy indicators
 */

import React, { useRef } from 'react';
import { GameStatus, type Player } from '../types';
import { type GameEnemy } from '../factories/EnemyFactory';
import { useDevice } from '../hooks/useDevice';
import { useGameStore } from '../stores/gameStore';
import { getHUDLayout } from '../config/UILayout';

// Custom hooks
import { useHUDEvents } from '../hooks/useHUDEvents';
import { useHUDUpdateLoop } from '../hooks/useHUDUpdateLoop';
import { useEnemyPointers } from '../hooks/useEnemyPointers';

// Import HUD sub-components
import {
  FPSCounter,
  ClutchAnnouncement,
  LevelUpFlash,
  NearDeathGlow,
  EnemyPointers,
  AchievementPopup,
  MilestoneAnnouncer,
  ComboPanel,
} from './hud';

// Import animations
import './hud/hud-animations.css';

interface GameHUDProps {
  status: GameStatus;
  enemies?: GameEnemy[];
  width?: number;
  height?: number;
  player?: Player;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  status,
  enemies = [],
  width = 0,
  height = 0,
  player,
}) => {
  // ---------- DEVICE & LAYOUT ----------
  const device = useDevice();
  const { hudScale, showFPS: showFPSSource } = useGameStore(state => state.graphics);
  const layout = getHUDLayout(device.platform);
  const globalScale = layout.globalScale * hudScale;

  // ---------- REFS ----------
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerContainerRef = useRef<HTMLDivElement>(null);

  // ---------- CUSTOM HOOKS ----------
  const { uiMeta, flash, showMilestone, clutchActive, achievement } = useHUDEvents(
    player,
    status
  );

  useHUDUpdateLoop({
    status,
    player,
    containerRef,
    comboPanelOffset: layout.elements.comboPanel.offset,
  });

  useEnemyPointers({
    status,
    enemies,
    width,
    height,
    globalScale,
    pointerContainerRef,
  });

  // ---------- RENDER ----------
  if (status === GameStatus.MENU) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      style={
        {
          zIndex: 100, // Z_LAYERS.HUD
          '--hud-scale': globalScale.toString(),
          transform: `scale(${globalScale})`,
          transformOrigin: 'top left',
          width: `${100 / globalScale}%`,
          height: `${100 / globalScale}%`,
        } as React.CSSProperties
      }
    >
      <NearDeathGlow maxHp={player?.maxHp ?? 100} />
      {/* FPS Counter - Desktop only (mobile version is in GameUI below LiveFeed) */}
      {device.platform === 'desktop' &&
        (layout.elements.fpsCounter.visible || showFPSSource) && <FPSCounter />}
      <EnemyPointers containerRef={pointerContainerRef} />
      <LevelUpFlash intensity={flash} />
      <ClutchAnnouncement active={clutchActive} />
      {layout.elements.comboPanel.visible && (
        <ComboPanel
          containerRef={containerRef}
          maxStreak={uiMeta.maxStreak}
          totalBonusXp={uiMeta.totalBonusXp}
        />
      )}
      {layout.elements.milestoneAnnouncer.visible && (
        <MilestoneAnnouncer
          show={showMilestone}
          text={uiMeta.milestoneText}
          color={uiMeta.milestoneColor}
        />
      )}
      {layout.elements.achievementPopup.visible && (
        <AchievementPopup achievement={achievement} />
      )}
    </div>
  );
};
