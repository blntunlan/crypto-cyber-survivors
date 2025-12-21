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
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}
