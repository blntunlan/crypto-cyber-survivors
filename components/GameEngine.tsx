import React, { useRef, useEffect } from 'react';
import { MarketPosition, MarketData, Player, GameStatus, GameState, Candle } from '../types';
import { COLORS, GAME_ENGINE } from '../constants';
import { audio } from '../services/audioService';
import { PoolManager } from '../services/poolManager';
import { GameRenderer } from '../services/GameRenderer';
import { useGameInput } from '../hooks/useGameInput';
import { EventBus } from '../services/EventBus';
import { ComboSystem } from '../services/ComboSystem';

import { PhysicsSystem } from '../services/PhysicsSystem';
import { SpawnSystem } from '../services/SpawnSystem';
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
  const { getMovementVector } = useGameInput();

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
    levelUpFlash: 0,
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

  useEffect(() => {
    // Reset time trackers on any status change to prevent jumps/spikes
    state.current.lastTime = 0;

    if (status === GameStatus.MENU) {
      pool.current.clearAll();
      state.current.spawnTimer = 0;
      state.current.lastFireTime = 0;

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
      s.bgCandles.forEach(c => {
        const trendMultiplier = marketData.pnl >= 0 ? -1 : 1;
        const volatilitySpeed = c.speed * (1 + marketData.difficulty / 1.5);
        c.y += volatilitySpeed * trendMultiplier * dtFactor;
        if (c.y > height + 100) {
          c.y = -100;
          c.x = Math.random() * width;
        }
        if (c.y < -100) {
          c.y = height + 100;
          c.x = Math.random() * width;
        }
      });
    }

    if (status === GameStatus.PLAYING) {
      // Handle Level Up Freeze
      if (s.levelUpFreeze > 0) {
        s.levelUpFreeze -= deltaTime;
        s.levelUpFlash = s.levelUpFreeze / 500; // Flash decays with freeze
        if (s.levelUpFreeze <= 0) {
          s.levelUpFlash = 0;
          onLevelUp();
        }
        // During freeze, we still want to draw but not update physics
        draw();
        requestRef.current = requestAnimationFrame(update);
        return;
      }

      if (s.shake > 0) s.shake *= Math.pow(GAME_ENGINE.SHAKE_DECAY, dtFactor);
      if (s.critFlash > 0) s.critFlash *= Math.pow(GAME_ENGINE.CRIT_FLASH_DECAY, dtFactor);
      if (s.levelUpFlash > 0) s.levelUpFlash *= 0.9; // Extra safety decay

      // Update combo system
      ComboSystem.update();

      const { dx, dy } = getMovementVector();

      if (dx !== 0 || dy !== 0) {
        const mag = Math.hypot(dx, dy);
        player.x += (dx / mag) * player.speed * dtFactor;
        player.y += (dy / mag) * player.speed * dtFactor;
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

      if (time - s.lastFireTime > player.fireRate) {
        // Find nearest enemy using reduce for proper type narrowing
        const nearest = p.activeEnemies.reduce<{ x: number; y: number; dist: number } | null>(
          (best, e) => {
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (!best || d < best.dist) {
              return { x: e.x, y: e.y, dist: d };
            }
            return best;
          },
          null
        );

        if (nearest) {
          const luckBonus = player.luck * 0.02;
          const isSuperCrit = Math.random() < (player.critChance + luckBonus) * 0.2;
          const isCrit = !isSuperCrit && Math.random() < player.critChance + luckBonus;
          const baseAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
          let damage = player.baseDamage;
          if (isSuperCrit) damage *= 4;
          else if (isCrit) damage *= 2;

          for (let i = 0; i < player.projectiles; i++) {
            const spread = GAME_ENGINE.PROJECTILE_SPREAD;
            const angleOffset = (i - (player.projectiles - 1) / 2) * spread;
            const finalAngle = baseAngle + angleOffset;

            p.getBullet(
              player.x,
              player.y,
              Math.cos(finalAngle) * GAME_ENGINE.BULLET_SPEED,
              Math.sin(finalAngle) * GAME_ENGINE.BULLET_SPEED,
              damage,
              (isSuperCrit ? 12 : isCrit ? 8 : 4) * player.area,
              isSuperCrit ? COLORS.SUPER_CRIT : isCrit ? COLORS.CRIT : COLORS.BULLET,
              isCrit,
              isSuperCrit
            );
          }

          s.lastFireTime = time;
          audio.playShoot();
        }
      }

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
