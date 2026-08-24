import {
  DASH_INVULNERABILITY_TICKS,
  ENEMY_RADIUS,
  MVP0_MAX_PLAYER_LEVEL,
  PLAYER_MAX_HEALTH,
  PLAYER_RADIUS,
  SIMULATION_STEP_MS,
  WEAPON_COOLDOWN_TICKS,
} from '@/game-v2/config/Mvp0Config';
import { type GameV2RuntimeReadout } from '@/game-v2/contracts/GameV2Debug';
import { type OfferCandidate } from '@/game-v2/contracts/LevelUpOffer';
import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';
import { PASSIVE_MOVE_SPEED_BY_LEVEL } from '@/game-v2/contracts/PassiveSlot';
import { createRunIdentity } from '@/game-v2/contracts/RunIdentity';
import { type RendererPort } from '@/game-v2/presentation/ThreeScene';
import { createMvp0Runtime } from '@/game-v2/runtime/createMvp0Runtime';
import { type GameV2Runtime, type IntentSource } from '@/game-v2/runtime/GameV2Runtime';

export const CONTACT_RANGE = PLAYER_RADIUS + ENEMY_RADIUS;

/**
 * The dash is triggered just before contact, not on it: an enemy that already
 * touched the player is on its contact cooldown, so a dash then would prove
 * nothing about i-frames.
 */
export const DASH_TRIGGER_MARGIN = 0.5;
export const STEER_MAGNITUDE = 0.999;
/**
 * An arbitrary but fixed seed. Earlier registry sizes (one, then three,
 * ability identities) made specific seed values line up with specific offer
 * content; V2-107 grew the registry to eight abilities plus one passive, at
 * which point hunting for a seed whose offer happens to contain a specific
 * identity stopped being tractable (most seeds miss the single passive
 * identity entirely in a 3-of-9 draw). `driveScriptedRun` below no longer
 * depends on offer content matching a specific identity — it recognizes
 * "an ability was upgraded" generically and self-heals a missing passive
 * candidate through a real reroll — so this value has no significance
 * beyond being fixed and reproducible.
 */
export const SCENARIO_SEED = 9;

const MAX_FRAMES = 6000;

export type FakeRenderer = {
  port: RendererPort;
  renderCalls: number;
  setSizeCalls: number;
  disposeCalls: number;
  /** Camera X per render call: what the frame actually showed. */
  cameraX: number[];
};

export const createFakeRenderer = (): FakeRenderer => {
  const fake: FakeRenderer = {
    renderCalls: 0,
    setSizeCalls: 0,
    disposeCalls: 0,
    cameraX: [],
    port: {
      render: (_scene, camera) => {
        fake.renderCalls += 1;
        fake.cameraX.push(camera.position.x);
      },
      setSize: () => {
        fake.setSizeCalls += 1;
      },
      dispose: () => {
        fake.disposeCalls += 1;
      },
    },
  };

  return fake;
};

/** Intent the driving loop mutates between frames; one frame is exactly one tick. */
export const createManualIntentSource = (): {
  source: IntentSource;
  intent: PlayerIntent;
} => {
  const intent: PlayerIntent = { moveX: 0, moveY: 0, dashPressed: false };
  const source: IntentSource = {
    sample: (_tick, out) => {
      out.moveX = intent.moveX;
      out.moveY = intent.moveY;
      out.dashPressed = intent.dashPressed;
      return true;
    },
  };

  return { source, intent };
};

export const steerToward = (
  intent: PlayerIntent,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): void => {
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance === 0) {
    intent.moveX = 0;
    intent.moveY = 0;
    return;
  }

  intent.moveX = (deltaX / distance) * STEER_MAGNITUDE;
  intent.moveY = (deltaY / distance) * STEER_MAGNITUDE;
};

export const distanceToNearestEnemy = (readout: GameV2RuntimeReadout): number => {
  if (readout.nearestEnemyX === null || readout.nearestEnemyY === null) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.hypot(
    readout.nearestEnemyX - readout.playerX,
    readout.nearestEnemyY - readout.playerY
  );
};

