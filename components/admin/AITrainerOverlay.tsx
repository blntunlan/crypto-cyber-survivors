import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AI_INPUT_STATE } from '../../hooks/useGameInput';
import { PoolManager } from '../../services/combat/PoolManager';
import { GameStatus } from '../../types';

import { MarketPosition, type LeverageOption, type Player } from '../../types';

// Neural Network for AI Agent
class NeuralNetwork {
  w1: number[][]; // 8 inputs x 8 hidden
  w2: number[][]; // 8 hidden x 3 outputs (dx, dy, dash)

  constructor(w1?: number[][], w2?: number[][]) {
    this.w1 =
      w1 ??
      Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => Math.random() * 2 - 1)
      );
    this.w2 =
      w2 ??
      Array.from({ length: 8 }, () =>
        Array.from({ length: 3 }, () => Math.random() * 2 - 1)
      );
  }

  forward(inputs: number[]): number[] {
    const hidden = new Array(8).fill(0);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        hidden[i] += inputs[j]! * this.w1[j]![i]!;
      }
      hidden[i] = Math.tanh(hidden[i]!);
    }
    const outputs = new Array(3).fill(0);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 8; j++) {
        outputs[i] += hidden[j]! * this.w2[j]![i]!;
      }
      outputs[i] = Math.tanh(outputs[i]!);
    }
    return outputs;
  }

  mutate(rate: number = 0.1): NeuralNetwork {
    const mutateWeight = (w: number) =>
      Math.random() < rate ? w + (Math.random() * 0.5 - 0.25) : w;
    const newW1 = this.w1.map(row => row.map(mutateWeight));
    const newW2 = this.w2.map(row => row.map(mutateWeight));
    return new NeuralNetwork(newW1, newW2);
  }

  toJSON() {
    return { w1: this.w1, w2: this.w2 };
  }

  static fromJSON(data: { w1: number[][]; w2: number[][] }) {
    return new NeuralNetwork(data.w1, data.w2);
  }
}

interface AITrainerOverlayProps {
  playerRef: React.RefObject<Player>;
  gameStatus: GameStatus;
  resetGame: () => void;
  startGame: (choice: MarketPosition, leverage: LeverageOption) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upgradeChoices: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectUpgrade: (card: any) => void;
}

