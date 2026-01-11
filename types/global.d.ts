import { type EventBus } from '../services/EventBus';
import { type ComboSystem } from '../services/ComboSystem';

declare global {
  interface Window {
    EventBus: typeof EventBus;
    ComboSystem: typeof ComboSystem;
  }
}
