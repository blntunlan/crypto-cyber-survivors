import { type EventBus } from '../services/EventBus';

declare global {
  interface Window {
    EventBus: typeof EventBus;
  }
}
