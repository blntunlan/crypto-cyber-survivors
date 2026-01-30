import { type Card } from '../../../services/cards/CardSystem';
import { type ErrorInfo } from 'react';
import { type GameMode } from '../../../types/gameMode';

export interface LevelUpScreenProps {
  upgradeChoices: Card[];
  onSelect: (card: Card) => void;
  /** Game mode for competitive time limits */
  gameMode?: GameMode;
}

export interface SlotReelProps {
  finalCard: Card;
  reelIndex: number;
  stopOrder: number;
  onSelect: (card: Card) => void;
  onStopped: () => void;
  /** Keyboard navigation - whether this card is currently selected */
  isSelected?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}
