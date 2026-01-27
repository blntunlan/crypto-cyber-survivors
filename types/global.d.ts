import { type EventBus } from '../services/core/EventBus';
import { type ComboSystem } from '../services/combat/ComboSystem';

declare global {
  interface Window {
    EventBus: typeof EventBus;
    ComboSystem: typeof ComboSystem;
  }
}
