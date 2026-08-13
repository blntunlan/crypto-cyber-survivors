import { type DirectorZoneView, type GameState, type Player } from '../../types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type IRenderer, type RenderOptions } from './types';

const ZONE_COLORS: Readonly<Record<DirectorZoneView['kind'], string>> = {
  SAFE_LANE: '#22c55e',
  HAZARD: '#ef4444',
  SHRINKING_SAFE: '#f59e0b',
  ROUTE_PRESSURE: '#a855f7',
  VISION_STRESS: '#0ea5e9',
  ALPHA_TARGET: '#eab308',
};

const TELEGRAPH_ALPHA = 0.22;
const ACTIVE_ALPHA = 0.16;
const FADE_ALPHA = 0.06;
const TELEGRAPH_DASH: readonly number[] = [12, 8];

/**
 * Draws Director zones so no area effect is ever invisible (§19: a market event
 * cannot start a mechanical effect without a telegraph). The telegraph phase
 * uses a pulsing dashed outline; the active phase fills.
 */
export class ZoneRenderer implements IRenderer {
  public render(
    ctx: CanvasRenderingContext2D,
    _pool: IPoolManager,
    state: GameState,
    _player: Player,
    opts: RenderOptions
  ): void {
    const zones = state.directorZones;
    if (zones === undefined || zones.length === 0) return;

    for (let index = 0; index < zones.length; index += 1) {
      const zone = zones[index];
      if (zone?.active !== true) continue;
      this.drawZone(ctx, zone, opts);
    }
  }

  private drawZone(
    ctx: CanvasRenderingContext2D,
    zone: DirectorZoneView,
    opts: RenderOptions
  ): void {
    const color = ZONE_COLORS[zone.kind];
    const isTelegraph = zone.phase === 'TELEGRAPH';
    const alpha =
      zone.phase === 'ACTIVE'
        ? ACTIVE_ALPHA
        : isTelegraph
          ? TELEGRAPH_ALPHA
          : FADE_ALPHA;

    ctx.save();
    ctx.globalAlpha = alpha * (opts.graphics.reducedMotion === true ? 0.7 : 1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = isTelegraph ? 3 : 2;
    if (isTelegraph) ctx.setLineDash(TELEGRAPH_DASH as number[]);

    ctx.beginPath();
    if (zone.shape === 'CIRCLE') {
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    } else {
      this.traceLane(ctx, zone);
    }
    if (!isTelegraph) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private traceLane(ctx: CanvasRenderingContext2D, zone: DirectorZoneView): void {
    const directionX = Math.cos(zone.angle);
    const directionY = Math.sin(zone.angle);
    const normalX = -directionY * zone.radius;
    const normalY = directionX * zone.radius;
    const endX = zone.x + directionX * zone.length;
    const endY = zone.y + directionY * zone.length;

    ctx.moveTo(zone.x + normalX, zone.y + normalY);
    ctx.lineTo(endX + normalX, endY + normalY);
    ctx.lineTo(endX - normalX, endY - normalY);
    ctx.lineTo(zone.x - normalX, zone.y - normalY);
    ctx.closePath();
  }
}
