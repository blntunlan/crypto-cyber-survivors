import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WebGLRenderer } from 'three';

import { PROJECTILE_DAMAGE } from '@/game-v2/config/Mvp0Config';
import { type GameV2Phase } from '@/game-v2/contracts/GameV2Phase';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';
import { KeyboardInput } from '@/game-v2/input/KeyboardInput';
import { type RendererPort } from '@/game-v2/presentation/ThreeScene';
import {
  createMvp0Runtime,
  resolveRunIdentity,
} from '@/game-v2/runtime/createMvp0Runtime';
import { type GameV2Runtime, type IntentSource } from '@/game-v2/runtime/GameV2Runtime';
import { LevelUpOverlay } from '@/game-v2/ui/LevelUpOverlay';

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
};

/**
 * The `/game-v2` surface: one runtime, one animation frame loop, one canvas.
 *
 * React state changes only when the lifecycle phase changes. Everything that
 * moves at simulation rate is written straight to the DOM or lives inside the
 * runtime, so no 60 Hz value ever passes through a re-render.
 */
export const GameV2App = ({
  createRenderer = createWebGlRenderer,
}: GameV2AppProps): React.ReactElement => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLSpanElement>(null);
  const healthRef = useRef<HTMLSpanElement>(null);
  const tickRef = useRef<HTMLSpanElement>(null);
  const runtimeRef = useRef<GameV2Runtime | null>(null);

  const [phase, setPhase] = useState<GameV2Phase>('idle');
  const [damageBefore, setDamageBefore] = useState(PROJECTILE_DAMAGE);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;

    if (canvas === null || stage === null) {
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
            setDamageBefore(runtime.readout().weaponDamage);
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
  }, [createRenderer]);

  const handleChoose = useCallback((choiceId: RunCommand['choiceId']): void => {
    const runtime = runtimeRef.current;

    if (runtime?.phase !== 'level-up') {
      return;
    }

    runtime.chooseUpgrade(choiceId);
    setPhase(runtime.phase);
  }, []);

  const handleRestart = useCallback((): void => {
    const runtime = runtimeRef.current;

    if (runtime?.phase !== 'game-over') {
      return;
    }

    runtime.reset();
    runtime.start();
    setDamageBefore(PROJECTILE_DAMAGE);
    setPhase(runtime.phase);
  }, []);

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
        </div>
        {failure === null && phase === 'level-up' ? (
          <LevelUpOverlay damageBefore={damageBefore} onChoose={handleChoose} />
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
