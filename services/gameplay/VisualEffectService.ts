import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';

export interface VolatilityShockPayload {
  intensity: number;
  direction: 'up' | 'down' | 'none';
  isHighLeverage: boolean;
}

/**
 * VisualEffectService - Manages high-impact visual effects triggered by game events.
 * Adheres to the Cyber-Finance aesthetic.
 */
export class VisualEffectServiceClass {
  private static instance: VisualEffectServiceClass | null = null;
  private currentShockIntensity: number = 0;
  private shockTimer: number = 0;

  private constructor() {
    this.init();
  }

  static getInstance(): VisualEffectServiceClass {
    return (VisualEffectServiceClass.instance ??= new VisualEffectServiceClass());
  }

  private init(): void {
    EventBus.on('volatilityShock', (payload: VolatilityShockPayload) => {
      this.handleVolatilityShock(payload);
    });

    EventBus.on('gameReset', () => this.reset());
  }

  private handleVolatilityShock(payload: VolatilityShockPayload): void {
    Logger.debug(
      `[VisualEffectService] Shock event received: intensity=${payload.intensity}`
    );

    this.currentShockIntensity = payload.intensity;
    this.shockTimer = 1000; // Duration in ms (1 second default)
  }

  /**
   * Updates visual effect timers and decays intensities.
   * @param deltaMs Elapsed time in milliseconds.
   */
  public update(deltaMs: number): void {
    if (this.shockTimer > 0) {
      this.shockTimer -= deltaMs;

      if (this.shockTimer <= 0) {
        this.currentShockIntensity = 0;
      }
    }
  }

  public getIntensity(): number {
    return this.currentShockIntensity;
  }

  /**
   * Calculates scaled intensity based on leverage.
   * Power-law scaling: 1 + log10(L) * 0.5
   */
  public calculateLeverageScaledIntensity(
    baseIntensity: number,
    leverage: number
  ): number {
    const leverageImpact = 1 + Math.log10(leverage) * 0.5;
    return baseIntensity * leverageImpact;
  }

  public reset(): void {
    this.currentShockIntensity = 0;
    this.shockTimer = 0;
  }

  /**
   * For testing purposes only.
   */
  static resetForTesting(): void {
    this.instance = null;
  }
}

export const VisualEffectService = VisualEffectServiceClass.getInstance();
