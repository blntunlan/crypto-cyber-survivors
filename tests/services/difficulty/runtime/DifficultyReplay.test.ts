import { describe, expect, it } from 'vitest';

import { DifficultyInputInbox } from '../../../../services/difficulty/runtime/DifficultyInputInbox';
import { DifficultyRuntimeOrchestrator } from '../../../../services/difficulty/runtime/DifficultyRuntimeOrchestrator';

type ReplayEvent = 'hit' | 'kill' | 'dash';

const runReplay = (events: readonly ReplayEvent[], frameSeconds: number): string[] => {
  const inbox = new DifficultyInputInbox();
  const runtime = new DifficultyRuntimeOrchestrator();
  inbox.initializeRun(
    {
      runId: 'replay-run',
      seed: 99,
      side: 'LONG',
      leverage: 2,
      entryPrice: 100,
      liquidationPrice: 50,
    },
    0
  );
  inbox.recordWorldPressure(
    { activeEnemies: 12, maximumEnemies: 60, activeEncounters: 0 },
    0
  );

  let elapsedSeconds = 0;
  let recordedEvents = false;
  let frame = 0;
  const decisionIds: string[] = [];
  while (elapsedSeconds < 1) {
    elapsedSeconds += frameSeconds;
    frame += 1;
    if (!recordedEvents && elapsedSeconds >= 0.5) {
      for (const event of events) {
        if (event === 'hit') {
          inbox.recordPlayerHit({ damage: 10, remainingHp: 90 }, frame);
        }
        if (event === 'kill') {
          inbox.recordEnemyKilled(frame);
        }
        if (event === 'dash') {
          inbox.recordDash({ duration: 0.2, cooldown: 1, isDoubleDash: false }, frame);
        }
      }
      recordedEvents = true;
    }

    const result = runtime.commitIfNeeded(inbox.drain(frame), frame, elapsedSeconds);
    if (result.committed) decisionIds.push(result.snapshot.meta.decisionId);
  }
  return decisionIds;
};

describe('difficulty replay', () => {
  it('is invariant to same-tick event order and 30/60/120 FPS clocks', () => {
    const events = ['hit', 'kill', 'dash'] as const;
    const permuted = ['dash', 'hit', 'kill'] as const;
    const expected = runReplay(events, 1 / 60);

    expect(runReplay(permuted, 1 / 60)).toEqual(expected);
    expect(runReplay(events, 1 / 30)).toEqual(expected);
    expect(runReplay(events, 1 / 120)).toEqual(expected);
  });
});
