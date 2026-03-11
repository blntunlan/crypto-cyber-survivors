import { type EventBus } from '../services/core/EventBus';
import { type ComboSystem } from '../services/combat/ComboSystem';

declare global {
  interface Window {
    EventBus?: typeof EventBus;
    ComboSystem?: typeof ComboSystem;
    render_game_to_text?: () => string;
    GameHelpers?: {
      triggerLevelUp: () => void;
      triggerCycleComplete: () => void;
      triggerGameOver: () => void;
    };
  }
}
