import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MilestoneServiceClass } from '../../services/gameplay/MilestoneService';
import { EventBus } from '../../services/core/EventBus';
import { GameStateMachine } from '../../services/core/GameStateMachine';
import { GameStatus } from '../../types';

describe('MilestoneService', () => {
  let service: MilestoneServiceClass;

  beforeEach(() => {
    EventBus.clear();
    service = new MilestoneServiceClass();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should track kills and emit milestone events', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');

    // Milestone for 100 kills is 'RAMPAGE'
    for (let i = 0; i < 100; i++) {
      EventBus.emit('enemyKilled', { x: 0, y: 0 });
    }

    expect(emitSpy).toHaveBeenCalledWith(
      'milestoneAchieved',
      expect.objectContaining({
        id: 'kills_100',
        name: 'RAMPAGE',
        nameKey: 'milestones.kills_100',
        severity: 'celebration',
        sound: 'glint',
      })
    );

    expect(service.getTotalKills()).toBe(100);
    expect(service.getAchievedMilestones()).toContain('kills_100');
  });

  it('should track level ups and emit milestone events', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');

    // Level 5 milestone
    EventBus.emit('levelUpComplete', { newLevel: 5 });

    expect(emitSpy).toHaveBeenCalledWith(
      'milestoneAchieved',
      expect.objectContaining({
        id: 'level_5',
        nameKey: 'milestones.level',
        nameParams: { val: 5 },
      })
    );

    expect(service.getAchievedMilestones()).toContain('level_5');
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
  });

  it('should reset state on gameReset', () => {
    EventBus.emit('levelUpComplete', { newLevel: 5 });
    expect(service.getAchievedMilestones().length).toBe(1);

    EventBus.emit('gameReset', {} as any);
    expect(service.getAchievedMilestones().length).toBe(0);
    expect(service.getTotalKills()).toBe(0);
  });

  describe('PnL milestones', () => {
    beforeEach(() => {
      vi.spyOn(GameStateMachine, 'getState').mockReturnValue(GameStatus.PLAYING);
    });

    it('should emit pnl milestone when raw PnL crosses threshold', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      service.checkPnLMilestones(0.05);

      expect(emitSpy).toHaveBeenCalledWith(
        'milestoneAchieved',
        expect.objectContaining({
          id: 'pnl_5',
          name: 'IN PROFIT',
          type: 'pnl',
          threshold: 0.05,
          severity: 'celebration',
          sound: 'glint',
        })
      );
      expect(service.getAchievedMilestones()).toContain('pnl_5');
    });

    it('should fire via canonicalMarketUpdate event', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      EventBus.emit('canonicalMarketUpdate', { pnlPercent: 0.1 } as any);

      const ids = emitSpy.mock.calls
        .filter(call => call[0] === 'milestoneAchieved')
        .map(call => (call[1] as any).id);
      expect(ids).toContain('pnl_5');
      expect(ids).toContain('pnl_10');
    });

    it('should not re-fire after PnL dips and recovers (once per run)', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      service.checkPnLMilestones(0.06);
      service.checkPnLMilestones(0.01);
      service.checkPnLMilestones(0.07);

      const calls = emitSpy.mock.calls.filter(
        call => call[0] === 'milestoneAchieved' && (call[1] as any).id === 'pnl_5'
      );
      expect(calls.length).toBe(1);
    });

    it('should emit danger announcement on negative PnL threshold', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      service.checkPnLMilestones(-0.12);

      expect(emitSpy).toHaveBeenCalledWith(
        'milestoneAchieved',
        expect.objectContaining({
          id: 'danger_10',
          type: 'danger',
          severity: 'danger',
          sound: 'tension',
        })
      );
      // -0.12 has not reached the -0.25 tier yet
      expect(service.getAchievedMilestones()).not.toContain('danger_25');
    });

    it('should not fire danger milestones on positive PnL', () => {
      service.checkPnLMilestones(0.3);
      expect(service.getAchievedMilestones()).not.toContain('danger_10');
      expect(service.getAchievedMilestones()).not.toContain('danger_25');
    });

    it('should ignore non-finite pnl values', () => {
      service.checkPnLMilestones(NaN);
      service.checkPnLMilestones(Infinity);
      expect(service.getAchievedMilestones()).toEqual([]);
    });

    it('should not fire outside PLAYING state', () => {
      vi.spyOn(GameStateMachine, 'getState').mockReturnValue(GameStatus.PAUSED);
      service.checkPnLMilestones(0.5);
      expect(service.getAchievedMilestones()).toEqual([]);
    });

    it('should clear pnl/danger milestones on reset', () => {
      service.checkPnLMilestones(0.05);
      service.checkPnLMilestones(-0.1);
      expect(service.getAchievedMilestones().length).toBeGreaterThan(0);

      service.reset();
      expect(service.getAchievedMilestones()).toEqual([]);
    });
  });

  describe('backward compatibility', () => {
    it('should start session without throwing', () => {
      expect(() => service.startSession()).not.toThrow();
    });

    it('should return initial empty states', () => {
      const freshService = new MilestoneServiceClass();
      expect(freshService.getTotalKills()).toBe(0);
      expect(freshService.getAchievedMilestones()).toEqual([]);
    });
  });
});
