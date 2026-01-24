/**
 * ErrorRecoveryService - Centralized Error Recovery & Resilience Logic
 *
 * Handles common failure scenarios and implements recovery strategies:
 * - WebSocket reconnections
 * - API retry logic
 * - State reconciliation after crashes
 * - User-facing error messaging coordination
 */

import { Logger } from './Logger';
import { EventBus } from './EventBus';
import { GameStateMachine } from './GameStateMachine';
import { GameStatus } from '../types';

interface RecoveryStrategy {
  name: string;
  maxRetries: number;
  currentRetries: number;
  retryDelay: number;
  action: () => Promise<boolean>;
}

class ErrorRecoveryServiceClass {
  private static instance: ErrorRecoveryServiceClass | null = null;
  private strategies: Map<string, RecoveryStrategy> = new Map();

  private constructor() {
    this.setupListeners();
  }

  static getInstance(): ErrorRecoveryServiceClass {
    return (ErrorRecoveryServiceClass.instance ??= new ErrorRecoveryServiceClass());
  }

  /**
   * Initialize and setup event listeners for automatic recovery
   */
  private setupListeners(): void {
    // Listen for market data timeouts
    EventBus.on('marketDataTimeout', () => {
      this.handleMarketFailure();
    });

    // Listen for connection drops
    window.addEventListener('offline', () => {
      this.handleOffline();
    });

    window.addEventListener('online', () => {
      this.handleOnline();
    });
  }

  /**
   * Handle market feed failure
   */
  private handleMarketFailure(): void {
    Logger.error('[Recovery] Market data feed interrupted');

    // Pause game if playing to prevent unfair liquidation
    if (GameStateMachine.getState() === GameStatus.PLAYING) {
      GameStateMachine.transition(GameStatus.PAUSED);

      if (import.meta.env.DEV) {
        EventBus.emit('gameNotification', {
          title: 'Network Lag',
          message: 'Market connection lost. Game paused for security.',
          type: 'warning',
        });
      }
    }

    void this.attemptReconnect('market_service', async () => {
      try {
        // Emit a request for any active MarketService to reconnect
        // hooks or services listening to this will trigger their own reconnection logic
        EventBus.emit('marketReconnectRequest', {});
        return true;
      } catch (err) {
        Logger.debug('[Recovery] Reconnect attempt failed', err);
        return false;
      }
    });
  }

  /**
   * Generic retry-with-backoff mechanism
   */
  private async attemptReconnect(
    id: string,
    action: () => Promise<boolean>
  ): Promise<void> {
    const strategy = this.strategies.get(id) ?? {
      // Used nullish coalescing
      name: id,
      maxRetries: 5,
      currentRetries: 0,
      retryDelay: 2000,
      action,
    };

    if (strategy.currentRetries >= strategy.maxRetries) {
      Logger.error(
        `[Recovery] Max retries reached for ${id}. Manual intervention required.`
      );
      if (import.meta.env.DEV) {
        EventBus.emit('gameNotification', {
          title: 'Critical Error',
          message: 'Connection could not be restored. Please refresh.',
          type: 'error',
        });
      }
      return;
    }

    strategy.currentRetries++;
    this.strategies.set(id, strategy);

    const delay = strategy.retryDelay * Math.pow(1.5, strategy.currentRetries - 1);
    Logger.info(
      `[Recovery] Attempting ${id} recovery (${strategy.currentRetries}/${strategy.maxRetries}) in ${delay}ms...`
    );

    setTimeout(() => {
      void (async () => {
        const success = await action();
        if (success) {
          Logger.info(`[Recovery] ${id} recovered successfully!`);
          strategy.currentRetries = 0;
          this.strategies.set(id, strategy);

          if (import.meta.env.DEV) {
            EventBus.emit('gameNotification', {
              title: 'Restored',
              message: 'Connection re-established.',
              type: 'success',
            });
          }
        } else {
          void this.attemptReconnect(id, action);
        }
      })();
    }, delay);
  }

  private handleOffline(): void {
    Logger.warn('[Recovery] Browser went offline');
    if (import.meta.env.DEV) {
      EventBus.emit('gameNotification', {
        title: 'Offline',
        message: 'You are currently offline. Some features may be disabled.',
        type: 'error',
      });
    }
  }

  private handleOnline(): void {
    Logger.info('[Recovery] Browser back online');
    if (import.meta.env.DEV) {
      EventBus.emit('gameNotification', {
        title: 'Online',
        message: 'Connection restored. Syncing data...',
        type: 'success',
      });
    }

    // Trigger reconnections
    this.handleMarketFailure();
  }

  /**
   * Report a non-critical logic error that might need recovery
   */
  reportError(context: string, error: unknown): void {
    Logger.error(`[Recovery] Error in ${context}:`, error);
    // Future: send to Supabase error_logs
  }
}

export const ErrorRecoveryService = ErrorRecoveryServiceClass.getInstance();
