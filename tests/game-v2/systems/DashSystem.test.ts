import { describe, expect, it } from 'vitest';

import {
  DASH_COOLDOWN_TICKS,
  DASH_DURATION_SECONDS,
  DASH_INVULNERABILITY_TICKS,
  DASH_SPEED,
  SIMULATION_HZ,
} from '@/game-v2/config/Mvp0Config';
import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';
import { DashSystem } from '@/game-v2/systems/DashSystem';
import { MovementSystem } from '@/game-v2/systems/MovementSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const PLAYER_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Player |
  ComponentMask.PassiveLoadout;
const FIXED_DELTA_SECONDS = 1 / SIMULATION_HZ;

const intent = (moveX: number, moveY: number, dashPressed: boolean): PlayerIntent => ({
  moveX,
  moveY,
  dashPressed,
});

const createPlayer = (): { world: World; player: number; slot: number } => {
  const world = new World(4);
  const player = world.createEntity(PLAYER_MASK);
  const slot = world.slotOf(player);
  new DashSystem().resetPlayer(world, player);
  return { world, player, slot };
};

const dashState = (world: World, slot: number): unknown => ({
  x: world.x[slot],
  y: world.y[slot],
  previousX: world.previousX[slot],
  previousY: world.previousY[slot],
  velocityX: world.velocityX[slot],
  velocityY: world.velocityY[slot],
  lastFacingX: world.lastFacingX[slot],
  lastFacingY: world.lastFacingY[slot],
  dashDirectionX: world.dashDirectionX[slot],
  dashDirectionY: world.dashDirectionY[slot],
  dashRemainingSeconds: world.dashRemainingSeconds[slot],
  invulnerabilityTicksRemaining: world.invulnerabilityTicksRemaining[slot],
  dashCooldownTicksRemaining: world.dashCooldownTicksRemaining[slot],
  dashCharges: world.dashCharges[slot],
  movementOverride: world.movementOverride[slot],
});

const seedDirtyDashState = (world: World, slot: number): void => {
  world.x[slot] = 3;
  world.y[slot] = -4;
  world.previousX[slot] = 1;
  world.previousY[slot] = 2;
  world.velocityX[slot] = 7;
  world.velocityY[slot] = -8;
  world.lastFacingX[slot] = 0.6;
  world.lastFacingY[slot] = -0.8;
  world.dashDirectionX[slot] = -0.8;
  world.dashDirectionY[slot] = 0.6;
  world.dashRemainingSeconds[slot] = 0.12;
  world.invulnerabilityTicksRemaining[slot] = 5;
  world.dashCooldownTicksRemaining[slot] = 91;
  world.dashCharges[slot] = 0;
  world.movementOverride[slot] = 1;
};

