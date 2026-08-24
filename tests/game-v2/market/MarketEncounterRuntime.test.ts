import { describe, expect, it } from 'vitest';

import { TREND_BREAKOUT_ENTRY_THRESHOLD } from '@/game-v2/config/TrendBreakoutFamily';
import {
  VOLATILITY_SURGE_ACTIVE_TICKS,
  VOLATILITY_SURGE_CONFIRMATION_TICKS,
  VOLATILITY_SURGE_ENTRY_THRESHOLD,
  VOLATILITY_SURGE_TELEGRAPH_TICKS,
} from '@/game-v2/config/VolatilitySurgeFamily';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type MarketSnapshot } from '@/game-v2/contracts/MarketSnapshot';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { type EnemyDefinition } from '@/game-v2/contracts/EnemyArchetype';
import { MarketEncounterRuntime } from '@/game-v2/market/MarketEncounterRuntime';
import { DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { ConvergenceSystem } from '@/game-v2/systems/ConvergenceSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const SIMULATION_HZ = 60;
const FIXED_DELTA_SECONDS = 1 / SIMULATION_HZ;

const createContext = (tick: number): StepContext => ({
  tick,
  deltaSeconds: FIXED_DELTA_SECONDS,
  intent: { moveX: 0, moveY: 0, dashPressed: false },
});

const baseSnapshot = (
  overrides: Partial<
    Pick<
      MarketSnapshot,
      'atrPercent' | 'trendStrength' | 'trendDirection' | 'whaleTier' | 'timestamp'
    >
  >
): MarketSnapshot => ({
  schemaVersion: 1,
  asset: 'BTC',
  price: 65_000,
  rsi: 50,
  rsiState: 'NEUTRAL',
  atrPercent: 0.001,
  normalizedVolume: 1,
  volumePercentile: 0.5,
  whaleTier: 0,
  trendStrength: 0,
  trendDirection: 'NEUTRAL',
  timestamp: 0,
  isSynthetic: false,
  ...overrides,
});

class ScriptedSnapshotSource {
  private snapshot: MarketSnapshot | null = null;

  public set(snapshot: MarketSnapshot | null): void {
    this.snapshot = snapshot;
  }

  public latest(): MarketSnapshot | null {
    return this.snapshot;
  }
}

const createPlayer = (world: World): EntityId =>
  world.createEntity(ComponentMask.Player);

describe('MarketEncounterRuntime', () => {
  it('is fully inert with no snapshot source: never composes a spawn, never has a pending bonus', () => {
    const runtime = new MarketEncounterRuntime();
    const rng = new DeterministicRng(1);
    const spawnOut: EnemyDefinition[] = [];
    const world = new World(4);
    const convergence = new ConvergenceSystem();
    const player = createPlayer(world);
    convergence.resetPlayer(world, player);
    const slot = world.slotOf(player);

    for (let tick = 1; tick <= 200; tick += 1) {
      runtime.step(rng, tick, tick * 1000, spawnOut);
      expect(spawnOut).toHaveLength(0);
      runtime.applyPendingConvergenceBonus(world, player, createContext(tick));
    }

    expect(world.convergence[slot]).toBe(0);
  });

  it('routes a real SPAWN output into spawnOut', () => {
    const source = new ScriptedSnapshotSource();
    const runtime = new MarketEncounterRuntime({ snapshotSource: source });
    const rng = new DeterministicRng(7);
    const spawnOut: EnemyDefinition[] = [];
    const breakoutLevel = TREND_BREAKOUT_ENTRY_THRESHOLD + 0.1;

    // Activation lands exactly TREND_BREAKOUT_CONFIRMATION_TICKS (60) ticks
    // after the arm tick (1), i.e. tick 61 -- one call per tick, 61 calls.
    for (let tick = 1; tick <= 61; tick += 1) {
      source.set(
        baseSnapshot({
          trendStrength: breakoutLevel,
          trendDirection: 'UP',
          timestamp: tick * 1000,
        })
      );
      runtime.step(rng, tick, tick * 1000, spawnOut);
    }

    expect(spawnOut.length).toBeGreaterThan(0);
  });

  // The indicator machine itself needs VOLATILITY_SURGE_CONFIRMATION_TICKS
  // ticks after the arm tick (1) before it produces a WORLD_EVENT output;
  // only then does the hazard's own telegraph+active lifespan begin.
  const VOLATILITY_SURGE_EXPIRY_TICK =
    1 +
    VOLATILITY_SURGE_CONFIRMATION_TICKS +
    VOLATILITY_SURGE_TELEGRAPH_TICKS +
    VOLATILITY_SURGE_ACTIVE_TICKS;

  it('routes a real WORLD_EVENT expiry into a Convergence bonus once applied', () => {
    const source = new ScriptedSnapshotSource();
    const runtime = new MarketEncounterRuntime({ snapshotSource: source });
    const rng = new DeterministicRng(3);
    const spawnOut: EnemyDefinition[] = [];
    const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;
    const world = new World(4);
    const convergence = new ConvergenceSystem();
    const player = createPlayer(world);
    convergence.resetPlayer(world, player);
    const slot = world.slotOf(player);

    for (let tick = 1; tick <= VOLATILITY_SURGE_EXPIRY_TICK; tick += 1) {
      source.set(baseSnapshot({ atrPercent: surgeLevel, timestamp: tick * 1000 }));
      runtime.step(rng, tick, tick * 1000, spawnOut);
      runtime.applyPendingConvergenceBonus(world, player, createContext(tick));
    }

    expect(world.convergence[slot]).toBeGreaterThan(0);
  });

  it('does not apply the bonus until applyPendingConvergenceBonus is called', () => {
    const source = new ScriptedSnapshotSource();
    const runtime = new MarketEncounterRuntime({ snapshotSource: source });
    const rng = new DeterministicRng(3);
    const spawnOut: EnemyDefinition[] = [];
    const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;
    const world = new World(4);
    const convergence = new ConvergenceSystem();
    const player = createPlayer(world);
    convergence.resetPlayer(world, player);
    const slot = world.slotOf(player);

    for (let tick = 1; tick <= VOLATILITY_SURGE_EXPIRY_TICK; tick += 1) {
      source.set(baseSnapshot({ atrPercent: surgeLevel, timestamp: tick * 1000 }));
      runtime.step(rng, tick, tick * 1000, spawnOut);
    }

    // step() alone never touches world.convergence.
    expect(world.convergence[slot]).toBe(0);

    runtime.applyPendingConvergenceBonus(
      world,
      player,
      createContext(VOLATILITY_SURGE_EXPIRY_TICK)
    );
    expect(world.convergence[slot]).toBeGreaterThan(0);
  });

  it('routes a real LOOT_EVENT into a Convergence bonus once applied', () => {
    const source = new ScriptedSnapshotSource();
    const runtime = new MarketEncounterRuntime({ snapshotSource: source });
    const rng = new DeterministicRng(9);
    const spawnOut: EnemyDefinition[] = [];
    const world = new World(4);
    const convergence = new ConvergenceSystem();
    const player = createPlayer(world);
    convergence.resetPlayer(world, player);
    const slot = world.slotOf(player);

    source.set(baseSnapshot({ whaleTier: 3, timestamp: 1000 }));
    runtime.step(rng, 1, 1000, spawnOut);
    runtime.applyPendingConvergenceBonus(world, player, createContext(1));

    expect(world.convergence[slot]).toBeGreaterThan(0);
  });

  it('reset() clears the underlying director, hazard lifecycle, and pending state', () => {
    const source = new ScriptedSnapshotSource();
    const runtime = new MarketEncounterRuntime({ snapshotSource: source });
    const rng = new DeterministicRng(3);
    const spawnOut: EnemyDefinition[] = [];
    const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;
    const world = new World(4);
    const convergence = new ConvergenceSystem();
    const player = createPlayer(world);
    convergence.resetPlayer(world, player);
    const slot = world.slotOf(player);

    for (let tick = 1; tick <= 30; tick += 1) {
      source.set(baseSnapshot({ atrPercent: surgeLevel, timestamp: tick * 1000 }));
      runtime.step(rng, tick, tick * 1000, spawnOut);
    }

    runtime.reset();

    // A fresh cycle after reset must need the full confirmation duration
    // again, restarting ticks from any value without a monotonic-tick
    // violation, and no leftover pending bonus applies.
    for (let tick = 1; tick <= VOLATILITY_SURGE_TELEGRAPH_TICKS; tick += 1) {
      source.set(baseSnapshot({ atrPercent: surgeLevel, timestamp: tick * 1000 }));
      runtime.step(rng, tick, tick * 1000, spawnOut);
      runtime.applyPendingConvergenceBonus(world, player, createContext(tick));
    }

    expect(world.convergence[slot]).toBe(0);
  });
});
