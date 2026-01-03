import { describe, it, expect } from 'vitest';
import { StatService } from '../../services/StatService';

describe('StatService', () => {
  describe('format()', () => {
    describe('Percentage Stats', () => {
      it('should format critChance as percentage (0.05 -> 5%)', () => {
        expect(StatService.format(0.05, 'critChance')).toBe('5%');
      });

      it('should format dodge as percentage (0.25 -> 25%)', () => {
        expect(StatService.format(0.25, 'dodge')).toBe('25%');
      });

      it('should format lifesteal as percentage (0.1 -> 10%)', () => {
        expect(StatService.format(0.1, 'lifesteal')).toBe('10%');
      });

      it('should handle 0% correctly', () => {
        expect(StatService.format(0, 'critChance')).toBe('0%');
      });

      it('should handle 100% correctly', () => {
        expect(StatService.format(1, 'critChance')).toBe('100%');
      });
    });

    describe('Fire Rate (Inverse Stat)', () => {
      it('should format fireRate as attacks per second', () => {
        // 400ms = 2.5 attacks/sec
        expect(StatService.format(400, 'fireRate')).toBe('2.5');
      });

      it('should format fast fireRate correctly', () => {
        // 200ms = 5 attacks/sec
        expect(StatService.format(200, 'fireRate')).toBe('5.0');
      });

      it('should format slow fireRate correctly', () => {
        // 1000ms = 1 attack/sec
        expect(StatService.format(1000, 'fireRate')).toBe('1.0');
      });
    });

    describe('Multiplier Stats (Area)', () => {
      it('should format area as multiplier (1.0 -> x1.0)', () => {
        expect(StatService.format(1.0, 'area')).toBe('x1.0');
      });

      it('should format area with decimal (1.5 -> x1.5)', () => {
        expect(StatService.format(1.5, 'area')).toBe('x1.5');
      });
    });

    describe('Prefix Stats (Luck, Magnet)', () => {
      it('should format luck with + prefix (2.0 -> +2.0)', () => {
        expect(StatService.format(2.0, 'luck')).toBe('+2.0');
      });

      it('should format magnet with + prefix (50 -> +50)', () => {
        expect(StatService.format(50, 'magnet')).toBe('+50');
      });

      it('should format zero luck correctly', () => {
        expect(StatService.format(0, 'luck')).toBe('+0.0');
      });
    });

    describe('Simple Numeric Stats', () => {
      it('should format baseDamage as integer', () => {
        expect(StatService.format(25, 'baseDamage')).toBe('25');
      });

      it('should format speed as integer', () => {
        expect(StatService.format(5, 'speed')).toBe('5');
      });

      it('should format armor as integer', () => {
        expect(StatService.format(3, 'armor')).toBe('3');
      });

      it('should round fractional values', () => {
        expect(StatService.format(25.7, 'baseDamage')).toBe('26');
      });
    });

    describe('Edge Cases', () => {
      it('should handle NaN by returning defaultValue', () => {
        expect(StatService.format(NaN, 'critChance')).toBe('5%');
      });

      it('should handle unknown stat key by returning raw value', () => {
        expect(StatService.format(42, 'unknownStat' as any)).toBe('42');
      });
    });
  });

  describe('sanitize()', () => {
    describe('Cap Enforcement', () => {
      it('should cap critChance at 0.95', () => {
        expect(StatService.sanitize(1.5, 'critChance')).toBe(0.95);
      });

      it('should not modify values below cap', () => {
        expect(StatService.sanitize(0.5, 'critChance')).toBe(0.5);
      });

      it('should cap armor at 15', () => {
        expect(StatService.sanitize(20, 'armor')).toBe(15);
      });

      it('should cap area at 3.0', () => {
        expect(StatService.sanitize(5.0, 'area')).toBe(3.0);
      });
    });

    describe('Inverse Stat Caps', () => {
      it('should cap fireRate at minimum 50ms (fastest)', () => {
        // For inverse stats, cap means minimum
        expect(StatService.sanitize(30, 'fireRate')).toBe(50);
      });

      it('should not modify fireRate above cap', () => {
        expect(StatService.sanitize(200, 'fireRate')).toBe(200);
      });
    });

    describe('Min Value Enforcement', () => {
      it('should enforce minValue for hp', () => {
        expect(StatService.sanitize(0, 'hp')).toBe(1);
      });

      it('should enforce minValue for maxHp', () => {
        expect(StatService.sanitize(5, 'maxHp')).toBe(10);
      });
    });

    describe('Edge Cases', () => {
      it('should return value unchanged for unknown stat key', () => {
        expect(StatService.sanitize(42, 'unknownStat' as any)).toBe(42);
      });

      it('should handle negative values', () => {
        expect(StatService.sanitize(-5, 'hp')).toBe(1); // minValue enforced
      });
    });
  });

  describe('formatCompact()', () => {
    it('should format millions correctly', () => {
      expect(StatService.formatCompact(1500000)).toBe('1.5M');
    });

    it('should format thousands correctly', () => {
      expect(StatService.formatCompact(15000)).toBe('15.0k');
    });

    it('should format regular numbers correctly', () => {
      expect(StatService.formatCompact(999)).toBe('999');
    });

    it('should floor decimal values', () => {
      expect(StatService.formatCompact(123.7)).toBe('123');
    });

    it('should handle edge case at 10k boundary', () => {
      expect(StatService.formatCompact(10000)).toBe('10.0k');
    });

    it('should handle edge case at 1M boundary', () => {
      expect(StatService.formatCompact(1000000)).toBe('1.0M');
    });

    it('should return empty string for Infinity', () => {
      expect(StatService.formatCompact(Infinity)).toBe('');
    });

    it('should return empty string for NaN', () => {
      expect(StatService.formatCompact(NaN)).toBe('');
    });

    it('should handle zero', () => {
      expect(StatService.formatCompact(0)).toBe('0');
    });
  });
});
