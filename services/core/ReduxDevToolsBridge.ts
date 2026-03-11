/**
 * ReduxDevToolsBridge - Visual Debugging for EventBus
 *
 * Connects the game's EventBus to the Redux DevTools extension.
 * Allows developers to see every event, its payload, and the timing in a
 * visual timeline without adding Redux to the production bundle.
 */

import { EventBus } from './EventBus';
import { Logger } from '../system/Logger';

import { type GameEvent, type EventDataMap } from '../../types/events';

interface ReduxDevToolsConnection {
  init: (state: unknown) => void;
  send: (action: unknown, state: unknown) => void;
}

interface WindowWithRedux {
  __REDUX_DEVTOOLS_EXTENSION__?: {
    connect: (options: unknown) => ReduxDevToolsConnection;
  };
}

type EventBusEmit = typeof EventBus.emit;

type EventBusWithDevToolsState = typeof EventBus & {
  __devToolsEmitWrapped?: boolean;
  __devToolsOriginalEmit?: EventBusEmit;
};

class ReduxDevToolsBridgeClass {
  private devTools: ReduxDevToolsConnection | null = null;
  private isConnected = false;

  constructor() {
    // Only attempt connection in development mode
    if (import.meta.env.DEV) {
      this.init();
    }
  }

  private init() {
    // Check if extension is installed
    const extension = (window as unknown as WindowWithRedux)
      .__REDUX_DEVTOOLS_EXTENSION__;
    if (!extension) {
      return;
    }

    try {
      this.devTools = extension.connect({
        name: 'Crypto Survivors - EventBus',
        features: {
          pause: true,
          lock: true,
          persist: false,
          export: true,
          import: 'custom',
          jump: false, // Time travel disabled for now as it requires state replay logic
          skip: false,
          reorder: false,
          dispatch: true,
          test: true,
        },
      });

      this.isConnected = true;
      Logger.info('[DevTools] EventBus connected to Redux DevTools');

      // Initialize with empty state
      this.devTools.init({ lastEvent: 'INITIALIZED' });

      // Listen to all events and forward to DevTools
      this.setupForwarding();
    } catch (err) {
      Logger.warn('[DevTools] Failed to connect:', err);
    }
  }

  private setupForwarding() {
    // We use a custom hook-like pattern where the EventBus notifies us of ALL emissions
    // To do this efficiently without a listener for every event type,
    // we would need a special 'internal:all' event or similar.
    // For now, we'll proxy the 'emit' method.

    const eventBus = EventBus as EventBusWithDevToolsState;

    // Guard against wrapping multiple times (e.g. after HMR reloads)
    if (eventBus.__devToolsEmitWrapped) {
      return;
    }

    eventBus.__devToolsOriginalEmit ??= eventBus.emit.bind(eventBus);
    const originalEmit = eventBus.__devToolsOriginalEmit;

    eventBus.emit = (<K extends GameEvent>(event: K, data: EventDataMap[K]) => {
      // 1. Call original logic
      originalEmit(event, data);

      // 2. Forward to DevTools
      if (this.isConnected && this.devTools) {
        this.devTools.send(
          { type: event, payload: data, timestamp: Date.now() },
          { lastEvent: event }
        );
      }
    }) as EventBusEmit;

    eventBus.__devToolsEmitWrapped = true;
  }
}

// Instantiate to start listening
export const ReduxDevToolsBridge = new ReduxDevToolsBridgeClass();
