import { IRenderer, RenderOptions } from './types';
import { PoolManager } from '../poolManager';
import { GameState, Player } from '../../types';

export class BackgroundRenderer implements IRenderer {
    render(
        ctx: CanvasRenderingContext2D,
        _pool: PoolManager,
        state: GameState,
        _player: Player,
        opts: RenderOptions
    ): void {
        const { width, height } = opts;

        // Fill background color
        ctx.fillStyle = `rgb(${state.currentBg.r}, ${state.currentBg.g}, ${state.currentBg.b})`;
        ctx.fillRect(0, 0, width, height);

        // Draw background candles
        state.bgCandles.forEach(c => {
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = c.color;
            const rx = Math.round(c.x);
            const ry = Math.round(c.y);

            // Candle Body
            ctx.fillRect(rx, ry, Math.round(c.w), Math.round(c.h));

            // Candle Wick
            ctx.beginPath();
            ctx.moveTo(rx + Math.round(c.w / 2), ry - 5);
            ctx.lineTo(rx + Math.round(c.w / 2), ry + Math.round(c.h + 5));
            ctx.strokeStyle = c.color;
            ctx.stroke();
        });

        ctx.globalAlpha = 1;
    }

    /**
     * Update background candle positions based on market trend.
     */
    public updateCandles(
        state: GameState,
        pnl: number,
        difficulty: number,
        dtFactor: number,
        width: number,
        height: number
    ): void {
        const trendMultiplier = pnl >= 0 ? -1 : 1;

        state.bgCandles.forEach(c => {
            const volatilitySpeed = c.speed * (1 + difficulty / 1.5);
            c.y += volatilitySpeed * trendMultiplier * dtFactor;

            // Wrap around screen edges
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
}
