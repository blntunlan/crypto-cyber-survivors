import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WebGLRenderer } from 'three';

import { ABILITY_SLOT_COUNT } from '@/game-v2/contracts/AbilitySlot';
import { type GameV2Phase } from '@/game-v2/contracts/GameV2Phase';
import { type LevelUpOfferReadout } from '@/game-v2/contracts/GameV2Debug';
import { type OfferCandidateIndex } from '@/game-v2/contracts/LevelUpOffer';
import {
  createPositionContext,
  type LeverageMode,
  type PositionContext,
  type PositionSide,
} from '@/game-v2/contracts/PositionContext';
import { KeyboardInput } from '@/game-v2/input/KeyboardInput';
import { createBtcMarketFeedSource } from '@/game-v2/market/BtcMarketFeedSource';
import { type MarketFeedSource } from '@/game-v2/market/MarketFeedSource';
import { MarketSnapshotAdapter } from '@/game-v2/market/MarketSnapshotAdapter';
import { type RendererPort } from '@/game-v2/presentation/ThreeScene';
import {
  createMvp0Runtime,
  resolveEntryPriceOverride,
  resolveRunIdentity,
} from '@/game-v2/runtime/createMvp0Runtime';
import { type GameV2Runtime, type IntentSource } from '@/game-v2/runtime/GameV2Runtime';
import { formatAbilitySlotBinding } from '@/game-v2/ui/AbilitySlotLabel';
import { LevelUpOverlay } from '@/game-v2/ui/LevelUpOverlay';
import { PositionSelectScreen } from '@/game-v2/ui/PositionSelectScreen';

const ABILITY_SLOT_INDICES = Array.from({ length: ABILITY_SLOT_COUNT }, (_, i) => i);

import './game-v2.css';

const MAX_PIXEL_RATIO = 2;

/** The HUD is informational, so it refreshes at 10 Hz instead of every frame. */
const HUD_FRAME_INTERVAL = 6;

const createWebGlRenderer = (canvas: HTMLCanvasElement): RendererPort => {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

  return renderer;
};

const randomSeed = (): number => {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);

  return buffer[0] ?? 0;
};

export type GameV2AppProps = {
  /** Overridable so the runtime can be driven without a real WebGL context. */
  createRenderer?: (canvas: HTMLCanvasElement) => RendererPort;
  /** Overridable so tests never open a real `EventSource`. */
  createMarketFeedSource?: () => MarketFeedSource;
};

/**
 * The `/game-v2` surface: a pre-run position selection screen, then one
 * runtime, one animation frame loop, one canvas (`V2-201`).
 *
 * React state changes only when the stage/lifecycle phase changes.
 * Everything that moves at simulation rate is written straight to the DOM or
 * lives inside the runtime, so no 60 Hz value ever passes through a
 * re-render.
 */
