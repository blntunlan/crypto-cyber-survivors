import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisualEffectServiceClass } from '../../services/gameplay/VisualEffectService';
import { EventBus } from '../../services/core/EventBus';

describe('VisualEffectService', () => {
  let service: any;

  beforeEach(() => {
    EventBus.clear();
    VisualEffectServiceClass.resetForTesting();
    service = VisualEffectServiceClass.getInstance();
  });

  it('should initialize and listen for volatilityShock events', () => {
    const handleShockSpy = vi.spyOn(service, 'handleVolatilityShock' as any);

    // Trigger the event
    const payload = { intensity: 1.5, direction: 'up' as const, isHighLeverage: false };
    EventBus.emit('volatilityShock', payload);

    expect(handleShockSpy).toHaveBeenCalledWith(payload);
  });

  it('should calculate scaled shake intensity based on leverage', () => {
    // 1x Leverage: Intensity should be base (1.5)
    const baseIntensity = service.calculateLeverageScaledIntensity(1.5, 1);
    expect(baseIntensity).toBeCloseTo(1.5);

    // 100x Leverage: Intensity should be amplified
    // 1 + log10(100) * 0.5 = 1 + 2 * 0.5 = 2.0
    // 1.5 * 2.0 = 3.0
    const highLeverageIntensity = service.calculateLeverageScaledIntensity(1.5, 100);
    expect(highLeverageIntensity).toBeCloseTo(3.0);
  });

  it('should maintain the latest shock intensity', () => {
    EventBus.emit('volatilityShock', {
      intensity: 2.0,
      direction: 'up',
      isHighLeverage: true,
    });

    expect(service.getIntensity()).toBe(2.0);
  });
});
