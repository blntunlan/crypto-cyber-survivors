import { type EventBus } from '../services/core/EventBus';
import { type ComboSystem } from '../services/combat/ComboSystem';

declare global {
  interface Window {
    __ALLOW_FETCH_INTERCEPTION_FOR_TESTS__?: boolean;
    EventBus: typeof EventBus;
    ComboSystem: typeof ComboSystem;
  }
}
