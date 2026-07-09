/**
 * @fileoverview Tutorial type definitions shared across config, store, director, and events.
 */

import { type GameEvent } from './events';
import { type GameStatus } from '../types.ts';

/** Tutorial phases in execution order. */
export type TutorialPhase = 'menu-tour' | 'play-setup' | 'gameplay' | 'meta' | 'done';

/** Lifecycle state of a tutorial run. */
export type TutorialRunState = 'not-started' | 'in-progress' | 'completed' | 'skipped';

/** Hub screen values where a tutorial step may be active. Mirrors HubScreen union. */
export type TutorialHubScreen =
  | 'hub'
  | 'play'
  | 'stash'
  | 'loot'
  | 'skins'
  | 'ranks'
  | 'gear'
  | 'profile';

/** Tooltip placement relative to highlighted element or screen center. */
export type TutorialPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';

/** The surface (game state + hub screen + overlay) where a step is valid. */
export type TutorialSurface = {
  /** Required game status for the step to be active. */
  gameStatus?: GameStatus;
  /** Required hub screen for the step to be active (only meaningful when gameStatus is MENU). */
  hubScreen?: TutorialHubScreen;
  /** Required feature overlay for the step to be active (settings/upgrades/etc.). */
  overlay?: 'settings' | 'upgrades' | 'challenges' | 'replays' | null;
};

/**
 * Defines what completes a tutorial step.
 * - `manual-next`: passive step, advances via the Next button.
 * - `click-element`: interactive, advances when the highlighted element is clicked.
 * - `navigate-to-surface`: interactive, director drives navigation to the target surface.
 * - `event-trigger`: interactive, advances when a EventBus event fires (optionally N times).
 * - `reach-level`: interactive, advances when the player reaches a given level.
 * - `move-distance`: interactive, advances when total moved distance reaches a threshold.
 */
export type TutorialAction =
  | { type: 'manual-next' }
  | { type: 'click-element'; selector: string }
  | { type: 'navigate-to-surface'; surface: TutorialSurface }
  | { type: 'event-trigger'; event: GameEvent; count?: number }
  | { type: 'reach-level'; level: number }
  | { type: 'move-distance'; distance: number };

/** Single tutorial step definition. */
export type TutorialStep = {
  /** Unique step identifier. */
  id: string;
  /** Phase the step belongs to. */
  phase: TutorialPhase;
  /** i18n key for step title. */
  titleKey: string;
  /** i18n key for step description. */
  descriptionKey: string;
  /** i18n key for the "do X to continue" prompt (interactive steps only). */
  actionKey?: string;
  /** Optional CSS selector to highlight an element. */
  highlightSelector?: string;
  /** Tooltip position relative to highlighted element or screen. */
  position: TutorialPosition;
  /** What completes the step. */
  action: TutorialAction;
  /** Surface where the step is valid (overlay renders + director waits here). */
  surface: TutorialSurface;
  /** Icon to display (emoji or icon name). */
  icon?: string;
  /** Whether to show on mobile only, desktop only, or both. */
  platform?: 'mobile' | 'desktop' | 'all';
};
