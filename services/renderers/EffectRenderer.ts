import { IRenderer, RenderOptions } from './types';
import { PoolManager } from '../poolManager';
import { GameState, Player } from '../../types';

export class EffectRenderer implements IRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    pool: PoolManager,
    state: GameState,
    _player: Player,
    opts: RenderOptions
  ): void {
    const { width, height, graphics } = opts;

    this.drawCritFlash(ctx, width, height, state);

    // Only draw particles if enabled
    if (graphics.showParticles) {
      this.drawParticles(ctx, pool);
    }

    // Only draw damage/floating texts if enabled
    if (graphics.showDamageNumbers) {
      this.drawFloatingTexts(ctx, pool);
    }
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
}
