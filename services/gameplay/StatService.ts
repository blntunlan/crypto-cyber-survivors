import {
  STAT_DEFINITIONS,
  type StatKey,
  type StatDefinition,
} from '../../config/StatRegistry';

/**
 * StatService - Centralized utility for player statistics
 *
 * Provides standardized formatting and calculation logic to ensure
 * 'Raw Data First' discipline across the application.
 */
export class StatService {
  /**
   * Formats a raw stat value for UI display based on its registry definition.
   *
   * @param value The raw numerical value (e.g., 0.05 for 5%)
   * @param statKey The ID of the stat in STAT_DEFINITIONS
   * @returns A formatted string (e.g., "5%", "x1.2", "400 ms")
   */
  static format(value: number, statKey: StatKey): string {
    const def = (STAT_DEFINITIONS as Record<string, StatDefinition>)[statKey];
    if (!def) return value.toString();

    const safeValue = isNaN(value) ? def.defaultValue : value;

    // 1. Percentage Formatting (0.05 -> "5%")
    if (def.isPercentage) {
      return `${Math.round(safeValue * 100)}%`;
    }

    // 2. Inverse Stat Specifics (e.g. Fire Rate / Attack Speed)
    if (statKey === 'fireRate') {
      // For fireRate, we usually want to show attacks per second (Hz)
      // 1000ms / 400ms = 2.5 A/S
      return (1000 / (safeValue || 1)).toFixed(1);
    }

    // 3. Multiplier Formatting (e.g. Area x1.5)
    if (statKey === 'area') {
      return `x${safeValue.toFixed(1)}`;
    }

    // 4. Prefix Formatting (e.g. Luck +2.0)
    if (statKey === 'luck' || statKey === 'magnet') {
      const formatted =
        statKey === 'luck' ? safeValue.toFixed(1) : Math.round(safeValue);
      return safeValue >= 0 ? `+${formatted}` : formatted.toString();
    }

    // 5. Default: Round to nearest whole number
    return Math.round(safeValue).toString();
  }

  /**
   * Sanitizes a value against registry caps and minimums.
   */
  static sanitize(value: number, statKey: StatKey): number {
    const def = (STAT_DEFINITIONS as Record<string, StatDefinition>)[statKey];
    if (!def) return value;

    let sanitized = value;

    if (def.cap !== undefined) {
      sanitized = def.isInverse
        ? Math.max(def.cap, sanitized)
        : Math.min(def.cap, sanitized);
    }

    if (def.minValue !== undefined) {
      sanitized = Math.max(def.minValue, sanitized);
    }

    return sanitized;
  }

  /**
   * Formats large numbers compactly (e.g. 1.2k, 1.5M)
   * Essential for damage numbers and high-value stats.
   */
  static formatCompact(value: number): string {
    if (!Number.isFinite(value)) return '';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 10_000) return (value / 1_000).toFixed(1) + 'k';
    return Math.floor(value).toString();
  }
}