export const AITrainerOverlay: React.FC<AITrainerOverlayProps> = ({
  playerRef,
  gameStatus,
  resetGame,
  startGame,
  upgradeChoices,
  selectUpgrade,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [generation, setGeneration] = useState(1);
  const [fitness, setFitness] = useState(0);
  const [bestFitness, setBestFitness] = useState(0);

  const [leverage, setLeverage] = useState<LeverageOption>(10);
  const [position, setPosition] = useState<MarketPosition>(MarketPosition.LONG);

  const getStorageKey = useCallback(
    () => `ai_brain_${leverage}x_${position}`,
    [leverage, position]
  );

  const loadBestBrain = useCallback(() => {
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        const data = JSON.parse(saved);
        setBestFitness(data.fitness ?? 0);
        return NeuralNetwork.fromJSON(data.brain);
      }
    } catch {
      /* ignore */
    }
    setBestFitness(0);
    return new NeuralNetwork();
  }, [getStorageKey]);

  const bestBrainRef = useRef<NeuralNetwork>(new NeuralNetwork());
  const currentBrainRef = useRef<NeuralNetwork>(new NeuralNetwork());
  const fitnessRef = useRef(0);
  const survivalTimeRef = useRef(0);

  // Initialize brain on mount or settings change
  useEffect(() => {
    if (!isActive) {
      bestBrainRef.current = loadBestBrain();
      // Start slightly mutated from the best known
      currentBrainRef.current = bestBrainRef.current.mutate(0.05);
    }
  }, [leverage, position, isActive, loadBestBrain]);

  // Main AI Loop
  useEffect(() => {
    if (!isActive) {
      AI_INPUT_STATE.active = false;
      return;
    }

    AI_INPUT_STATE.active = true;

    // Auto-start game if in menu
    if (gameStatus === GameStatus.MENU) {
      // Small timeout to avoid state collision during reset
      const timer = setTimeout(() => startGame(position, leverage), 100);
      return () => clearTimeout(timer);
    }

    // Auto-select level up
    if (gameStatus === GameStatus.LEVEL_UP && upgradeChoices.length > 0) {
      // Small timeout to let UI register, then pick a random upgrade
      const timer = setTimeout(() => {
        const randomUpgrade =
          upgradeChoices[Math.floor(Math.random() * upgradeChoices.length)];
        if (randomUpgrade) {
          selectUpgrade(randomUpgrade);
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    // Auto-restart game if game over
    if (
      gameStatus === GameStatus.GAMEOVER ||
      gameStatus === GameStatus.CYCLE_COMPLETE
    ) {
      if (fitnessRef.current > bestFitness) {
        setBestFitness(fitnessRef.current);
        bestBrainRef.current = currentBrainRef.current;
        localStorage.setItem(
          getStorageKey(),
          JSON.stringify({
            fitness: fitnessRef.current,
            brain: bestBrainRef.current.toJSON(),
          })
        );
      }
      // Evolve brain slightly from the best one
      currentBrainRef.current = bestBrainRef.current.mutate(0.1);

      setGeneration(g => g + 1);
      fitnessRef.current = 0;
      survivalTimeRef.current = 0;
      resetGame();
      // setTimeout above in MENU state will handle the restart
      return;
    }

    if (gameStatus !== GameStatus.PLAYING) return;

    let animationFrame: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const player = playerRef.current;
      const pool = PoolManager.getInstance();

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!player) {
        animationFrame = requestAnimationFrame(loop);
        return;
      }

      survivalTimeRef.current += dt;

      const isMoving =
        Math.abs(AI_INPUT_STATE.dx) > 0.1 || Math.abs(AI_INPUT_STATE.dy) > 0.1;
      const movementBonus = isMoving ? dt * 0.5 : -dt * 1.5;

      // Fitness: Heavily weight EXP/Gem collection to encourage aggressive buff seeking
      fitnessRef.current =
        survivalTimeRef.current * 0.5 +
        movementBonus +
        player.exp * 50 +
        (player.level - 1) * 1000;
      setFitness(Math.floor(fitnessRef.current));

      // 1. Find closest enemy
      let closestE = null;
      let minDistE = Infinity;
      for (const e of pool.activeEnemies) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < minDistE) {
          minDistE = d;
          closestE = e;
        }
      }

      // 2. Find closest gem (buff)
      let closestG = null;
      let minDistG = Infinity;
      for (const g of pool.activeGems) {
        const d = Math.hypot(g.x - player.x, g.y - player.y);
        if (d < minDistG) {
          minDistG = d;
          closestG = g;
        }
      }

      const ARENA_SIZE = 2000; // approximate

      // Vector calculations
      const distE = closestE ? Math.min(1, minDistE / ARENA_SIZE) : 1;
      // Convert angle to X, Y vector components for smoother NN learning
      const eDirX = closestE
        ? Math.cos(Math.atan2(closestE.y - player.y, closestE.x - player.x))
        : 0;
      const eDirY = closestE
        ? Math.sin(Math.atan2(closestE.y - player.y, closestE.x - player.x))
        : 0;

      let distG = 1;
      let gDirX = 0;
      let gDirY = 0;

      if (closestG) {
        distG = Math.min(1, minDistG / ARENA_SIZE);
        // If a gem is very close, give a massive signal to grab it
        if (minDistG < 300) distG = -5.0;

        const angle = Math.atan2(closestG.y - player.y, closestG.x - player.x);
        gDirX = Math.cos(angle);
        gDirY = Math.sin(angle);
      } else {
        // Pseudo-gem at center of screen to pull AI back from edges
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const distToCenter = Math.hypot(centerX - player.x, centerY - player.y);
        distG = Math.min(1, distToCenter / ARENA_SIZE);

        const angle = Math.atan2(centerY - player.y, centerX - player.x);
        gDirX = Math.cos(angle);
        gDirY = Math.sin(angle);
      }

      const hpNorm = player.hp / Math.max(1, player.maxHp);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dashReady = ((player as any).dashCooldownTimer ?? 0) <= 0 ? 1 : -1;

      // 8 Inputs now: (Enemy Dist, Enemy X, Enemy Y, Gem Dist, Gem X, Gem Y, HP, Dash)
      const inputs = [distE, eDirX, eDirY, distG, gDirX, gDirY, hpNorm, dashReady];
      const outputs = currentBrainRef.current.forward(inputs);

      // Add slight noise to prevent getting stuck in dead-center equilibrium (where outputs cancel out to 0)
      const noiseX = (Math.random() - 0.5) * 0.1;
      const noiseY = (Math.random() - 0.5) * 0.1;

      AI_INPUT_STATE.dx = outputs[0]! + noiseX;
      AI_INPUT_STATE.dy = outputs[1]! + noiseY;
      AI_INPUT_STATE.dash = outputs[2]! > 0.5;

      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [
    isActive,
    gameStatus,
    playerRef,
    resetGame,
    startGame,
    bestFitness,
    upgradeChoices,
    selectUpgrade,
    position,
    leverage,
    getStorageKey,
  ]);

  const handleStop = () => {
    setIsActive(false);
    AI_INPUT_STATE.active = false;
    AI_INPUT_STATE.dx = 0;
    AI_INPUT_STATE.dy = 0;
    AI_INPUT_STATE.dash = false;
  };

  const handleClearMemory = () => {
    localStorage.removeItem(getStorageKey());
    setBestFitness(0);
    bestBrainRef.current = new NeuralNetwork();
    currentBrainRef.current = new NeuralNetwork();
    setGeneration(1);
  };

  if (!isActive) {
    return (
      <div className="fixed bottom-32 right-4 z-[9999] w-64 rounded-lg border-2 border-purple-500 bg-black/90 p-4 font-mono text-sm text-white shadow-[0_0_25px_rgba(168,85,247,0.5)]">
        <h3 className="mb-3 border-b border-purple-500/50 pb-2 text-center font-bold text-purple-400">
          🤖 AI TRAINER CONFIG
        </h3>

        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Market Position:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPosition(MarketPosition.LONG)}
                className={`flex-1 rounded border py-1 ${position === MarketPosition.LONG ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-gray-700 text-gray-500'}`}
              >
                LONG
              </button>
              <button
                onClick={() => setPosition(MarketPosition.SHORT)}
                className={`flex-1 rounded border py-1 ${position === MarketPosition.SHORT ? 'border-red-500 bg-red-500/20 text-red-400' : 'border-gray-700 text-gray-500'}`}
              >
                SHORT
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Leverage ({leverage}x):
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={leverage}
              onChange={e => setLeverage(Number(e.target.value) as LeverageOption)}
              className="w-full accent-purple-500"
            />
            <div className="mt-1 flex justify-between px-1 text-xs text-gray-600">
              <span>1x</span>
              <span>10x</span>
              <span>50x</span>
              <span>100x</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded border border-purple-500/30 bg-purple-900/20 p-2 text-xs">
            <span className="text-gray-400">Saved Record:</span>
            <span className="font-bold text-yellow-400">{Math.floor(bestFitness)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsActive(true)}
            className="flex-1 rounded bg-purple-600 py-2 font-bold text-white transition-colors hover:bg-purple-500"
          >
            START TRAINING
          </button>
          <button
            onClick={handleClearMemory}
            title="Wipe AI Memory for this config"
            className="rounded border border-red-500/50 bg-red-900/40 px-3 text-red-400 transition-colors hover:bg-red-500 hover:text-white"
          >
            🗑️
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-4 top-1/2 z-[9999] w-64 -translate-y-1/2 rounded-lg border-2 border-purple-500 bg-black/90 p-4 font-mono text-sm text-white shadow-[0_0_25px_rgba(168,85,247,0.5)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between border-b border-purple-500/50 pb-2">
        <div className="flex flex-col">
          <h3 className="flex items-center gap-2 font-bold text-purple-400">
            <span className="animate-pulse">🔴</span> AI OVERRIDE
          </h3>
          <span className="mt-1 text-[10px] text-gray-500">
            {position} {leverage}x
          </span>
        </div>
        <button
          onClick={handleStop}
          className="rounded border border-red-500/50 bg-red-500/20 px-2 py-1 text-xs font-bold text-red-400 transition-colors hover:bg-red-500 hover:text-white"
        >
          STOP
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Status:</span>
          <span className="text-green-400">ACTIVE</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Generation:</span>
          <span>{generation}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Current Fitness:</span>
          <span className="text-yellow-400">{fitness}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Best Record:</span>
          <span className="text-purple-400">{Math.floor(bestFitness)}</span>
        </div>
      </div>

      <div className="mt-4 border-t border-purple-500/30 pt-2 text-xs text-gray-500">
        AI is evaluating real-time Market Data and mutating based on survival fitness.
      </div>
    </div>
  );
};
