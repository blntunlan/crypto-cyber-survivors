import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParticleConfigService } from '../../services/system/ParticleConfigService';
import { Logger } from '../../services/system/Logger';

// Mock Logger
vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ParticleConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ParticleConfigService.reset();
  });

  it('should be initialized with default values', () => {
    const config = ParticleConfigService.current();
    expect(config.trail.life).toBe(0.25);
    expect(config.impact.count).toBe(5);
    expect(config.collect.life).toBe(1.1);
    expect(config.bullets.baseSizeMultiplier).toBe(1.0);
  });

  it('should update config groups correctly', () => {
    ParticleConfigService.update('trail', { life: 0.5, radiusMultiplier: 0.8 });

    expect(ParticleConfigService.trail.life).toBe(0.5);
    expect(ParticleConfigService.trail.radiusMultiplier).toBe(0.8);
    expect(Logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Particle Config Updated: trail'),
      expect.any(Object)
    );
  });

  it('should support Partial updates and preserve existing values', () => {
    const originalSpeed = ParticleConfigService.impact.speed;
    ParticleConfigService.update('impact', { count: 20 });

    expect(ParticleConfigService.impact.count).toBe(20);
    expect(ParticleConfigService.impact.speed).toBe(originalSpeed);
  });

  it('should return a copy via current()', () => {
    const config1 = ParticleConfigService.current();
    ParticleConfigService.update('collect', { speed: 99 });
    const config2 = ParticleConfigService.current();

    expect(config1.collect.speed).not.toBe(99);
    expect(config2.collect.speed).toBe(99);
  });

  it('should reset all values to defaults', () => {
    ParticleConfigService.update('bullets', { baseSizeMultiplier: 2.0 });
    expect(ParticleConfigService.bullets.baseSizeMultiplier).toBe(2.0);

    ParticleConfigService.reset();
    expect(ParticleConfigService.bullets.baseSizeMultiplier).toBe(1.0);
    expect(Logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Particle Config Reset')
    );
  });
});
