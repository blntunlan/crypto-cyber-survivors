import { MarketPosition } from '../types';
import { PoolManager } from './poolManager';
import { GAME_ENGINE } from '../constants';

export class SpawnSystem {
    public static update(
        deltaTime: number,
        spawnTimer: number,
        difficulty: number,
        width: number,
        height: number,
        position: MarketPosition,
        pool: PoolManager
    ): number {
        let newTimer = spawnTimer + deltaTime;

        const scaledDifficulty = 1 + (difficulty - 1) * GAME_ENGINE.SPAWN_DIFFICULTY_SCALE;

        if (newTimer > GAME_ENGINE.SPAWN_TIMER_BASE / scaledDifficulty) {
            const { x, y } = this.getRandomSpawnPosition(width, height);
            pool.getEnemy(x, y, difficulty, position);
            newTimer = 0;
        }
        return newTimer;
    }

    private static getRandomSpawnPosition(width: number, height: number) {
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

        return { x, y };
    }
}
