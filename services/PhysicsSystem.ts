import { Player, GameState, Enemy } from '../types';
import { PoolManager } from './poolManager';
import { CheatManager } from './CheatManager';
import { audio } from './audioService';
import { EventBus } from './EventBus';
import { DifficultyManager } from './DifficultyManager';
import { ComboSystem } from './ComboSystem';
import { COLORS, GAME_ENGINE } from '../constants';

export class PhysicsSystem {
    public static updateEntities(
        p: PoolManager,
        dtFactor: number,
        width: number,
        height: number
    ) {
        // 1. Update Bullets
        p.activeBullets.forEach(b => {
            b.x += b.vx * dtFactor;
            b.y += b.vy * dtFactor;
            if (b.x < -100 || b.x > width + 100 || b.y < -100 || b.y > height + 100) {
                b.active = false;
            }
        });

        // 2. Update Particles
        p.activeParticles.forEach(part => {
            part.x += part.vx * dtFactor;
            part.y += part.vy * dtFactor;
            part.life -= 0.02 * dtFactor;
            if (part.life <= 0) part.active = false;
        });

        // 3. Update Floating Texts
        p.activeFloatingTexts.forEach(t => {
            t.y -= 1.5 * dtFactor;
            t.life -= 0.025 * dtFactor;
            if (t.life <= 0) t.active = false;
        });
    }

    public static handleCollisions(
        p: PoolManager,
        player: Player,
        s: GameState,
        dtFactor: number,
        width: number,
        height: number,
        onGameOver: () => void
    ) {
        // 1. Player vs Enemy Collisions
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

            e.behavior.move(e, player.x, player.y, dtFactor);

            const dist = Math.hypot(player.x - e.x, player.y - e.y);
            if (dist < player.radius + e.radius) {
                if (!CheatManager.isGodMode() && !s.isDashing) {
                    player.hp -= Math.max(0.1, 0.8 - player.armor * 0.05) * dtFactor;
                    s.shake = 10;
                    if (Math.random() > 0.9) audio.playHit();
                    if (player.hp <= 0) onGameOver();
                }
            }

            // 2. Bullet vs Enemy Collisions
            p.activeBullets.forEach(b => {
                if (!e.active || !b.active) return;

                // Optimization: Use squared distance to avoid Math.hypot (sqrt) overhead
                const dx = e.x - b.x;
                const dy = e.y - b.y;
                const distSq = dx * dx + dy * dy;
                const combinedRadius = e.radius + b.radius;

                if (distSq < combinedRadius * combinedRadius) {
                    e.health -= b.damage;
                    b.active = false;

                    // Knockback: push enemy in bullet direction
                    const kbStrength = 4;
                    // Optimized: Use constant BULLET_SPEED instead of calculating magnitude
                    e.x += (b.vx / GAME_ENGINE.BULLET_SPEED) * kbStrength * dtFactor;
                    e.y += (b.vy / GAME_ENGINE.BULLET_SPEED) * kbStrength * dtFactor;

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

                    // Damage feedback
                    p.getFloatingText(
                        e.x + (Math.random() - 0.5) * 10,
                        e.y - 20,
                        b.damage.toFixed(0),
                        b.isSuperCrit ? COLORS.CASINO_RED : b.isCrit ? COLORS.CASINO_GOLD : COLORS.SLOT_SILVER,
                        b.isSuperCrit ? 36 : b.isCrit ? 28 : 20
                    );

                    if (e.health <= 0) {
                        this.handleEnemyDeath(p, e, player, b.isSuperCrit);
                    }
                }
            });
        });

        p.activeGems.forEach(g => {
            const dx = player.x - g.x;
            const dy = player.y - g.y;
            const distSq = dx * dx + dy * dy;
            const range = GAME_ENGINE.GEM_MAGNET_BASE_RANGE + player.magnet;
            const rangeSq = range * range;

            if (distSq < rangeSq) {
                const dist = Math.sqrt(distSq);
                const pull = this.lerp(12, 2, dist / range) * dtFactor;
                g.x += ((player.x - g.x) / dist) * pull;
                g.y += ((player.y - g.y) / dist) * pull;
            }

            const combinedRadius = player.radius + g.radius;
            if (distSq < combinedRadius * combinedRadius) {
                const xpGain = Math.floor(g.value * ComboSystem.getXpMultiplier());
                player.exp += xpGain;
                g.active = false;
                audio.playGem();

                EventBus.emit('gemCollected', {
                    value: g.value,
                    isRare: g.isRare || false
                });

                // prevent multiple levelUpStart emissions if multiple gems collected in 1 frame
                if (player.exp >= player.nextLevelExp && s.levelUpFreeze <= 0) {
                    s.levelUpFreeze = 500;
                    s.shake = 10;
                    EventBus.emit('levelUpStart', {});
                }
            }
        });
    }

    private static handleEnemyDeath(p: PoolManager, e: Enemy, player: Player, isSuperCrit?: boolean) {
        e.active = false;
        DifficultyManager.recordKill();
        EventBus.emit('enemyKilled', {
            x: e.x,
            y: e.y,
            type: e.type,
            isCrit: !!isSuperCrit,
        });

        // Spawn particles
        const particleCount = isSuperCrit ? 30 : 10;
        for (let k = 0; k < particleCount; k++) {
            p.getParticle(
                e.x,
                e.y,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6,
                e.color
            );
        }

        // Spawn gem
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

    private static lerp(start: number, end: number, t: number) {
        return start * (1 - t) + end * t;
    }
}
