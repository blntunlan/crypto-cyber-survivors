import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../services/core/EventBus';
import { FeedbackService } from '../../../services/gameplay/FeedbackService';
import { haptic } from '../../../services/system/HapticService';
import { TimeService } from '../../../services/core/TimeService';

vi.mock('../../../services/system/HapticService', () => ({
  haptic: {
    vibrate: vi.fn(),
    stop: vi.fn(),
  },
}));

describe('FeedbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    EventBus.clearEvent('playerHit');
    EventBus.clearEvent('critHit');
    EventBus.clearEvent('enemyKilled');
    EventBus.clearEvent('nearMiss');
    TimeService.reset();
    TimeService.setGameTime(0);
    FeedbackService.resetForTesting();
    FeedbackService.configure({
      hapticsEnabled: true,
      isMobile: true,
      reducedMotion: false,
    });
  });

  afterEach(() => {
    TimeService.reset();
    vi.useRealTimers();
  });

  it('does not trigger haptics when mobile feedback is disabled', () => {
    FeedbackService.configure({ hapticsEnabled: false });
    FeedbackService.start();

    EventBus.emit('playerHit', { damage: 10, remainingHp: 90 });

    expect(haptic.vibrate).not.toHaveBeenCalled();
  });

  it('does not trigger haptics on non-mobile devices', () => {
    FeedbackService.configure({ isMobile: false });
    FeedbackService.start();

    EventBus.emit('playerHit', { damage: 10, remainingHp: 90 });

    expect(haptic.vibrate).not.toHaveBeenCalled();
  });

  it('triggers medium haptic for normal player hits', () => {
    FeedbackService.start();

    EventBus.emit('playerHit', { damage: 10, remainingHp: 90 });

    expect(haptic.vibrate).toHaveBeenCalledWith('medium');
  });

  it('throttles repeated player hit haptics', () => {
    FeedbackService.start();

    EventBus.emit('playerHit', { damage: 10, remainingHp: 90 });
    EventBus.emit('playerHit', { damage: 10, remainingHp: 80 });

    expect(haptic.vibrate).toHaveBeenCalledTimes(1);
  });

  it('uses game time for haptic cooldowns', () => {
    vi.useFakeTimers();
    FeedbackService.start();

    EventBus.emit('playerHit', { damage: 10, remainingHp: 90 });
    vi.advanceTimersByTime(1_000);
    EventBus.emit('playerHit', { damage: 10, remainingHp: 80 });
    expect(haptic.vibrate).toHaveBeenCalledTimes(1);

    TimeService.setGameTime(1_000);
    EventBus.emit('playerHit', { damage: 10, remainingHp: 70 });
    expect(haptic.vibrate).toHaveBeenCalledTimes(2);
  });

  it('scales heavy haptics down when reduced motion is enabled', () => {
    FeedbackService.configure({ reducedMotion: true });
    FeedbackService.start();

    EventBus.emit('playerHit', { damage: 25, remainingHp: 50 });

    expect(haptic.vibrate).toHaveBeenCalledWith('medium');
  });

  it('triggers light haptic for crit hits', () => {
    FeedbackService.start();

    EventBus.emit('critHit', {
      damage: 50,
      isSuperCrit: false,
      x: 100,
      y: 100,
    });

    expect(haptic.vibrate).toHaveBeenCalledWith('light');
  });

  it('triggers success haptic for whale kills', () => {
    FeedbackService.start();

    EventBus.emit('enemyKilled', {
      x: 100,
      y: 100,
      type: 'whale',
    });

    expect(haptic.vibrate).toHaveBeenCalledWith('success');
  });

  it('stops haptics and unsubscribes from events', () => {
    FeedbackService.start();
    FeedbackService.stop();

    EventBus.emit('nearMiss', { enemyType: 'bear' });

    expect(haptic.stop).toHaveBeenCalled();
    expect(haptic.vibrate).not.toHaveBeenCalled();
  });
});
