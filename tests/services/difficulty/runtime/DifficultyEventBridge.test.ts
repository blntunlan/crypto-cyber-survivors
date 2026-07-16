import { beforeEach, describe, expect, it } from 'vitest';
import { DifficultyEventBridge } from '../../../../services/difficulty/runtime/DifficultyEventBridge';
import { DifficultyInputInbox } from '../../../../services/difficulty/runtime/DifficultyInputInbox';
import { EventBus } from '../../../../services/core/EventBus';

describe('DifficultyEventBridge', () => {
  beforeEach(() => {
    EventBus.clear();
  });

  it('makes EventBus telemetry eligible at the next simulation tick', () => {
    const inbox = new DifficultyInputInbox();
    const bridge = new DifficultyEventBridge(inbox, () => 20);
    bridge.start();

    EventBus.emit('playerHit', { damage: 5, remainingHp: 95 });

    expect(inbox.drain(20).player.damageTaken).toBe(0);
    expect(inbox.drain(21).player.damageTaken).toBe(5);
    bridge.dispose();
  });

  it('unsubscribes every EventBus handler exactly once on dispose', () => {
    const bridge = new DifficultyEventBridge(new DifficultyInputInbox(), () => 20);
    bridge.start();

    expect(EventBus.listenerCount('playerHit')).toBe(1);
    expect(EventBus.listenerCount('canonicalMarketFrame')).toBe(1);

    bridge.dispose();
    bridge.dispose();

    expect(EventBus.listenerCount('playerHit')).toBe(0);
    expect(EventBus.listenerCount('canonicalMarketFrame')).toBe(0);
    expect(EventBus.listenerCount('difficultyRunInitialized')).toBe(0);
  });

  it('turns continue decisions into a cycle reset at the next boundary', () => {
    let tick = 1;
    const inbox = new DifficultyInputInbox();
    const bridge = new DifficultyEventBridge(inbox, () => tick);
    bridge.start();

    EventBus.emit('difficultyRunInitialized', {
      runId: 'run-bridge',
      seed: 11,
      side: 'SHORT',
      leverage: 10,
      entryPrice: 50_000,
      liquidationPrice: 55_000,
    });
    EventBus.emit('playerHit', { damage: 12, remainingHp: 88 });
    tick = 2;
    inbox.drain(tick);
    EventBus.emit('cycleDecisionMade', { decision: 'CONTINUE', cycleNumber: 2 });

    expect(inbox.drain(2).player.damageTaken).toBe(12);
    expect(inbox.drain(3).player.damageTaken).toBe(0);
    expect(inbox.drain(3).run.constants?.runId).toBe('run-bridge');
    bridge.dispose();
  });
});
