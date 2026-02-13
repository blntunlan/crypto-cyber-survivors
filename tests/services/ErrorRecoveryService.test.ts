import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorRecoveryService } from '../../services/core/ErrorRecoveryService';
import { EventBus } from '../../services/core/EventBus';
import { GameStateMachine } from '../../services/core/GameStateMachine';
import { GameStatus } from '../../types';
import { Logger } from '../../services/system/Logger';

const { flushAllMock } = vi.hoisted(() => ({
  flushAllMock: vi.fn(async () => ({
    batches: 0,
    acked: 0,
    retried: 0,
    remaining: 0,
  })),
}));

// Mocks
vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('../../services/market/sync', () => ({
  getMarketSyncQueue: () => ({
    flushAll: flushAllMock,
  }),
}));

vi.mock('../../services/core/GameStateMachine', () => ({
  GameStateMachine: {
    getState: vi.fn(),
    transition: vi.fn(),
  },
}));

vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ErrorRecoveryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    flushAllMock.mockResolvedValue({
      batches: 0,
      acked: 0,
      retried: 0,
      remaining: 0,
    });

    // Reset singleton instance (hacky but necessary since we can't easily reset private static)
    // In a real app we might expose a reset method for tests
    // For now we assume the service is stateless enough or we re-instantiate via a test helper if needed.
    // However, since it's a singleton created at module load, we can't re-create it easily.
    // We will rely on spying on its methods or ensuring side effects are cleared.

    // Reset internal strategies map if possible, but it's private.
    // We will simulate fresh scenarios.

    // Spy on window listeners
    vi.spyOn(window, 'addEventListener').mockImplementation((_event, _handler) => {
      // Logic for capturing handlers removed as they are unused in this test suite
    });

    // Capture EventBus listener
    (EventBus.on as any).mockImplementation((_event: string, _handler: any) => {
      // Logic for capturing handlers removed as they are unused in this test suite
    });

    // Force re-initialization listeners (since it's a singleton, constructor runs once)
    // We can call setupListeners if we cast to any, but it's private.
    // Better to invoke the callbacks directly that we captured via the spies.
    // Since the singleton is already instantiated when the file loads, we need to inspect what listeners were added.
    // NOTE: The singleton pattern makes it hard to "re-run" the constructor.
    // We will simulate the events triggering the handlers.
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Market Failure Handling', () => {
    it('should pause game and attempt reconnect on market data timeout', async () => {
      // Setup
      (GameStateMachine.getState as any).mockReturnValue(GameStatus.PLAYING);

      // Simulate timeout event (we need to trigger the logic manually or via the captured callback)
      // Since we can't capture the callback registered in the *original* constructor run (before tests started),
      // we might need to expose a public method or use a cheat to re-init.
      // Alternatively, assuming `ErrorRecoveryService` exports the instance, we can verify side effects.
      // But `EventBus.on` was called at module level.

      // Workaround: We will invoke the private `handleMarketFailure` via `any` casting
      // OR we can rely on the fact that `EventBus.on` is a mock, but it was called during import.
      // Let's reload the module to ensure fresh mocks are used for the constructor.
      // But standard `import` caches.

      // Plan B: Call the private method directly for unit testing logic.
      await (ErrorRecoveryService as any).handleMarketFailure();

      // Verify Pause
      expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.PAUSED);

      // Verify Notification
      expect(EventBus.emit).toHaveBeenCalledWith(
        'gameNotification',
        expect.objectContaining({
          title: 'Network Lag',
          type: 'warning',
        })
      );

      // Verify Reconnect Request emitted immediately?
      // The `attemptReconnect` has a strategy. First try usually has 0 delay or logic.
      // The implementation sets retryDelay = 2000 for the strategy default.

      // Fast-forward timers to trigger the first retry action
      await vi.advanceTimersByTimeAsync(2000);

      expect(EventBus.emit).toHaveBeenCalledWith('marketReconnectRequest', {});
    });

    it('should not pause game if already in menu', async () => {
      (GameStateMachine.getState as any).mockReturnValue(GameStatus.MENU);

      await (ErrorRecoveryService as any).handleMarketFailure();

      expect(GameStateMachine.transition).not.toHaveBeenCalled();
    });
  });

  describe('Offline/Online Handling', () => {
    it('should handle offline event', () => {
      // We assume handleOffline is called. Since we can't easily trigger the real window event
      // to hit the exact listener instance (captured in module scope), we test the method logic.
      (ErrorRecoveryService as any).handleOffline();

      expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('offline'));
      expect(EventBus.emit).toHaveBeenCalledWith(
        'gameNotification',
        expect.objectContaining({
          title: 'Offline',
          type: 'error',
        })
      );
    });

    it('should handle online event and trigger market reconnect', () => {
      // Mock handleMarketFailure to verify it's called
      const handleMarketSpy = vi.spyOn(
        ErrorRecoveryService as any,
        'handleMarketFailure'
      );

      (ErrorRecoveryService as any).handleOnline();

      expect(Logger.info).toHaveBeenCalledWith(expect.stringContaining('back online'));
      expect(EventBus.emit).toHaveBeenCalledWith(
        'gameNotification',
        expect.objectContaining({
          title: 'Online',
          type: 'success',
        })
      );
      expect(handleMarketSpy).toHaveBeenCalled();
      expect(flushAllMock).toHaveBeenCalled();
    });
  });

  describe('Backoff Strategy', () => {
    it('should retry with exponential backoff on failure', async () => {
      // Manually trigger attemptReconnect with a failing action
      const mockAction = vi.fn().mockResolvedValue(false);
      const service = ErrorRecoveryService as any;

      // Reset strategies map for this test ID
      service.strategies.delete('test_service');

      // Start
      service.attemptReconnect('test_service', mockAction);

      // Initial call puts it in the queue for delay
      // Strategy: attempt 1 (currentRetries becomes 1) -> delay = 2000 * 1.5^0 = 2000

      // Advance 2000ms
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockAction).toHaveBeenCalledTimes(1);

      // Attempt 2 (failed) -> delay = 2000 * 1.5^1 = 3000
      await vi.advanceTimersByTimeAsync(3000);
      expect(mockAction).toHaveBeenCalledTimes(2);

      // Attempt 3 (failed) -> delay = 2000 * 1.5^2 = 4500
      await vi.advanceTimersByTimeAsync(4500);
      expect(mockAction).toHaveBeenCalledTimes(3);
    });

    it('should stop after max retries', async () => {
      const mockAction = vi.fn().mockResolvedValue(false);
      const service = ErrorRecoveryService as any;
      service.strategies.delete('test_service_max');

      // Start
      service.attemptReconnect('test_service_max', mockAction);

      // Retry 1 (2000)
      await vi.advanceTimersByTimeAsync(2000);
      // Retry 2 (3000)
      await vi.advanceTimersByTimeAsync(3000);
      // Retry 3 (4500)
      await vi.advanceTimersByTimeAsync(4500);
      // Retry 4 (6750)
      await vi.advanceTimersByTimeAsync(6750);
      // Retry 5 (10125)
      await vi.advanceTimersByTimeAsync(10125);

      expect(mockAction).toHaveBeenCalledTimes(5);

      // Next attempt should fail max retries check and log error
      // The implementation calls attemptReconnect recursively *after* the action fails.
      // So the "check" happens at the start of the *next* call.
      // We need to wait for the next scheduled loop? No, the check is synchronous.
      // Let's verify subsequent call logic.
      // Actually, let's just trigger one more time manually to hit the limit logic if needed,
      // or rely on the recursive call.

      // Wait for potential next cycle
      await vi.advanceTimersByTimeAsync(20000);

      // Should NOT be called a 6th time
      expect(mockAction).toHaveBeenCalledTimes(5);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Max retries reached')
      );
      expect(EventBus.emit).toHaveBeenCalledWith(
        'gameNotification',
        expect.objectContaining({
          title: 'Critical Error',
        })
      );
    });

    it('should reset retries on success', async () => {
      const mockAction = vi
        .fn()
        .mockResolvedValueOnce(false) // Fail 1
        .mockResolvedValueOnce(true); // Success 2

      const service = ErrorRecoveryService as any;
      service.strategies.delete('test_service_success');

      service.attemptReconnect('test_service_success', mockAction);

      // Fail 1
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockAction).toHaveBeenCalledTimes(1);

      // Success 2
      await vi.advanceTimersByTimeAsync(3000);
      expect(mockAction).toHaveBeenCalledTimes(2);

      // Should verify state reset
      const strategy = service.strategies.get('test_service_success');
      expect(strategy.currentRetries).toBe(0);
      expect(EventBus.emit).toHaveBeenCalledWith(
        'gameNotification',
        expect.objectContaining({
          title: 'Restored',
        })
      );
    });
  });
});