/**
 * Resolves which offer slot to choose for `desiredKind`, rerolling once
 * (production-legitimate, consumes the real charge) when the preferred
 * candidate is missing from the current offer. Exported so every caller that
 * drives a level-up to completion — `driveScriptedRun` itself and
 * `Mvp0Runtime.test.ts`'s own live re-drive helpers — applies the identical
 * policy; two different policies would consume RNG differently and desync
 * entity-generation counts between a live run and a live re-drive of its own
 * recorded frames (as opposed to a true recorded-command replay).
 *
 * For `'ability'`, prefers `starter-projectile` — the only identity the
 * player already holds at this point — so callers that assert the *held*
 * slot's tier advances (rather than a new slot being filled) stay
 * meaningful. V2-107 grew the offerable ability pool to eight, so a random
 * 3-of-9 draw no longer always contains it. For `'passive'`, the single
 * passive identity can be crowded out the same way.
 */
export const resolveOfferChoiceIndex = (
  runtime: GameV2Runtime,
  desiredKind: OfferCandidate['kind']
): 0 | 1 | 2 => {
  let readout = runtime.readout();
  const candidatesOf = (): readonly (OfferCandidate | null)[] =>
    readout.levelUpOffer?.candidates ?? [];
  const preferredIndex = (): number =>
    candidatesOf().findIndex(
      candidate =>
        candidate?.kind === desiredKind &&
        (desiredKind !== 'ability' || candidate.identity === 'starter-projectile')
    );

  if (preferredIndex() < 0 && readout.rerollCharges > 0) {
    runtime.rerollOffer();
    readout = runtime.readout();
  }

  const preferred = preferredIndex();
  const fallback = candidatesOf().findIndex(
    candidate => candidate?.kind === desiredKind
  );
  const chosen = preferred >= 0 ? preferred : fallback;

  if (chosen < 0) {
    throw new Error(`no ${desiredKind} candidate in the current offer`);
  }

  return chosen as 0 | 1 | 2;
};

export type ScriptedRun = {
  runtime: GameV2Runtime;
  renderer: FakeRenderer;
  phase: GameV2RuntimeReadout['phase'];
  playerMoved: boolean;
  dashTick: number;
  dashPreventedDamage: boolean;
  enemyKilled: boolean;
  levelUpReached: boolean;
  upgradeApplied: boolean;
  gameOverTransitions: number;
};

/**
 * Drives one complete MVP-0 run: warm up movement, dash into a contacting
 * enemy, collect a drop into the first level-up, then charge until death.
 *
 * The controller reads runtime state between frames, so the run is adaptive,
 * but the input it produces is recorded tick by tick and therefore replayable.
 */
