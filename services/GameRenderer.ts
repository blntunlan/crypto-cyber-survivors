import { GameStatus, Player, GameState } from '../types';
import { PoolManager } from './poolManager';

export class GameRenderer {
    public render(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        state: GameState,
        player: Player,
        pool: PoolManager,
        status: GameStatus
    ) {
        ctx.save();

        // 1. Screen Shake
        if (state.shake > 0) {
            ctx.translate(
                (Math.random() - 0.5) * state.shake,
                (Math.random() - 0.5) * state.shake
            );
        }

        // 2. Background
        this.drawBackground(ctx, width, height, state);

        // 3. Game World (Entities)
        if (status !== GameStatus.MENU) {
            this.drawCritFlash(ctx, width, height, state);
            this.drawParticles(ctx, pool);
            this.drawGems(ctx, pool);
            this.drawBullets(ctx, pool);
            this.drawEnemies(ctx, pool);
            this.drawFloatingTexts(ctx, pool);
            this.drawPlayer(ctx, player, state);


        }



        ctx.restore();
    }

    private drawBackground(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        state: GameState
    ) {
        // Fill background color
        ctx.fillStyle = `rgb(${state.currentBg.r}, ${state.currentBg.g}, ${state.currentBg.b})`;
        ctx.fillRect(0, 0, width, height);

        // Draw background candles
        state.bgCandles.forEach(c => {
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
    }

    /**
     * Update background candle positions based on market trend.
     * Candles move up when market is profitable (green), down when in loss (red).
     *
     * @param state - Current game state containing candle array
     * @param pnl - Current profit/loss value
     * @param difficulty - Market difficulty multiplier
     * @param dtFactor - Delta time factor for frame-rate independence
     * @param width - Canvas width for wrapping
     * @param height - Canvas height for wrapping
     */
    public updateBackgroundCandles(
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

    private drawCritFlash(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        state: GameState
    ) {
        if (state.critFlash <= 0) return;

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
        gradient.addColorStop(1, state.critFlashColor);
        ctx.globalAlpha = state.critFlash;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    private drawParticles(ctx: CanvasRenderingContext2D, pool: PoolManager) {
        pool.activeParticles.forEach(part => {
            ctx.globalAlpha = part.life;
            ctx.fillStyle = part.color;
            ctx.beginPath();
            ctx.arc(Math.round(part.x), Math.round(part.y), 2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    private drawGems(ctx: CanvasRenderingContext2D, pool: PoolManager) {
        pool.activeGems.forEach(g => {
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
    }

    private drawBullets(ctx: CanvasRenderingContext2D, pool: PoolManager) {
        pool.activeBullets.forEach(b => {
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
    }

    private drawEnemies(ctx: CanvasRenderingContext2D, pool: PoolManager) {
        pool.activeEnemies.forEach(e => {
            const ex = Math.round(e.x);
            const ey = Math.round(e.y);
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(ex, ey, e.radius, 0, Math.PI * 2);
            ctx.fill();

            // Health Bar
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
    }

    private drawFloatingTexts(ctx: CanvasRenderingContext2D, pool: PoolManager) {
        pool.activeFloatingTexts.forEach(t => {
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
    }

    private drawPlayer(ctx: CanvasRenderingContext2D, player: Player, state: GameState) {
        // Draw Dash Trail
        state.dashTrail.forEach((pos, i) => {
            ctx.globalAlpha = (i / state.dashTrail.length) * 0.4;
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(Math.round(pos.x), Math.round(pos.y), player.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        ctx.shadowBlur = 15;
        ctx.shadowColor = player.color;
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(Math.round(player.x), Math.round(player.y), player.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }


}
