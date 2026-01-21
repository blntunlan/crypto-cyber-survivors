/**
 * @fileoverview Tutorial Configuration
 * Defines all tutorial steps for new player onboarding
 */

/** Position types for tutorial tooltip placement */
export type TutorialPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';

/** Trigger types for advancing to next step */
export type TutorialTrigger = 'click' | 'keypress' | 'auto';

/**
 * Single tutorial step definition
 */
export interface TutorialStep {
  /** Unique step identifier */
  id: string;
  /** i18n key for step title */
  titleKey: string;
  /** i18n key for step description */
  descriptionKey: string;
  /** Optional CSS selector to highlight an element */
  highlightSelector?: string;
  /** Tooltip position relative to highlighted element or screen */
  position: TutorialPosition;
  /** Whether the step requires user interaction to proceed */
  requiresInteraction?: boolean;
  /** How to trigger advancing to next step */
  nextTrigger: TutorialTrigger;
  /** Delay in ms before auto-advancing (for 'auto' trigger) */
  delayMs?: number;
  /** Icon to display (emoji or icon name) */
  icon?: string;
  /** Whether to show on mobile only, desktop only, or both */
  platform?: 'mobile' | 'desktop' | 'all';
}

/**
 * All tutorial steps in order
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'language-selection',
    titleKey: 'tutorial.language.title',
    descriptionKey: 'tutorial.language.description',
    position: 'center',
    nextTrigger: 'click',
    icon: '🌐',
    platform: 'all',
  },
  {
    id: 'theme-selection',
    titleKey: 'tutorial.theme.title',
    descriptionKey: 'tutorial.theme.description',
    position: 'center',
    nextTrigger: 'click',
    icon: '🎨',
    platform: 'all',
  },
  {
    id: 'welcome',
    titleKey: 'tutorial.welcome.title',
    descriptionKey: 'tutorial.welcome.description',
    position: 'center',
    nextTrigger: 'click',
    icon: '₿', // Bitcoin symbol - welcome to crypto
    platform: 'all',
  },
  {
    id: 'movement',
    titleKey: 'tutorial.movement.title',
    descriptionKey: 'tutorial.movement.description',
    position: 'center',
    nextTrigger: 'click',
    icon: '◈', // Diamond/grid - movement controls
    platform: 'all',
  },
  {
    id: 'dash',
    titleKey: 'tutorial.dash.title',
    descriptionKey: 'tutorial.dash.description',
    position: 'center',
    nextTrigger: 'click',
    icon: '⚡', // Lightning - speed/dash
    platform: 'all',
  },
  {
    id: 'position',
    titleKey: 'tutorial.position.title',
    descriptionKey: 'tutorial.position.description',
    highlightSelector: '[data-tutorial="position-selector"]',
    position: 'bottom',
    nextTrigger: 'click',
    icon: '↗', // Arrow up-right - long position / bullish
    platform: 'all',
  },
  {
    id: 'leverage',
    titleKey: 'tutorial.leverage.title',
    descriptionKey: 'tutorial.leverage.description',
    highlightSelector: '[data-tutorial="leverage-selector"]',
    position: 'bottom',
    nextTrigger: 'click',
    icon: '×', // Multiplier symbol - leverage
    platform: 'all',
  },
  {
    id: 'hud',
    titleKey: 'tutorial.hud.title',
    descriptionKey: 'tutorial.hud.description',
    position: 'center',
    nextTrigger: 'click',
    icon: '◉', // Target/bullseye - HUD focus
    platform: 'all',
  },
  {
    id: 'enemies',
    titleKey: 'tutorial.enemies.title',
    descriptionKey: 'tutorial.enemies.description',
    position: 'center',
    nextTrigger: 'click',
    icon: '🐻', // Bear - market enemies
    platform: 'all',
  },
  {
    id: 'levelup',
    titleKey: 'tutorial.levelup.title',
    descriptionKey: 'tutorial.levelup.description',
    position: 'center',
    nextTrigger: 'click',
    icon: '▲', // Triangle up - level up
    platform: 'all',
  },
  {
    id: 'complete',
    titleKey: 'tutorial.complete.title',
    descriptionKey: 'tutorial.complete.description',
    position: 'center',
    nextTrigger: 'click',
    icon: '✓', // Checkmark - complete
    platform: 'all',
  },
];

/**
 * localStorage keys for tutorial state persistence
 */
export const TUTORIAL_STORAGE_KEYS = {
  COMPLETED: 'tutorial-completed',
  COMPLETED_AT: 'tutorial-completed-at',
  SKIPPED: 'tutorial-skipped',
  LAST_STEP: 'tutorial-last-step',
} as const;

/**
 * Get total number of tutorial steps
 */
export const TUTORIAL_TOTAL_STEPS = TUTORIAL_STEPS.length;

/**
 * Get step by ID
 */
export function getTutorialStepById(id: string): TutorialStep | undefined {
  return TUTORIAL_STEPS.find(step => step.id === id);
}

/**
 * Get step index by ID
 */
export function getTutorialStepIndex(id: string): number {
  return TUTORIAL_STEPS.findIndex(step => step.id === id);
}
