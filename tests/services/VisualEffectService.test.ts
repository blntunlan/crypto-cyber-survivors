import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisualEffectService } from '../../services/gameplay/VisualEffectService';
import { EventBus } from '../../services/core/EventBus';

describe('VisualEffectService', () => {
  beforeEach(() => {
    EventBus.clear();
    VisualEffectService.reset();
  });

  it('should initialize and listen for volatilityShock events', () => {
    const handleShockSpy = vi.spyOn(
      VisualEffectService as any,
      'handleVolatilityShock'
    );

    // Trigger the event
    const payload = { intensity: 1.5, direction: 'up' as const, isHighLeverage: false };
    EventBus.emit('volatilityShock', payload);

    expect(handleShockSpy).toHaveBeenCalledWith(payload);
  });

  it('should calculate scaled shake intensity based on leverage', () => {
    // 1x Leverage: Intensity should be base (1.5)
    const baseIntensity = VisualEffectService.calculateLeverageScaledIntensity(1.5, 1);
    expect(baseIntensity).toBeCloseTo(1.5);

    // 100x Leverage: Intensity should be amplified
    const highLeverageIntensity = VisualEffectService.calculateLeverageScaledIntensity(
      1.5,
      100
    );
    expect(highLeverageIntensity).toBeGreaterThan(1.5);
  });
});