export const GameV2App = ({
  createRenderer = createWebGlRenderer,
  createMarketFeedSource = createBtcMarketFeedSource,
}: GameV2AppProps): React.ReactElement => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLSpanElement>(null);
  const healthRef = useRef<HTMLSpanElement>(null);
  const tickRef = useRef<HTMLSpanElement>(null);
  const abilitySlotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const runtimeRef = useRef<GameV2Runtime | null>(null);
  const positionContextRef = useRef<PositionContext | null>(null);

  const [appStage, setAppStage] = useState<'select' | 'run'>('select');
  const [livePrice, setLivePrice] = useState<number | null>(() =>
    resolveEntryPriceOverride(window.location.search)
  );
  const [phase, setPhase] = useState<GameV2Phase>('idle');
  const [offer, setOffer] = useState<LevelUpOfferReadout | null>(null);
  const [rerollCharges, setRerollCharges] = useState<0 | 1>(0);
  const [banishCharges, setBanishCharges] = useState<0 | 1>(0);
  const [failure, setFailure] = useState<string | null>(null);

  // Stage 'select': drives the live BTC price for the selection screen.
  // Stopped as soon as a position locks — nothing consumes a live price
  // during a run yet.
  useEffect(() => {
    if (appStage !== 'select') {
      return undefined;
    }

    const adapter = new MarketSnapshotAdapter(createMarketFeedSource());
    const unsubscribe = adapter.subscribe(snapshot => {
      setLivePrice(snapshot.price);
    });
    adapter.start();

    return () => {
      unsubscribe();
      adapter.stop();
    };
  }, [appStage, createMarketFeedSource]);

  const handleStart = useCallback(
    (side: PositionSide, leverage: LeverageMode): void => {
      if (livePrice === null) {
        return;
      }

      positionContextRef.current = createPositionContext({
        asset: 'BTC',
        side,
        leverage,
        entryPrice: livePrice,
        lockedAtTick: 0,
      });
      setAppStage('run');
    },
    [livePrice]
  );

  // Stage 'run': the runtime, the frame loop, and everything it drives.
  useEffect(() => {
    if (appStage !== 'run') {
      return undefined;
    }

    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const positionContext = positionContextRef.current;

    if (canvas === null || stage === null || positionContext === null) {
      return undefined;
    }

    const keyboard = new KeyboardInput(window);
    const intentSource: IntentSource = {
      sample: (_tick, out) => {
        keyboard.sample(out);
        return true;
      },
      // The keyboard buffers a dash edge that is never sampled while the run
      // is over, so a restart has to drop it.
      reset: () => {
        keyboard.clear();
      },
    };
    const runtime = createMvp0Runtime({
      runIdentity: resolveRunIdentity(window.location.search, randomSeed),
      positionContext,
      intentSource,
      renderTarget: { canvas, createRenderer },
    });

    runtimeRef.current = runtime;

    const applyViewport = (): void => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;

      if (width > 0 && height > 0) {
        runtime.resize(width, height);
      }
    };

    const syncHud = (): void => {
      const readout = runtime.readout();

      if (levelRef.current !== null) {
        levelRef.current.textContent = `LV ${readout.playerLevel}`;
      }
      if (healthRef.current !== null) {
        healthRef.current.textContent = `HP ${Math.ceil(readout.playerHealth)}/${readout.playerMaxHealth}`;
      }
      if (tickRef.current !== null) {
        tickRef.current.textContent = `T ${readout.tick}`;
      }

      // Only occupied slots display (design §5.1): an empty slot's element is
      // hidden rather than left with stale or empty text.
      for (const index of ABILITY_SLOT_INDICES) {
        const el = abilitySlotRefs.current[index];
        if (el === null || el === undefined) {
          continue;
        }

        const slot = readout.abilitySlots[index];

        if (slot === null || slot === undefined) {
          el.hidden = true;
          continue;
        }

        el.hidden = false;
        el.textContent = `${formatAbilitySlotBinding(slot)} Lv${slot.tier}`;
      }
    };

    runtime.start();
    applyViewport();
    syncHud();
    setPhase(runtime.phase);

    let lastPhase: GameV2Phase = runtime.phase;
    let previousTimestamp: number | null = null;
    let hudFrames = 0;
    let frameHandle = 0;

    /**
     * A throw here must stop the loop, not repeat at 60 Hz forever.
     *
     * The runtime has real, documented failure modes — world capacity
     * exhaustion above all — and the next frame is already scheduled by the
     * time the body runs, so an uncaught throw would spin.
     */
    const frame = (timestamp: number): void => {
      frameHandle = window.requestAnimationFrame(frame);

      try {
        const deltaMs = previousTimestamp === null ? 0 : timestamp - previousTimestamp;
        previousTimestamp = timestamp;

        runtime.advanceFrame(Math.max(0, deltaMs));

        if (runtime.phase !== lastPhase) {
          lastPhase = runtime.phase;

          if (runtime.phase === 'level-up') {
            const levelUpReadout = runtime.readout();
            setOffer(levelUpReadout.levelUpOffer);
            setRerollCharges(levelUpReadout.rerollCharges);
            setBanishCharges(levelUpReadout.banishCharges);
          }

          setPhase(runtime.phase);
          syncHud();
          hudFrames = 0;
          return;
        }

        hudFrames += 1;

        if (hudFrames >= HUD_FRAME_INTERVAL) {
          hudFrames = 0;
          syncHud();
        }
      } catch (error) {
        window.cancelAnimationFrame(frameHandle);
        console.error('Game V2 runtime stopped', error);
        setFailure(error instanceof Error ? error.message : String(error));
      }
    };

    frameHandle = window.requestAnimationFrame(frame);
    window.addEventListener('resize', applyViewport);

    if (import.meta.env.DEV) {
      window.gameV2Debug = { getSnapshot: () => runtime.debugSnapshot() };
    }

    return () => {
      window.cancelAnimationFrame(frameHandle);
      window.removeEventListener('resize', applyViewport);
      delete window.gameV2Debug;
      keyboard.dispose();
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, [appStage, createRenderer]);

  const handleChoose = useCallback((choiceIndex: OfferCandidateIndex): void => {
    const runtime = runtimeRef.current;

    if (runtime?.phase !== 'level-up') {
      return;
    }

    runtime.chooseUpgrade(choiceIndex);
    setPhase(runtime.phase);
  }, []);

  const handleReroll = useCallback((): void => {
    const runtime = runtimeRef.current;

    if (runtime?.phase !== 'level-up') {
      return;
    }

    runtime.rerollOffer();
    const readout = runtime.readout();
    setOffer(readout.levelUpOffer);
    setRerollCharges(readout.rerollCharges);
  }, []);

  const handleBanish = useCallback((choiceIndex: OfferCandidateIndex): void => {
    const runtime = runtimeRef.current;

    if (runtime?.phase !== 'level-up') {
      return;
    }

    runtime.banishOffer(choiceIndex);
    const readout = runtime.readout();
    setOffer(readout.levelUpOffer);
    setBanishCharges(readout.banishCharges);
  }, []);

  const handleRestart = useCallback((): void => {
    const runtime = runtimeRef.current;

    if (runtime?.phase !== 'game-over') {
      return;
    }

    // Each run is a new trade: a restart locks a fresh position rather than
    // silently reusing the old one (V2-ADR-088), so it returns to the
    // selection screen instead of resetting the same runtime in place.
    positionContextRef.current = null;
    setOffer(null);
    setRerollCharges(0);
    setBanishCharges(0);
    setPhase('idle');
    setLivePrice(resolveEntryPriceOverride(window.location.search));
    setAppStage('select');
  }, []);

  if (appStage === 'select') {
    return (
      <main className="game-v2" data-testid="game-v2-root">
        <PositionSelectScreen livePrice={livePrice} onStart={handleStart} />
      </main>
    );
  }

  return (
    <main className="game-v2" data-testid="game-v2-root">
      <div className="game-v2-stage" data-testid="game-v2-stage" ref={stageRef}>
        <canvas
          className="game-v2-canvas"
          data-testid="game-v2-canvas"
          ref={canvasRef}
        />
        <div className="game-v2-hud" data-testid="game-v2-hud">
          <span
            className="game-v2-hud-field"
            data-testid="game-v2-hud-level"
            ref={levelRef}
          />
          <span
            className="game-v2-hud-field"
            data-testid="game-v2-hud-health"
            ref={healthRef}
          />
          <span
            className="game-v2-hud-field"
            data-testid="game-v2-hud-tick"
            ref={tickRef}
          />
          {ABILITY_SLOT_INDICES.map(index => (
            <span
              key={index}
              className="game-v2-hud-field game-v2-hud-ability-slot"
              data-testid={`game-v2-hud-ability-${index}`}
              hidden
              ref={el => {
                abilitySlotRefs.current[index] = el;
              }}
            />
          ))}
        </div>
        {failure === null && phase === 'level-up' && offer !== null ? (
          <LevelUpOverlay
            offer={offer}
            onChoose={handleChoose}
            rerollCharges={rerollCharges}
            banishCharges={banishCharges}
            onReroll={handleReroll}
            onBanish={handleBanish}
          />
        ) : null}
        {failure !== null ? (
          <div className="level-up-overlay" data-testid="game-v2-failure-overlay">
            <div
              aria-labelledby="game-v2-failure-title"
              aria-modal="true"
              className="level-up-dialog"
              role="dialog"
            >
              <h2 className="level-up-title" id="game-v2-failure-title">
                Runtime stopped
              </h2>
              <p className="game-v2-failure-detail">{failure}</p>
            </div>
          </div>
        ) : null}
        {failure === null && phase === 'game-over' ? (
          <div className="level-up-overlay" data-testid="game-over-overlay">
            <div
              aria-labelledby="game-v2-game-over-title"
              aria-modal="true"
              className="level-up-dialog"
              role="dialog"
            >
              <h2 className="level-up-title" id="game-v2-game-over-title">
                Liquidated
              </h2>
              <button
                type="button"
                className="level-up-choice-button"
                onClick={handleRestart}
              >
                Run it back
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default GameV2App;
