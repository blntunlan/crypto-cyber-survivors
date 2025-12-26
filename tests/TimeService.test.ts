import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TimeService } from '../services/TimeService';

describe('TimeService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TimeService.reset();
    TimeService.setTimeScale(1.0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with zero game time and paused state', () => {
    expect(TimeService.getGameTime()).toBe(0);
    expect(TimeService.isClockPaused()).toBe(true);
  });

  it('should not advance time while paused', () => {
    // Call update without starting
    TimeService.update(100);
    TimeService.update(200);

    expect(TimeService.getGameTime()).toBe(0);
  });

  it('should pause and stop time advancement', () => {
    TimeService.start();
    TimeService.update(0);
    TimeService.update(100); // First update after start

    TimeService.pause();
    const timeAfterPause = TimeService.getGameTime();

    TimeService.update(200);
    TimeService.update(300);

    // Time should not have changed while paused
    expect(TimeService.getGameTime()).toBe(timeAfterPause);
  });

  it('should reset all state', () => {
    TimeService.start();
    TimeService.update(0);
    TimeService.update(100);

    TimeService.reset();

    expect(TimeService.getGameTime()).toBe(0);
    expect(TimeService.isClockPaused()).toBe(true);
    expect(TimeService.getDeltaTime()).toBe(0);
  });

  it('should return delta time correctly', () => {
    TimeService.start();
    TimeService.update(0);
    const delta = TimeService.update(50);

    expect(TimeService.getDeltaTime()).toBe(delta);
  });

  it('should allow setting time scale', () => {
    TimeService.setTimeScale(2.0);
    expect(TimeService.getTimeScale()).toBe(2.0);

    TimeService.setTimeScale(0.5);
    expect(TimeService.getTimeScale()).toBe(0.5);
  });
});
