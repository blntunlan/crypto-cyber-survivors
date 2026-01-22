import { describe, it, expect, vi } from 'vitest';
import { StatDecorator } from '../../../../services/patterns/decorators/BaseDecorator';
import { type IPlayerStats } from '../../../../services/patterns/decorators/IPlayerStats';

// Concrete implementation for testing abstract class
class MockDecorator extends StatDecorator {
  getName() {
    return 'Mock';
  }
  getIcon() {
    return 'icon';
  }
  getDuration() {
    return 1000;
  }
  getDescription() {
    return 'desc';
  }
}

describe('StatDecorator (BaseDecorator)', () => {
  const mockBaseStats: IPlayerStats = {
    getDamage: vi.fn(() => 10),
    getSpeed: vi.fn(() => 5),
    getFireRate: vi.fn(() => 1),
    getCritChance: vi.fn(() => 0.1),
    getCritDamage: vi.fn(() => 2),
    getArmor: vi.fn(() => 3),
    getMagnet: vi.fn(() => 50),
    getProjectiles: vi.fn(() => 1),
    getArea: vi.fn(() => 100),
    getLuck: vi.fn(() => 5),
    getLifesteal: vi.fn(() => 0.05),
    getDodge: vi.fn(() => 0.1),
  };

  const decorator = new MockDecorator(mockBaseStats);

  it('should delegate all stat calls to the wrapped object by default', () => {
    expect(decorator.getDamage()).toBe(10);
    expect(decorator.getSpeed()).toBe(5);
    expect(decorator.getFireRate()).toBe(1);
    expect(decorator.getCritChance()).toBe(0.1);
    expect(decorator.getCritDamage()).toBe(2);
    expect(decorator.getArmor()).toBe(3);
    expect(decorator.getMagnet()).toBe(50);
    expect(decorator.getProjectiles()).toBe(1);
    expect(decorator.getArea()).toBe(100);
    expect(decorator.getLuck()).toBe(5);
    expect(decorator.getLifesteal()).toBe(0.05);
    expect(decorator.getDodge()).toBe(0.1);

    // Verify all base methods were called
    Object.values(mockBaseStats).forEach(fn => {
      expect(fn).toHaveBeenCalled();
    });
  });

  it('should return correct metadata from concrete implementation', () => {
    expect(decorator.getName()).toBe('Mock');
    expect(decorator.getIcon()).toBe('icon');
    expect(decorator.getDuration()).toBe(1000);
    expect(decorator.getDescription()).toBe('desc');
  });
});
