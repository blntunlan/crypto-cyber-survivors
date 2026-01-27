import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MilestoneServiceClass } from '../../services/gameplay/MilestoneService';
import { EventBus } from '../../services/core/EventBus';

describe('MilestoneService', () => {
  let service: MilestoneServiceClass;

  beforeEach(() => {
    EventBus.clear();
    service = new MilestoneServiceClass();
  });

  it('should track kills and emit milestone events', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');

    // Milestone for 100 kills is 'CENTURION'
    for (let i = 0; i < 100; i++) {
      EventBus.emit('enemyKilled', { x: 0, y: 0 });
    }

    expect(emitSpy).toHaveBeenCalledWith(
      'milestoneAchieved',
      expect.objectContaining({
        id: 'kills_100',
        name: 'CENTURION',
      })
    );

    expect(service.getTotalKills()).toBe(100);
    expect(service.getAchievedMilestones()).toContain('kills_100');
    vi.restoreAllMocks();
  });

  it('should track level ups and emit milestone events', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');

    // Level 5 milestone
    EventBus.emit('levelUpComplete', { newLevel: 5 });

    expect(emitSpy).toHaveBeenCalledWith(
      'milestoneAchieved',
      expect.objectContaining({
        id: 'level_5',
      })
    );

    expect(service.getAchievedMilestones()).toContain('level_5');
    vi.restoreAllMocks();
  });

  it('should track time milestones', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');

    // 60 seconds milestone
    service.checkTimeMilestones(60);

    expect(emitSpy).toHaveBeenCalledWith(
      'milestoneAchieved',
      expect.objectContaining({
        id: 'time_60',
      })
    );

    expect(service.getAchievedMilestones()).toContain('time_60');
    vi.restoreAllMocks();
  });

  it('should not emit duplicate milestones', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');

    service.checkTimeMilestones(60);
    service.checkTimeMilestones(65);
    service.checkTimeMilestones(70);

    const calls = emitSpy.mock.calls.filter(
      call => call[0] === 'milestoneAchieved' && (call[1] as any).id === 'time_60'
    );
    expect(calls.length).toBe(1);
    vi.restoreAllMocks();
  });

  it('should reset state on gameReset', () => {
    EventBus.emit('levelUpComplete', { newLevel: 5 });
    expect(service.getAchievedMilestones().length).toBe(1);

    EventBus.emit('gameReset', {} as any);
    expect(service.getAchievedMilestones().length).toBe(0);
    expect(service.getTotalKills()).toBe(0);
  });
});
