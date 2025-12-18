import { Player, GameState } from '../types';
import { PoolManager } from './poolManager';
import { audio } from './audioService';
import { COLORS, GAME_ENGINE } from '../constants';

interface NearestEnemy {
    x: number;
    y: number;
    dist: number;
}

/**
 * CombatSystem handles all firing and combat-related logic.
 * Extracted from GameEngine for better separation of concerns.
 */
export class CombatSystem {
    /**
     * Process auto-fire logic for the player.
     * Finds nearest enemy and fires projectiles at it.
     *
     * @param pool - The pool manager containing active entities
     * @param player - The player entity
     * @param state - Current game state
     * @param time - Current timestamp
     * @returns Updated lastFireTime if fired, otherwise returns current value
     */
    public static processAutoFire(
        pool: PoolManager,
        player: Player,
        state: GameState,
        time: number
    ): void {
        // Check fire rate cooldown
        if (time - state.lastFireTime <= player.fireRate) {
            return;
        }

        // Find nearest enemy
        const nearest = this.findNearestEnemy(pool, player);
        if (!nearest) {
            return;
        }

        // Fire projectiles
        this.fireBullets(pool, player, nearest, state, time);
        state.lastFireTime = time;
        audio.playShoot();
    }

    /**
     * Find the nearest enemy to the player.
     *
     * @param pool - The pool manager containing active entities
     * @param player - The player entity
     * @returns Nearest enemy position and distance, or null if no enemies
     */
    private static findNearestEnemy(
        pool: PoolManager,
        player: Player
    ): NearestEnemy | null {
        return pool.activeEnemies.reduce<NearestEnemy | null>((best, enemy) => {
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (!best || dist < best.dist) {
                return { x: enemy.x, y: enemy.y, dist };
            }
            return best;
        }, null);
    }

    /**
     * Fire bullets towards the target position.
     *
     * @param pool - The pool manager to spawn bullets
     * @param player - The player entity
     * @param target - Target position to fire at
     * @param state - Current game state (unused but kept for future extensions)
     * @param time - Current timestamp (unused but kept for future extensions)
     */
    private static fireBullets(
        pool: PoolManager,
        player: Player,
        target: NearestEnemy,
        _state: GameState,
        _time: number
    ): void {
        const luckBonus = player.luck * 0.02;
        const isSuperCrit = Math.random() < (player.critChance + luckBonus) * 0.2;
        const isCrit = !isSuperCrit && Math.random() < player.critChance + luckBonus;

        const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);

        let damage = player.baseDamage;
        if (isSuperCrit) {
            damage *= 4;
        } else if (isCrit) {
            damage *= 2;
        }

        // Fire all projectiles with spread
        for (let i = 0; i < player.projectiles; i++) {
            const spread = GAME_ENGINE.PROJECTILE_SPREAD;
            const angleOffset = (i - (player.projectiles - 1) / 2) * spread;
            const finalAngle = baseAngle + angleOffset;

            const bulletRadius = (isSuperCrit ? 12 : isCrit ? 8 : 4) * player.area;
            const bulletColor = isSuperCrit
                ? COLORS.SUPER_CRIT
                : isCrit
                    ? COLORS.CRIT
                    : COLORS.BULLET;

            pool.getBullet(
                player.x,
                player.y,
                Math.cos(finalAngle) * GAME_ENGINE.BULLET_SPEED,
                Math.sin(finalAngle) * GAME_ENGINE.BULLET_SPEED,
                damage,
                bulletRadius,
                bulletColor,
                isCrit,
                isSuperCrit
            );
        }
    }
}
