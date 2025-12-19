import React, { useRef, useEffect } from 'react';
import { MarketPosition, MarketData, Player, GameStatus, GameState, Candle } from '../types';
import { COLORS, GAME_ENGINE } from '../constants';
import { audio } from '../services/audioService';
import { PoolManager } from '../services/poolManager';
import { GameRenderer } from '../services/GameRenderer';
import { useGameInput } from '../hooks/useGameInput';
import { EventBus } from '../services/EventBus';
import { MetricsService } from '../services/MetricsService';
import { DifficultyManager } from '../services/DifficultyManager';
import { ComboSystem } from '../services/ComboSystem';

import { PhysicsSystem } from '../services/PhysicsSystem';
import { SpawnSystem } from '../services/SpawnSystem';
import { CombatSystem } from '../services/CombatSystem';
import { GameHUD } from './GameHUD';

interface GameEngineProps {
  status: GameStatus;
  position: MarketPosition;
  marketData: MarketData;
  onGameOver: () => void;
  onLevelUp: () => void;
  updatePlayerStats: (player: Player) => void;
  playerRef: React.MutableRefObject<Player>;
  width: number;
  height: number;
}

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export const GameEngine: React.FC<GameEngineProps> = ({
  status,
  position,
  marketData,
  onGameOver,
  onLevelUp,
  updatePlayerStats,
  playerRef,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const pool = useRef(new PoolManager());
  const renderer = useRef(new GameRenderer());
  const { getMovementVector, isSpacePressed } = useGameInput();

  const state = useRef<GameState>({
    bgCandles: [] as Candle[],
    lastFireTime: 0,
    spawnTimer: 0,
    shake: 0,
    critFlash: 0,
    critFlashColor: COLORS.CRIT,
    currentBg: { r: 2, g: 6, b: 23 },
    lastTime: 0,

    levelUpFreeze: 0,
    isDashing: false,
    dashTimer: 0,
    dashCooldownTimer: 0,
    dashTrail: [],
  });

  useEffect(() => {
    const candles: Candle[] = [];
    for (let i = 0; i < 30; i++) {
      candles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        w: 2 + Math.random() * 3,
        h: 20 + Math.random() * 60,
        color: Math.random() > 0.5 ? COLORS.LONG : COLORS.SHORT,
        speed: 0.2 + Math.random() * 1.5,
      });
    }
    state.current.bgCandles = candles;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clamp player to screen if dimensions change (e.g. resize while paused)
  useEffect(() => {
    const player = playerRef.current;
    player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));
  }, [width, height, playerRef]);

  useEffect(() => {
    // Reset time trackers on any status change to prevent jumps/spikes
    state.current.lastTime = 0;

    if (status === GameStatus.MENU) {
      pool.current.clearAll();
      state.current.spawnTimer = 0;
      state.current.lastFireTime = 0;
      state.current.shake = 0;
      state.current.critFlash = 0;
    }
  }, [status]);



  useEffect(() => {
    const unsub = EventBus.subscribe('killAll', () => {
      state.current.shake = 20;
      audio.playHit();
      pool.current.activeEnemies.forEach(e => {
        e.health = 0;
      });
    });
    return () => unsub();
  }, []);

  const update = (time: number) => {
    const s = state.current;
    const player = playerRef.current;
    const p = pool.current;

    const deltaTime = s.lastTime ? time - s.lastTime : 16.67;
    const dtFactor = deltaTime / 16.67;
    s.lastTime = time;

    if (status !== GameStatus.PAUSED) {
      renderer.current.updateBackgroundCandles(
        s,
        marketData.pnl,
        marketData.difficulty,
        dtFactor,
        width,
        height
      );
    }

    if (status === GameStatus.PLAYING) {
      // Handle Level Up Freeze
      if (s.levelUpFreeze > 0) {
        s.levelUpFreeze -= deltaTime;
        // Reset shake during level up screen
        s.shake = 0;
        s.critFlash = 0;
        if (s.levelUpFreeze <= 0) {
          onLevelUp();
        }
        // During freeze, we still want to draw but not update physics
        draw();
        requestRef.current = requestAnimationFrame(update);
        return;
      }

      if (s.shake > 0) s.shake *= Math.pow(GAME_ENGINE.SHAKE_DECAY, dtFactor);
      if (s.critFlash > 0) s.critFlash *= Math.pow(GAME_ENGINE.CRIT_FLASH_DECAY, dtFactor);

      // Update combo system
      ComboSystem.update();

      // Update metrics system
      const wavePhase = DifficultyManager.getWavePhase();
      const maxHp = 100 + (player.level - 1) * 10; // Base HP calculation
      const hpPercent = (player.hp / maxHp) * 100;
      MetricsService.update(deltaTime, {
        pnl: marketData.pnl,
        atr: 0.01, // ATR from market data if available
        difficulty: marketData.difficulty,
        wavePhase,
        hpPercent,
        enemyCount: p.activeEnemies.length,
      });

      // Dash Logic Timers
      if (s.dashTimer > 0) {
        s.dashTimer -= deltaTime;
        if (s.dashTimer <= 0) s.isDashing = false;

        // Add current position to trail
        s.dashTrail.push({ x: player.x, y: player.y });
        if (s.dashTrail.length > 8) s.dashTrail.shift();
      } else {
        // Fade out trail
        if (s.dashTrail.length > 0) {
          s.dashTrail.shift();
        }
      }
      if (s.dashCooldownTimer > 0) {
        s.dashCooldownTimer -= deltaTime;
      }

      const { dx, dy } = getMovementVector();

      // Handle Dash Trigger
      if (isSpacePressed() && s.dashCooldownTimer <= 0 && (dx !== 0 || dy !== 0)) {
        s.isDashing = true;
        s.dashTimer = GAME_ENGINE.DASH_DURATION;
        s.dashCooldownTimer = GAME_ENGINE.DASH_COOLDOWN;
        audio.playDash();
      }

      if (dx !== 0 || dy !== 0) {
        const mag = Math.hypot(dx, dy);
        let speedMult = 1;
        if (s.isDashing) speedMult = GAME_ENGINE.DASH_SPEED_MULTIPLIER;

        player.x += (dx / mag) * player.speed * speedMult * dtFactor;
        player.y += (dy / mag) * player.speed * speedMult * dtFactor;
      }

      player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));

      const targetBg =
        marketData.pnl >= 0
          ? { r: 2, g: lerp(6, 40, Math.min(1, marketData.pnl * 20)), b: 10 }
          : { r: lerp(2, 40, Math.min(1, Math.abs(marketData.pnl) * 20)), g: 2, b: 2 };

      s.currentBg.r = lerp(s.currentBg.r, targetBg.r, 0.05);
      s.currentBg.g = lerp(s.currentBg.g, targetBg.g, 0.05);
      s.currentBg.b = lerp(s.currentBg.b, targetBg.b, 0.05);

      // Combat System - Auto Fire
      CombatSystem.processAutoFire(p, player, s, time);

      // Update Spawn System
      s.spawnTimer = SpawnSystem.update(
        deltaTime,
        s.spawnTimer,
        marketData.difficulty,
        width,
        height,
        position,
        p
      );

      // Update Physics & Collisions
      PhysicsSystem.updateEntities(p, dtFactor, width, height);
      PhysicsSystem.handleCollisions(p, player, s, dtFactor, width, height, onGameOver);

      updatePlayerStats({ ...player });
      p.cleanup(); // Consolidate inactive objects
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderer.current.render(
      ctx,
      width,
      height,
      state.current,
      playerRef.current,
      pool.current,
      status
    );
  }

  useEffect(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketData.difficulty, position, status, width, height]);

  return (
    <div className="relative w-full h-full cursor-none">
      <canvas ref={canvasRef} width={width} height={height} className="block" />
      <GameHUD status={status} />
    </div>
  );
};
