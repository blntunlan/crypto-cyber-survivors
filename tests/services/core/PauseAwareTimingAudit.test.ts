/**
 * Pause-Aware Timing Audit
 *
 * P0 Beta Checklist Item:
 *   "Pause-aware timing audit yap: gameplay timer'ları native setTimeout
 *    yerine TimeService veya pause-aware lifecycle kullanmalı."
 *
 * This test suite audits services for correct use of pause-aware timing:
 *   - TimeService must freeze game time when paused
 *   - Services that use native setTimeout should only be for non-gameplay
 *     operations (networking, retries, UI transitions)
 *   - Gameplay-critical timers must use TimeService or be pause-aware
 *
 * Architecture:
 *   - TimeService.update() drives all game time progression
 *   - When isPaused = true, update() returns deltaTime = 0
 *   - All gameplay-linked timers must observe this freeze
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, sep } from 'path';
import { EventBus } from '../../../services/core/EventBus';
import type * as TimeServiceModule from '../../../services/core/TimeService';

// ── TimeService Pause Behavior Tests ────────────────────────────────────

describe('TimeService pause behavior', () => {
  let TimeService: typeof TimeServiceModule.TimeService;
  let TimeServiceClass: typeof TimeServiceModule;

  beforeEach(async () => {
    const mod = await import('../../../services/core/TimeService');
    TimeServiceClass = mod;
    // Reset before each test
    mod.TimeService.reset();
    TimeService = mod.TimeService;
  });

  afterEach(() => {
    TimeServiceClass.TimeService.reset();
  });

  it('returns delta 0 when paused', () => {
    TimeService.start();
    TimeService.update(1000);
    const delta1 = TimeService.update(1016.67); // ~60fps frame
    expect(delta1).toBeGreaterThan(0);

    TimeService.pause();
    const delta2 = TimeService.update(1033.33);
    expect(delta2).toBe(0);
  });

  it('does not advance game time when paused', () => {
    TimeService.start();
    TimeService.update(1000);
    TimeService.update(1100);
    const gameTimeBefore = TimeService.getGameTime();

    TimeService.pause();
    TimeService.update(2000); // 900ms pass while paused
    const gameTimeAfter = TimeService.getGameTime();

    expect(gameTimeAfter).toBe(gameTimeBefore);
  });

  it('resumes time correctly after unpause without jump', () => {
    TimeService.start();
    TimeService.update(1000);
    TimeService.update(1100);

    TimeService.pause();
    TimeService.update(5000); // 3.9s paused
    TimeService.update(10000); // still paused

    TimeService.start(); // resume
    const delta = TimeService.update(10016.67);

    // Delta should be capped, not a huge jump
    expect(delta).toBeLessThanOrEqual(50); // maxDelta default is 50ms
  });

  it('caps delta time to prevent huge jumps after tab return', () => {
    TimeService.start();
    TimeService.update(1000);

    // Simulate 5 second tab-away
    const delta = TimeService.update(6000);
    expect(delta).toBeLessThanOrEqual(50); // default max delta = 50ms
  });

  it('emits secondElapsed events only when game time advances', () => {
    const spy = vi.fn();
    const unsub = EventBus.on('secondElapsed', spy);

    TimeService.start();
    // Advance 1.5 seconds of game time
    let t = 0;
    for (let i = 0; i < 100; i++) {
      t += 16.67;
      TimeService.update(t);
    }
    const countBefore = spy.mock.calls.length;

    // Pause and advance real time — no new second events should fire
    TimeService.pause();
    for (let i = 0; i < 100; i++) {
      t += 16.67;
      TimeService.update(t);
    }
    expect(spy.mock.calls.length).toBe(countBefore);

    unsub();
  });

  it('reset() sets isPaused to true', () => {
    TimeService.start();
    expect(TimeService.isClockPaused()).toBe(false);

    TimeService.reset();
    expect(TimeService.isClockPaused()).toBe(true);
  });
});

// ── Static Analysis: setTimeout Usage Audit ────────────────────────────

describe('setTimeout usage audit (static)', () => {
  const SERVICES_DIR = join(__dirname, '..', '..', '..', 'services');

  /**
   * Services that are ALLOWED to use native setTimeout because they handle
   * non-gameplay operations (networking, retries, UI, etc.)
   *
   * Keys use forward slashes (normalized) for cross-platform consistency.
   */
  const ALLOWED_NATIVE_TIMEOUT: Record<string, string> = {
    'api/RailwayClient.ts': 'Network retry delay',
    'market/SSEMarketService.ts': 'EventSource reconnect delay + connection timeout',
    'market/sync/MarketSyncQueue.ts': 'Queue processing delay (networking)',
    'market/MarketService.ts': 'Pause grace timer + connection timeout',
    'market/DataResilienceService.ts': 'Reconnect backoff timer',
    'core/metrics/MetricsStorage.ts': 'Batch flush delay (analytics)',
    'core/ErrorRecoveryService.ts': 'Recovery retry delay',
    'system/DeviceBenchmarkService.ts': 'Benchmark frame delay',
    'system/CheatManager.ts': 'Dev-only debug UI notification timeout',
    'verification/VerificationQueue.ts': 'Queue processing delay (networking)',
    'auth/UserPersistenceService.ts': 'Race condition safety delay',
    'audio/MarketAudioReactor.ts': 'Audio transition cooldown',
  };

  /**
   * Services allowed to use setInterval for non-gameplay monitoring.
   */
  const ALLOWED_NATIVE_INTERVAL: Record<string, string> = {
    'market/SSEMarketService.ts': 'Data gap monitoring (runs regardless of pause)',
    'market/MarketService.ts': 'Connection health monitoring',
    'market/sync/MarketSyncQueue.ts': 'Queue processing interval (networking)',
    'analytics/ErrorTracker.ts': 'Error flush interval (analytics)',
    'analytics/PlayerTracker.ts': 'Player tracking interval (analytics)',
    'audio/MarketAudioReactor.ts': 'Audio monitoring interval',
    'core/EventRecorderService.ts': 'Event recording flush interval',
    'system/AntiCheatService.ts': 'Anti-cheat periodic check (system-level)',
  };

  function collectTsFiles(dir: string): string[] {
    const results: string[] = [];

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...collectTsFiles(fullPath));
        } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
          results.push(fullPath);
        }
      }
    } catch {
      // Directory might not exist in test env
    }

    return results;
  }

  /** Normalize path to forward slashes for cross-platform allowlist matching */
  function getRelativePath(filePath: string): string {
    const raw = filePath
      .replace(SERVICES_DIR + sep, '')
      .replace(SERVICES_DIR + '/', '');
    return raw.replace(/\\/g, '/');
  }

  it('all setTimeout usage in services/ is accounted for', () => {
    const files = collectTsFiles(SERVICES_DIR);
    const unaccounted: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const relativePath = getRelativePath(file);

      // Check if file uses setTimeout
      if (content.includes('setTimeout(') || content.includes('setTimeout (')) {
        if (!ALLOWED_NATIVE_TIMEOUT[relativePath]) {
          unaccounted.push(relativePath);
        }
      }
    }

    if (unaccounted.length > 0) {
      throw new Error(
        `Found setTimeout usage in services not in the allowlist:\n` +
          unaccounted.map(f => `  - ${f}`).join('\n') +
          `\n\nIf this is intentional (non-gameplay timer), add it to ALLOWED_NATIVE_TIMEOUT with a justification.` +
          `\nIf this is a gameplay timer, it MUST use TimeService or a pause-aware mechanism.`
      );
    }
  });

  it('no setInterval usage for gameplay timing in services/', () => {
    const files = collectTsFiles(SERVICES_DIR);
    const unaccounted: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const relativePath = getRelativePath(file);

      if (content.includes('setInterval(') || content.includes('setInterval (')) {
        if (!ALLOWED_NATIVE_INTERVAL[relativePath]) {
          unaccounted.push(relativePath);
        }
      }
    }

    if (unaccounted.length > 0) {
      throw new Error(
        `Found setInterval usage in services not in the allowlist:\n` +
          unaccounted.map(f => `  - ${f}`).join('\n') +
          `\n\nAdd to ALLOWED_NATIVE_INTERVAL with justification, or refactor to use TimeService.`
      );
    }
  });

  it('gameplay-critical services do NOT use native setTimeout', () => {
    // These services are in the hot gameplay path and MUST NOT use native setTimeout
    const GAMEPLAY_CRITICAL = [
      'combat',
      'spawners',
      'difficulty',
      'gameplay',
      'patterns',
    ];

    const files = collectTsFiles(SERVICES_DIR);
    const violations: string[] = [];

    for (const file of files) {
      const relativePath = getRelativePath(file);
      const isGameplayCritical = GAMEPLAY_CRITICAL.some(cat =>
        relativePath.startsWith(cat + '/')
      );

      if (!isGameplayCritical) continue;

      const content = readFileSync(file, 'utf-8');
      if (content.includes('setTimeout(') || content.includes('setInterval(')) {
        violations.push(relativePath);
      }
    }

    expect(violations).toEqual([]);
  });
});
