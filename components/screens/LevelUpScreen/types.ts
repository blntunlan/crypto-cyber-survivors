import { type Card } from '../../../services/CardSystem';
import { type ErrorInfo } from 'react';

export interface LevelUpScreenProps {
  upgradeChoices: Card[];
  onSelect: (card: Card) => void;
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