describe('DashSystem', () => {
  it('starts from current intent and initializes every dash store without same-tick decrement', () => {
    const { world, player, slot } = createPlayer();
    const dash = new DashSystem();

    dash.step(world, player, {
      tick: 0,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(0.3, 0.4, true),
    });

    expect(world.dashDirectionX[slot]).toBeCloseTo(0.6);
    expect(world.dashDirectionY[slot]).toBeCloseTo(0.8);
    expect(world.lastFacingX[slot]).toBeCloseTo(0.6);
    expect(world.lastFacingY[slot]).toBeCloseTo(0.8);
    expect(world.velocityX[slot]).toBeCloseTo(DASH_SPEED * 0.6);
    expect(world.velocityY[slot]).toBeCloseTo(DASH_SPEED * 0.8);
    expect(world.dashRemainingSeconds[slot]).toBeCloseTo(DASH_DURATION_SECONDS);
    expect(world.invulnerabilityTicksRemaining[slot]).toBe(DASH_INVULNERABILITY_TICKS);
    expect(world.dashCooldownTicksRemaining[slot]).toBe(DASH_COOLDOWN_TICKS);
    expect(world.dashCharges[slot]).toBe(0);
    expect(world.movementOverride[slot]).toBe(1);
  });

  it('uses defensively normalized last facing when current intent is zero', () => {
    const { world, player, slot } = createPlayer();
    const dash = new DashSystem();
    world.lastFacingX[slot] = -3;
    world.lastFacingY[slot] = 4;

    dash.step(world, player, {
      tick: 1,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(0, 0, true),
    });

    expect(world.dashDirectionX[slot]).toBeCloseTo(-0.6);
    expect(world.dashDirectionY[slot]).toBeCloseTo(0.8);
    expect(world.lastFacingX[slot]).toBeCloseTo(-0.6);
    expect(world.lastFacingY[slot]).toBeCloseTo(0.8);
  });

  it('rejects a press with no current direction or last facing without consuming readiness', () => {
    const { world, player, slot } = createPlayer();
    const dash = new DashSystem();
    const before = dashState(world, slot);

    dash.step(world, player, {
      tick: 2,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(0, 0, true),
    });

    expect(dashState(world, slot)).toEqual(before);
  });

  it('does not start from movement intent without a dash press', () => {
    const { world, player, slot } = createPlayer();
    const dash = new DashSystem();
    const before = dashState(world, slot);

    dash.step(world, player, {
      tick: 2,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(0, 1, false),
    });

    expect(dashState(world, slot)).toEqual(before);
  });

  it('normalizes huge finite current and facing axes without overflow collapse', () => {
    const current = createPlayer();
    const fallback = createPlayer();
    const dash = new DashSystem();
    fallback.world.lastFacingX[fallback.slot] = 3e38;
    fallback.world.lastFacingY[fallback.slot] = -3e38;

    dash.step(current.world, current.player, {
      tick: 3,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(Number.MAX_VALUE, -Number.MAX_VALUE, true),
    });
    dash.step(fallback.world, fallback.player, {
      tick: 3,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(0, 0, true),
    });

    for (const [world, slot] of [
      [current.world, current.slot],
      [fallback.world, fallback.slot],
    ] as const) {
      expect(world.dashDirectionX[slot]).toBeCloseTo(0.7071067811865476);
      expect(world.dashDirectionY[slot]).toBeCloseTo(-0.7071067811865476);
      expect(Number.isFinite(world.velocityX[slot])).toBe(true);
      expect(Number.isFinite(world.velocityY[slot])).toBe(true);
    }
  });

  it('progresses timers but cannot consume another charge from repeated presses', () => {
    const { world, player, slot } = createPlayer();
    const dash = new DashSystem();
    dash.step(world, player, {
      tick: 0,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(1, 0, true),
    });

    dash.step(world, player, {
      tick: 1,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(0, 1, true),
    });

    expect(world.dashCharges[slot]).toBe(0);
    expect(world.dashDirectionX[slot]).toBe(1);
    expect(world.dashDirectionY[slot]).toBe(0);
    expect(world.dashCooldownTicksRemaining[slot]).toBe(DASH_COOLDOWN_TICKS - 1);
    expect(world.invulnerabilityTicksRemaining[slot]).toBe(
      DASH_INVULNERABILITY_TICKS - 1
    );
  });

  it('protects exactly eleven collision-resolution ticks including the start tick', () => {
    const { world, player, slot } = createPlayer();
    const dash = new DashSystem();
    let protectedTicks = 0;

    for (let tick = 0; tick <= DASH_INVULNERABILITY_TICKS; tick += 1) {
      dash.step(world, player, {
        tick,
        deltaSeconds: FIXED_DELTA_SECONDS,
        intent: intent(1, 0, tick === 0),
      });
      if ((world.invulnerabilityTicksRemaining[slot] ?? 0) > 0) {
        protectedTicks += 1;
      }
    }

    expect(protectedTicks).toBe(11);
    expect(world.invulnerabilityTicksRemaining[slot]).toBe(0);
  });

  it('restores exactly one charge after 150 subsequent ticks and never overcharges', () => {
    const { world, player, slot } = createPlayer();
    const dash = new DashSystem();
    dash.step(world, player, {
      tick: 0,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(1, 0, true),
    });

    for (let tick = 1; tick < DASH_COOLDOWN_TICKS; tick += 1) {
      dash.step(world, player, {
        tick,
        deltaSeconds: FIXED_DELTA_SECONDS,
        intent: intent(0, 0, false),
      });
    }
    expect(world.dashCooldownTicksRemaining[slot]).toBe(1);
    expect(world.dashCharges[slot]).toBe(0);

    dash.step(world, player, {
      tick: DASH_COOLDOWN_TICKS,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(0, 0, false),
    });
    expect(world.dashCooldownTicksRemaining[slot]).toBe(0);
    expect(world.dashCharges[slot]).toBe(1);

    dash.step(world, player, {
      tick: DASH_COOLDOWN_TICKS + 1,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(0, 0, false),
    });
    expect(world.dashCharges[slot]).toBe(1);
  });

  it('can start a new edge on the exact cooldown-restoration tick', () => {
    const { world, player, slot } = createPlayer();
    const dash = new DashSystem();
    dash.step(world, player, {
      tick: 0,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(1, 0, true),
    });
    world.dashRemainingSeconds[slot] = 0;
    world.movementOverride[slot] = 0;
    world.velocityX[slot] = 0;

    for (let tick = 1; tick < DASH_COOLDOWN_TICKS; tick += 1) {
      dash.step(world, player, {
        tick,
        deltaSeconds: FIXED_DELTA_SECONDS,
        intent: intent(0, 0, false),
      });
    }
    dash.step(world, player, {
      tick: DASH_COOLDOWN_TICKS,
      deltaSeconds: FIXED_DELTA_SECONDS,
      intent: intent(0, -1, true),
    });

    expect(world.dashCharges[slot]).toBe(0);
    expect(world.dashCooldownTicksRemaining[slot]).toBe(DASH_COOLDOWN_TICKS);
    expect(world.invulnerabilityTicksRemaining[slot]).toBe(DASH_INVULNERABILITY_TICKS);
    expect(world.dashDirectionX[slot]).toBe(0);
    expect(world.dashDirectionY[slot]).toBe(-1);
  });

  it('reset restores the exact ready state and is idempotent', () => {
    const { world, player, slot } = createPlayer();
    const dash = new DashSystem();
    seedDirtyDashState(world, slot);

    dash.resetPlayer(world, player);
    const once = dashState(world, slot);
    dash.resetPlayer(world, player);

    expect(once).toEqual({
      x: 3,
      y: -4,
      previousX: 1,
      previousY: 2,
      velocityX: 0,
      velocityY: 0,
      lastFacingX: 0,
      lastFacingY: 0,
      dashDirectionX: 0,
      dashDirectionY: 0,
      dashRemainingSeconds: 0,
      invulnerabilityTicksRemaining: 0,
      dashCooldownTicksRemaining: 0,
      dashCharges: 1,
      movementOverride: 0,
    });
    expect(dashState(world, slot)).toEqual(once);
  });

  it('rejects stale and wrong-mask reset targets atomically', () => {
    const dash = new DashSystem();
    const stale = createPlayer();
    stale.world.destroyEntity(stale.player);
    const staleBefore = dashState(stale.world, stale.slot);

    expect(() => dash.resetPlayer(stale.world, stale.player)).toThrow(/stale/i);
    expect(dashState(stale.world, stale.slot)).toEqual(staleBefore);

    const wrongMaskWorld = new World(4);
    const wrongMaskEntity = wrongMaskWorld.createEntity(
      ComponentMask.Transform | ComponentMask.Velocity
    );
    const wrongMaskSlot = wrongMaskWorld.slotOf(wrongMaskEntity);
    seedDirtyDashState(wrongMaskWorld, wrongMaskSlot);
    const wrongMaskBefore = dashState(wrongMaskWorld, wrongMaskSlot);

    expect(() => dash.resetPlayer(wrongMaskWorld, wrongMaskEntity)).toThrow(
      /component/i
    );
    expect(dashState(wrongMaskWorld, wrongMaskSlot)).toEqual(wrongMaskBefore);
  });

  it.each([
    ['velocityX', (world: World, slot: number) => (world.velocityX[slot] = Number.NaN)],
    ['velocityY', (world: World, slot: number) => (world.velocityY[slot] = Infinity)],
    [
      'lastFacingX',
      (world: World, slot: number) => (world.lastFacingX[slot] = Number.NaN),
    ],
    [
      'lastFacingY',
      (world: World, slot: number) => (world.lastFacingY[slot] = Infinity),
    ],
    [
      'dashDirectionX',
      (world: World, slot: number) => (world.dashDirectionX[slot] = Number.NaN),
    ],
    [
      'dashDirectionY',
      (world: World, slot: number) => (world.dashDirectionY[slot] = Infinity),
    ],
    [
      'dashRemainingSeconds',
      (world: World, slot: number) => (world.dashRemainingSeconds[slot] = Number.NaN),
    ],
  ])('rejects malformed non-finite %s atomically', (_name, forge) => {
    const { world, player, slot } = createPlayer();
    const dash = new DashSystem();
    forge(world, slot);
    const before = dashState(world, slot);

    expect(() =>
      dash.step(world, player, {
        tick: 4,
        deltaSeconds: FIXED_DELTA_SECONDS,
        intent: intent(1, 0, true),
      })
    ).toThrow(/finite|dash|facing|velocity/i);
    expect(dashState(world, slot)).toEqual(before);
  });

  it.each([
    [-1, FIXED_DELTA_SECONDS, 1, 0, true],
    [0.5, FIXED_DELTA_SECONDS, 1, 0, true],
    [0, 0, 1, 0, true],
    [0, Number.NaN, 1, 0, true],
    [0, FIXED_DELTA_SECONDS, Number.NaN, 0, true],
    [0, FIXED_DELTA_SECONDS, 0, Infinity, true],
    [0, FIXED_DELTA_SECONDS, 1, 0, 1],
  ])(
    'rejects invalid context (%s, %s, %s, %s, %s) atomically',
    (tick, deltaSeconds, moveX, moveY, dashPressed) => {
      const { world, player, slot } = createPlayer();
      const dash = new DashSystem();
      const before = dashState(world, slot);

      expect(() =>
        dash.step(world, player, {
          tick,
          deltaSeconds,
          intent: { moveX, moveY, dashPressed } as unknown as PlayerIntent,
        })
      ).toThrow(/tick|delta|finite|boolean/i);
      expect(dashState(world, slot)).toEqual(before);
    }
  );

  it('rejects stale and missing-component step targets atomically', () => {
    const dash = new DashSystem();
    const stale = createPlayer();
    stale.world.destroyEntity(stale.player);
    const staleBefore = dashState(stale.world, stale.slot);

    expect(() =>
      dash.step(stale.world, stale.player, {
        tick: 0,
        deltaSeconds: FIXED_DELTA_SECONDS,
        intent: intent(1, 0, true),
      })
    ).toThrow(/stale/i);
    expect(dashState(stale.world, stale.slot)).toEqual(staleBefore);

    const wrongMaskWorld = new World(4);
    const wrongMaskEntity = wrongMaskWorld.createEntity(
      ComponentMask.Transform | ComponentMask.Player
    );
    const wrongMaskSlot = wrongMaskWorld.slotOf(wrongMaskEntity);
    seedDirtyDashState(wrongMaskWorld, wrongMaskSlot);
    const wrongMaskBefore = dashState(wrongMaskWorld, wrongMaskSlot);

    expect(() =>
      dash.step(wrongMaskWorld, wrongMaskEntity, {
        tick: 0,
        deltaSeconds: FIXED_DELTA_SECONDS,
        intent: intent(1, 0, true),
      })
    ).toThrow(/component/i);
    expect(dashState(wrongMaskWorld, wrongMaskSlot)).toEqual(wrongMaskBefore);
  });

  it('runs before movement to travel exactly 2.88 with one partial final integration', () => {
    const { world, player, slot } = createPlayer();
    const dash = new DashSystem();
    const movement = new MovementSystem();
    let finalIntegrationCount = 0;

    for (let tick = 0; tick < 20; tick += 1) {
      dash.step(world, player, {
        tick,
        deltaSeconds: FIXED_DELTA_SECONDS,
        intent: intent(1, 0, tick === 0),
      });
      const beforeX = world.x[slot] ?? 0;
      const remainingBefore = world.dashRemainingSeconds[slot] ?? 0;
      movement.step(world, player, {
        tick,
        deltaSeconds: FIXED_DELTA_SECONDS,
        intent: intent(-1, 0, false),
      });
      const displacement = (world.x[slot] ?? 0) - beforeX;
      if (remainingBefore > 0 && remainingBefore < FIXED_DELTA_SECONDS) {
        finalIntegrationCount += 1;
        expect(displacement).toBeCloseTo(DASH_SPEED * remainingBefore, 6);
      }
      if (world.movementOverride[slot] === 0) {
        break;
      }
    }

    expect(finalIntegrationCount).toBe(1);
    expect(world.x[slot]).toBeCloseTo(DASH_SPEED * DASH_DURATION_SECONDS, 5);
    expect(world.previousX[slot]).toBeCloseTo(DASH_SPEED * (10 / SIMULATION_HZ), 5);
    expect(world.dashRemainingSeconds[slot]).toBe(0);
    expect(world.movementOverride[slot]).toBe(0);
    expect(world.velocityX[slot]).toBe(0);
    expect(world.velocityY[slot]).toBe(0);
    expect(world.lastFacingX[slot]).toBe(1);
    expect(world.lastFacingY[slot]).toBe(0);
  });
});
