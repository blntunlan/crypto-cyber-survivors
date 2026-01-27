import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createMarketIndicatorService } from '../../services/indicators/MarketIndicatorService';
import { MarketPosition } from '../../types';
import { EventBus } from '../../services/core/EventBus';

describe('Market Indicator Grace Period', () => {
  let service: ReturnType<typeof createMarketIndicatorService>;

  beforeEach(() => {
    vi.useFakeTimers();
    service = createMarketIndicatorService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should suppress state change events during the 2s grace period', () => {
    const rsiHandler = vi.fn();
    const stateHandler = vi.fn();

    EventBus.on('rsiStateChanged', rsiHandler);
    EventBus.on('marketStateChanged', stateHandler);

    // Initial updates at 0s
    // Force a price move that would normally trigger RSI state change
    for (let i = 0; i < 20; i++) {
      service.update(100 + i * 10, 1000, MarketPosition.LONG);
    }

    expect(rsiHandler).not.toHaveBeenCalled();
    expect(stateHandler).not.toHaveBeenCalled();
  });

  it('should allow events after the 2s grace period', () => {
    const stateHandler = vi.fn();
    EventBus.on('marketStateChanged', stateHandler);

    // Wait for 2.1 seconds
    vi.advanceTimersByTime(2100);

    service.update(150, 1000, MarketPosition.LONG);

    expect(stateHandler).toHaveBeenCalled();
  });
});