export const driveScriptedRun = (
  seed: number,
  desiredKind: OfferCandidate['kind'] = 'ability',
  /**
   * When true, the run rerolls and banishes once before choosing (V2-105),
   * so a recording exercises both new command types for replay-determinism
   * tests. Which candidate gets banished does not matter (`banish` redraws a
   * replacement from the remaining offerable pool), since the upgrade
   * `desiredKind` is recognized generically afterward rather than by a
   * specific identity's numbers (V2-107 grew the ability pool to eight).
   */
  useRerollAndBanish = false
): ScriptedRun => {
  const renderer = createFakeRenderer();
  const { source, intent } = createManualIntentSource();
  const runtime = createMvp0Runtime({
    runIdentity: createRunIdentity(`scripted-${seed}`, seed),
    intentSource: source,
    renderTarget: {
      canvas: document.createElement('canvas'),
      createRenderer: () => renderer.port,
    },
  });

  runtime.start();

  let stage: 'warmup' | 'dash' | 'collect' | 'charge' = 'warmup';
  let playerMoved = false;
  let dashTick = -1;
  let dashPreventedDamage = false;
  let enemyKilled = false;
  let levelUpReached = false;
  let upgradeApplied = false;
  let gameOverTransitions = 0;
  let previousHealth = PLAYER_MAX_HEALTH;
  let previousPhase: GameV2RuntimeReadout['phase'] = 'idle';
  let rerollAndBanishDone = false;
  let readout = runtime.readout();

  for (let frame = 0; frame < MAX_FRAMES; frame += 1) {
    readout = runtime.readout();

    if (previousPhase !== 'game-over' && readout.phase === 'game-over') {
      gameOverTransitions += 1;
    }
    previousPhase = readout.phase;

    if (readout.phase === 'game-over') {
      break;
    }

    if (readout.xpPickupCount > 0) {
      enemyKilled = true;
    }

    if (readout.phase === 'level-up') {
      levelUpReached = true;

      if (useRerollAndBanish && !rerollAndBanishDone) {
        rerollAndBanishDone = true;
        runtime.rerollOffer();
        // Which specific candidate is banished does not matter: `banish`
        // redraws a replacement from the remaining offerable pool (or
        // leaves the slot empty if that pool is exhausted), and this run
        // only needs *some* `desiredKind` candidate to remain afterward,
        // checked generically below rather than by identity.
        runtime.banishOffer(0);
        readout = runtime.readout();
      }

      const beforeUpgrade = readout;
      const chosenIndex = resolveOfferChoiceIndex(runtime, desiredKind);
      runtime.chooseUpgrade(chosenIndex);
      const afterUpgrade = runtime.readout();
      // Recognized generically rather than by a specific identity's numbers,
      // since V2-107 grew the ability pool to eight and any of them may be
      // the one actually offered and chosen: an ability upgrade either adds
      // a new occupied slot or advances an already-held slot's tier; a
      // passive upgrade raises the move-speed level and speed by definition
      // (only one passive identity is registered).
      const abilityEffectApplied = beforeUpgrade.abilitySlots.some((before, index) => {
        const after = afterUpgrade.abilitySlots[index];
        return (before === null) !== (after === null) || before?.tier !== after?.tier;
      });
      const effectApplied =
        desiredKind === 'ability'
          ? abilityEffectApplied
          : afterUpgrade.moveSpeedLevel === 1 &&
            afterUpgrade.moveSpeed === PASSIVE_MOVE_SPEED_BY_LEVEL[1];
      upgradeApplied =
        effectApplied &&
        afterUpgrade.playerLevel === MVP0_MAX_PLAYER_LEVEL &&
        afterUpgrade.phase === 'playing';
      previousHealth = afterUpgrade.playerHealth;
      continue;
    }

    // Somewhere inside the i-frame window the player is overlapping an enemy and
    // still loses no health; that tick is the dash doing its job.
    if (
      dashTick >= 0 &&
      readout.tick >= dashTick &&
      readout.tick <= dashTick + DASH_INVULNERABILITY_TICKS &&
      readout.invulnerabilityTicks > 0 &&
      distanceToNearestEnemy(readout) <= CONTACT_RANGE &&
      readout.playerHealth === previousHealth
    ) {
      dashPreventedDamage = true;
    }

    if (readout.playerX !== 0 || readout.playerY !== 0) {
      playerMoved = true;
    }

    intent.dashPressed = false;

    if (stage === 'warmup') {
      intent.moveX = STEER_MAGNITUDE;
      intent.moveY = 0;
      if (readout.tick >= WEAPON_COOLDOWN_TICKS) {
        stage = 'dash';
      }
    } else if (stage === 'dash') {
      intent.moveX = 0;
      intent.moveY = 0;
      const enemyDistance = distanceToNearestEnemy(readout);
      if (
        readout.nearestEnemyX !== null &&
        readout.nearestEnemyY !== null &&
        enemyDistance > CONTACT_RANGE &&
        enemyDistance <= CONTACT_RANGE + DASH_TRIGGER_MARGIN &&
        readout.dashCooldownTicks === 0
      ) {
        steerToward(
          intent,
          readout.playerX,
          readout.playerY,
          readout.nearestEnemyX,
          readout.nearestEnemyY
        );
        intent.dashPressed = true;
        dashTick = readout.tick + 1;
        stage = 'collect';
      }
    } else if (stage === 'collect') {
      if (readout.nearestXpPickupX !== null && readout.nearestXpPickupY !== null) {
        steerToward(
          intent,
          readout.playerX,
          readout.playerY,
          readout.nearestXpPickupX,
          readout.nearestXpPickupY
        );
      } else {
        intent.moveX = 0;
        intent.moveY = 0;
      }
      if (upgradeApplied) {
        stage = 'charge';
      }
    } else if (readout.nearestEnemyX !== null && readout.nearestEnemyY !== null) {
      steerToward(
        intent,
        readout.playerX,
        readout.playerY,
        readout.nearestEnemyX,
        readout.nearestEnemyY
      );
    } else {
      intent.moveX = 0;
      intent.moveY = 0;
    }

    previousHealth = readout.playerHealth;
    runtime.advanceFrame(SIMULATION_STEP_MS);
  }

  return {
    runtime,
    renderer,
    phase: readout.phase,
    playerMoved,
    dashTick,
    dashPreventedDamage,
    enemyKilled,
    levelUpReached,
    upgradeApplied,
    gameOverTransitions,
  };
};
