import { getEffectPolicy } from '../../config/EffectRegistry';
import { type GameEvent } from '../../types/events';
import { EventBus } from '../core/EventBus';
import { haptic, type HapticType } from '../system/HapticService';

export type FeedbackServiceConfig = {
  hapticsEnabled: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
};

const DEFAULT_CONFIG: FeedbackServiceConfig = {
  hapticsEnabled: true,
  isMobile: false,
  reducedMotion: false,
};

class FeedbackServiceClass {
  private unsubscribeFns: (() => void)[] = [];
  private lastHapticAt = new Map<string, number>();
  private config: FeedbackServiceConfig = { ...DEFAULT_CONFIG };

  public configure(config: Partial<FeedbackServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public start(): void {
    if (this.unsubscribeFns.length > 0) return;

    this.unsubscribeFns = [
      EventBus.on('playerHit', data => {
        const type =
          data.remainingHp <= 20 || data.damage >= 20 ? 'heavy' : 'medium';
        this.triggerHaptic('playerHit', type);
      }),
      EventBus.on('critHit', data => {
        this.triggerHaptic(
          data.isSuperCrit ? 'critHit:super' : 'critHit',
          data.isSuperCrit ? 'heavy' : 'light'
        );
      }),
      EventBus.on('enemyKilled', data => {
        if (data.type === 'whale' || data.enemyType === 'whale') {
          this.triggerHaptic('enemyKilled:whale', 'success');
        }
      }),
      EventBus.on('nearMiss', () => {
        this.triggerHaptic('nearMiss', 'light');
      }),
    ];
  }

  public stop(): void {
    this.unsubscribeFns.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFns = [];
    this.lastHapticAt.clear();
    haptic.stop();
  }

  public resetForTesting(): void {
    this.stop();
    this.config = { ...DEFAULT_CONFIG };
  }

  private triggerHaptic(key: string, type: HapticType): void {
    if (!this.config.hapticsEnabled || !this.config.isMobile) return;

    const baseEvent = key.split(':')[0];
    const cooldownMs = getEffectPolicy(baseEvent as GameEvent)?.cooldownMs ?? 120;
    const now = this.nowMs();
    const last = this.lastHapticAt.get(key) ?? Number.NEGATIVE_INFINITY;
    if (now - last < cooldownMs) return;

    this.lastHapticAt.set(key, now);
    haptic.vibrate(this.resolveHapticType(type));
  }

  private resolveHapticType(type: HapticType): HapticType {
    if (!this.config.reducedMotion) return type;

    switch (type) {
      case 'heavy':
      case 'warning':
      case 'error':
        return 'medium';
      case 'success':
      case 'medium':
        return 'light';
      default:
        return type;
    }
  }

  private nowMs(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}

export const FeedbackService = new FeedbackServiceClass();
