import { describe, expect, it } from 'vitest';
import { MARKET_SCENARIOS, createMarketScenarioArtifact } from './helpers/scenarios';
import {
  BASELINE_SOURCE_REVISION,
  assertBaselineProductionSource,
  readBaselineArtifact,
  writeBaselineArtifact,
} from './helpers/baselineArtifact';

describe('market scenario golden fixture', () => {
  it('defines the six required deterministic market scenarios', () => {
    expect(MARKET_SCENARIOS.map(scenario => scenario.name)).toEqual([
      'calm',
      'trend-up',
      'trend-down',
      'volume-surge',
      'volatility-spike',
      'stale-reconnect',
    ]);
  });

  it('replays to the committed canonical market scenario artifact', () => {
    const first = createMarketScenarioArtifact();
    const second = createMarketScenarioArtifact();
    expect(first).toEqual(second);

    if (process.env.UPDATE_GOLDEN === '1') {
      assertBaselineProductionSource();
      writeBaselineArtifact('tests/golden/fixtures/market-scenarios.v1.json', {
        fixtureId: 'market-scenarios.v1',
        producer: 'market-scenarios',
        sourceRevision: BASELINE_SOURCE_REVISION,
        payload: first.payload,
      });
    }

    const committed = readBaselineArtifact<typeof first.payload>(
      'tests/golden/fixtures/market-scenarios.v1.json',
      'market-scenarios'
    );
    expect(first.contentHash).toBe(committed.contentHash);
  });

  it('preserves monotonic connected sequences and a reconnect jump', () => {
    const artifact = createMarketScenarioArtifact();

    for (const scenario of artifact.payload.scenarios) {
      const connectedFrames = scenario.frames.filter(
        frame => frame.connection === 'connected'
      );
      expect(
        connectedFrames.every((frame, index) => {
          if (index === 0) return true;
          const previous = connectedFrames[index - 1];
          return previous !== undefined && frame.sequence > previous.sequence;
        })
      ).toBe(true);
    }

    const staleReconnect = artifact.payload.scenarios.find(
      scenario => scenario.name === 'stale-reconnect'
    );
    expect(staleReconnect).toBeDefined();
    const frames = staleReconnect!.frames;
    const firstStaleIndex = frames.findIndex(frame => frame.connection === 'stale');
    expect(firstStaleIndex).toBeGreaterThan(0);

    const beforeStale = frames[firstStaleIndex - 1];
    const afterReconnect = frames
      .slice(firstStaleIndex)
      .find(frame => frame.connection === 'connected');
    expect(beforeStale).toBeDefined();
    expect(afterReconnect).toBeDefined();
    expect(afterReconnect!.sequence).toBeGreaterThan(beforeStale!.sequence);
  });
});
