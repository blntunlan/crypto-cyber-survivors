import React, { useRef, useEffect, useCallback } from 'react';
import { MarketPosition, MarketData, Player, GameStatus } from '../types';
import { COLORS, GAME_ENGINE } from '../constants';
import { audio } from '../services/audioService';
import { PoolManager } from '../services/poolManager';
import { EventBus } from '../services/EventBus';
import { DifficultyManager } from '../services/DifficultyManager';
import { CheatManager } from '../services/CheatManager';
import { ComboSystem } from '../services/ComboSystem';

interface Candle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  speed: number;
}

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

  const state = useRef({
    bgCandles: [] as Candle[],
    lastFireTime: 0,
    spawnTimer: 0,
    shake: 0,
    critFlash: 0,
    critFlashColor: COLORS.CRIT,
    keys: {} as Record<string, boolean>,
    currentBg: { r: 2, g: 6, b: 23 },
    lastTime: 0,
    // Combo display state
    comboStreak: 0,
    comboMultiplier: 1.0,
    comboTimeRemaining: 0,
    comboMilestoneText: '',
    comboMilestoneColor: '',
    comboMilestoneTimer: 0,
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

    if (status === GameStatus.MENU || status === GameStatus.PLAYING) {
      if (status === GameStatus.MENU) {
        pool.current.clearAll();
        state.current.spawnTimer = 0;
        state.current.lastFireTime = 0;
      }
      ComboSystem.startGame();
      // Manually reset UI display state
      state.current.comboStreak = 0;
      state.current.comboMultiplier = 1.0;
      state.current.comboMilestoneTimer = 0;
      state.current.comboMilestoneText = '';
    }
  }, [status]);

  // Setup combo milestone listener
  useEffect(() => {
    const unsubMilestone = EventBus.on('comboMilestone', data => {
      state.current.comboMilestoneText = data.name;
      state.current.comboMilestoneColor = data.color;
      state.current.comboMilestoneTimer = 2.0; // Show for 2 seconds
    });

    const unsubUpdate = EventBus.on('comboUpdate', data => {
      state.current.comboStreak = data.killStreak;
      state.current.comboMultiplier = data.multiplier;
    });

    const unsubEnd = EventBus.on('comboEnd', () => {
      state.current.comboStreak = 0;
      state.current.comboMultiplier = 1.0;
    });

    return () => {
      unsubMilestone();
      unsubUpdate();
      unsubEnd();
    };
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    state.current.keys[e.key] = true;
  }, []);
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    state.current.keys[e.key] = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

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
      s.comboTimeRemaining = ComboSystem.getComboTimeRemaining();
      if (s.comboMilestoneTimer > 0) {
        s.comboMilestoneTimer -= deltaTime / 1000;
      }

      let dx = 0;
      let dy = 0;
      if (s.keys['ArrowUp'] || s.keys['w']) dy -= 1;
      if (s.keys['ArrowDown'] || s.keys['s']) dy += 1;
      if (s.keys['ArrowLeft'] || s.keys['a']) dx -= 1;
      if (s.keys['ArrowRight'] || s.keys['d']) dx += 1;

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

      s.spawnTimer += deltaTime;
      // Softer difficulty scaling: uses sqrt to smooth the curve
      const scaledDifficulty = 1 + (marketData.difficulty - 1) * GAME_ENGINE.SPAWN_DIFFICULTY_SCALE;
      if (s.spawnTimer > GAME_ENGINE.SPAWN_TIMER_BASE / scaledDifficulty) {
        const edge = Math.floor(Math.random() * 4);
        let x = 0,
          y = 0;
        if (edge === 0) {
          x = Math.random() * width;
          y = -50;
        } else if (edge === 1) {
          x = Math.random() * width;
          y = height + 50;
        } else if (edge === 2) {
          x = -50;
          y = Math.random() * height;
        } else {
          x = width + 50;
          y = Math.random() * height;
        }

        p.getEnemy(x, y, marketData.difficulty, position);
        s.spawnTimer = 0;
      }

      p.activeBullets.forEach(b => {
        b.x += b.vx * dtFactor;
        b.y += b.vy * dtFactor;
        if (b.x < -100 || b.x > width + 100 || b.y < -100 || b.y > height + 100) b.active = false;
      });

      p.activeEnemies.forEach(e => {
        // Off-screen culling
        if (
          e.x < -GAME_ENGINE.ENEMY_OFFSCREEN_THRESHOLD ||
          e.x > width + GAME_ENGINE.ENEMY_OFFSCREEN_THRESHOLD ||
          e.y < -GAME_ENGINE.ENEMY_OFFSCREEN_THRESHOLD ||
          e.y > height + GAME_ENGINE.ENEMY_OFFSCREEN_THRESHOLD
        ) {
          e.active = false;
          return;
        }

        e.behavior.move(e, player.x, player.y);

        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < player.radius + e.radius) {
          if (!CheatManager.isGodMode()) {
            player.hp -= Math.max(0.1, 0.8 - player.armor * 0.05) * dtFactor;
            s.shake = 10;
            if (Math.random() > 0.9) audio.playHit();
            if (player.hp <= 0) onGameOver();
          }
        }

        p.activeBullets.forEach(b => {
          if (!e.active) return; // Prevent multiple bullets killing same enemy in one frame

          const bDist = Math.hypot(e.x - b.x, e.y - b.y);
          if (bDist < e.radius + b.radius) {
            e.health -= b.damage;
            b.active = false;
            if (b.isCrit || b.isSuperCrit) {
              s.critFlash = b.isSuperCrit ? 0.15 : 0.08;
              s.critFlashColor = b.isSuperCrit ? COLORS.SUPER_CRIT : COLORS.CRIT;
              audio.playCrit();
              EventBus.emit('critHit', {
                damage: b.damage,
                isSuperCrit: !!b.isSuperCrit,
                x: e.x,
                y: e.y,
              });
            }

            // Damage feedback for EVERY hit
            p.getFloatingText(
              e.x + (Math.random() - 0.5) * 10,
              e.y - 20,
              b.damage.toFixed(0),
              b.isSuperCrit ? COLORS.SUPER_CRIT : b.isCrit ? COLORS.CRIT : COLORS.SLOT_SILVER,
              b.isSuperCrit ? 36 : b.isCrit ? 28 : 20
            );
            if (e.health <= 0) {
              e.active = false;
              DifficultyManager.recordKill();
              EventBus.emit('enemyKilled', {
                x: e.x,
                y: e.y,
                type: e.type,
                isCrit: !!b.isSuperCrit,
              });
              for (let k = 0; k < (b.isSuperCrit ? 30 : 10); k++) {
                p.getParticle(
                  e.x,
                  e.y,
                  (Math.random() - 0.5) * 6,
                  (Math.random() - 0.5) * 6,
                  e.color
                );
              }
              const isRare = Math.random() < 0.05 + player.luck * 0.05;
              p.getGem(
                e.x,
                e.y,
                (e.type === 'whale' ? 100 : 15) * (isRare ? 3 : 1),
                isRare ? 10 : 7,
                isRare ? COLORS.RARE_GEM : COLORS.GEM,
                isRare
              );
            }
          }
        });
      });

      p.activeParticles.forEach(part => {
        part.x += part.vx * dtFactor;
        part.y += part.vy * dtFactor;
        part.life -= 0.02 * dtFactor;
        if (part.life <= 0) part.active = false;
      });

      p.activeFloatingTexts.forEach(t => {
        t.y -= 1.5 * dtFactor;
        t.life -= 0.025 * dtFactor;
        if (t.life <= 0) t.active = false;
      });

      p.activeGems.forEach(g => {
        const dist = Math.hypot(player.x - g.x, player.y - g.y);
        const range = GAME_ENGINE.GEM_MAGNET_BASE_RANGE + player.magnet;
        if (dist < range) {
          const pull = lerp(12, 2, dist / range) * dtFactor;
          g.x += ((player.x - g.x) / dist) * pull;
          g.y += ((player.y - g.y) / dist) * pull;
        }
        if (dist < player.radius + g.radius) {
          // Apply combo XP multiplier
          const xpGain = Math.floor(g.value * ComboSystem.getXpMultiplier());
          player.exp += xpGain;
          g.active = false;
          audio.playGem();
          if (player.exp >= player.nextLevelExp) {
            s.levelUpFreeze = 500; // 500ms pause
            s.levelUpFlash = 1.0;
            s.shake = 10;
          }
        }
      });
      updatePlayerStats({ ...player });
      p.cleanup(); // Consolidate inactive objects
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = state.current;
    const player = playerRef.current;
    const p = pool.current;

    ctx.save();
    if (s.shake > 0)
      ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);

    ctx.fillStyle = `rgb(${s.currentBg.r}, ${s.currentBg.g}, ${s.currentBg.b})`;
    ctx.fillRect(0, 0, width, height);

    s.bgCandles.forEach(c => {
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = c.color;
      const rx = Math.round(c.x);
      const ry = Math.round(c.y);
      ctx.fillRect(rx, ry, Math.round(c.w), Math.round(c.h));
      ctx.beginPath();
      ctx.moveTo(rx + Math.round(c.w / 2), ry - 5);
      ctx.lineTo(rx + Math.round(c.w / 2), ry + Math.round(c.h + 5));
      ctx.strokeStyle = c.color;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    if (status !== GameStatus.MENU) {
      if (s.critFlash > 0) {
        // Subtle edge glow instead of full screen flash
        ctx.save();
        const gradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.4,
          width / 2,
          height / 2,
          Math.max(width, height)
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, s.critFlashColor);
        ctx.globalAlpha = s.critFlash;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      p.activeParticles.forEach(part => {
        ctx.globalAlpha = part.life;
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(Math.round(part.x), Math.round(part.y), 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      p.activeGems.forEach(g => {
        // Reduced shadow usage for performance
        if (g.isRare) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = g.color;
        }
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.arc(Math.round(g.x), Math.round(g.y), g.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      p.activeBullets.forEach(b => {
        if (b.isSuperCrit) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = b.color;
        }
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(Math.round(b.x), Math.round(b.y), b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      p.activeEnemies.forEach(e => {
        const ex = Math.round(e.x);
        const ey = Math.round(e.y);
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(ex, ey, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(ex - e.radius, ey - e.radius - 8, e.radius * 2, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(
          ex - e.radius,
          ey - e.radius - 8,
          e.radius * 2 * Math.max(0, e.health / e.maxHealth),
          4
        );
      });

      p.activeFloatingTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.life;
        const floatOffset = (1 - t.life) * 30;
        const displayY = Math.round(t.y - floatOffset);
        const displayX = Math.round(t.x);
        const scale = 1 + (t.size > 20 ? 0.2 : 0);

        ctx.font = `bold ${Math.floor(t.size * scale)}px 'VT323', 'VCR OSD Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(t.text, displayX, displayY);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, displayX, displayY);
        ctx.restore();
      });
      ctx.globalAlpha = 1;

      ctx.shadowBlur = 15;
      ctx.shadowColor = player.color;
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(Math.round(player.x), Math.round(player.y), player.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw combo UI (moved higher to avoid HUD overlap)
      if (s.comboStreak >= 5) {
        const comboX = width / 2;
        const comboY = height - 220; // Moved from -80 to -220

        // Combo timer bar
        const barWidth = 120;
        const barHeight = 6;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(comboX - barWidth / 2, comboY + 25, barWidth, barHeight);

        const milestone = ComboSystem.getCurrentMilestone();
        const timerColor = milestone?.color ?? COLORS.NEON_ORANGE;
        ctx.fillStyle = timerColor;
        ctx.fillRect(comboX - barWidth / 2, comboY + 25, barWidth * s.comboTimeRemaining, barHeight);

        // Combo streak text
        ctx.font = "bold 32px 'VT323', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText(`${s.comboStreak}x COMBO`, comboX, comboY);
        ctx.fillStyle = timerColor;
        ctx.fillText(`${s.comboStreak}x COMBO`, comboX, comboY);

        // Multiplier text
        if (s.comboMultiplier > 1) {
          ctx.font = "bold 18px 'VT323', monospace";
          ctx.strokeText(`x${s.comboMultiplier.toFixed(1)} XP`, comboX, comboY + 45);
          ctx.fillText(`x${s.comboMultiplier.toFixed(1)} XP`, comboX, comboY + 45);
        }
      }

      // Draw combo milestone announcement (center screen)
      if (s.comboMilestoneTimer > 0) {
        const alpha = Math.min(1, s.comboMilestoneTimer);
        ctx.globalAlpha = alpha;

        const milestoneY = height / 3;
        const scale = 1 + (1 - alpha) * 0.3;

        ctx.font = `bold ${Math.floor(54 * scale)}px 'VT323', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.strokeText(s.comboMilestoneText, width / 2, milestoneY);
        ctx.fillStyle = s.comboMilestoneColor;
        ctx.fillText(s.comboMilestoneText, width / 2, milestoneY);

        ctx.globalAlpha = 1;
      }
    }

    // Draw Level Up Flash
    if (s.levelUpFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${s.levelUpFlash * 0.5})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  };

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
  }, [marketData.difficulty, position, status]);

  return <canvas ref={canvasRef} width={width} height={height} className="block cursor-none" />;
};
