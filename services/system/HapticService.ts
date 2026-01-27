import { Logger } from './Logger';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * HapticService - Provides haptic feedback (vibration) for the game.
 * Uses the Vibration API where supported (Android).
 * Safely defaults to no-op on unsupported platforms (iOS Web).
 */
class HapticService {
  private static instance: HapticService | null = null;
  private isSupported: boolean;

  private constructor() {
    this.isSupported =
      typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    if (!this.isSupported) {
      Logger.info(
        '[HapticService] Vibration API not supported on this device/browser (likely iOS or Desktop Safari).'
      );
    }
  }

  public static getInstance(): HapticService {
    HapticService.instance ??= new HapticService();
    return HapticService.instance;
  }

  /**
   * Triggers a vibration pattern based on the type.
   * @param type The type of haptic feedback desired
   */
  public vibrate(type: HapticType): void {
    if (!this.isSupported) return;

    try {
      // Patterns are in milliseconds [vibrate, pause, vibrate, ...]
      switch (type) {
        case 'light':
          navigator.vibrate(10); // Very short tick (UI clicks, loot pickup)
          break;
        case 'medium':
          navigator.vibrate(30); // Standard feedback (impact)
          break;
        case 'heavy':
          navigator.vibrate(70); // Strong feedback (explosion, heavy damage)
          break;
        case 'success':
          navigator.vibrate([80, 50, 80]); // Double tap (Level Up, Objective Complete)
          break;
        case 'warning':
          navigator.vibrate([200]); // Long single buzz
          break;
        case 'error':
          navigator.vibrate([50, 100, 50, 100, 50]); // Rapid triple buzz
          break;
      }
    } catch (error) {
      // Swallow errors to prevent game loops from crashing due to haptics
      Logger.warn('[HapticService] Vibration failed:', error);
    }
  }

  /**
   * Cancels any currently running vibration
   */
  public stop(): void {
    if (this.isSupported) {
      navigator.vibrate(0);
    }
  }
}

export const haptic = HapticService.getInstance();
