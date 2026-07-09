import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ReplayOverlay } from '../hud/ReplayOverlay';
import { ReplayPlayerService } from '../../services/replay/ReplayPlayerService';
import { EntityRenderer } from '../../services/renderers/EntityRenderer';
import { type PlaybackTickResult } from '../../types/replayPlayback';
import { COLORS } from '../../config/Colors';
import { Z_LAYERS } from '../../constants/ZIndex';
import { useTheme } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../utils/classnames';
import {
  MODERN_PANEL_FRAME,
  MODERN_PANEL_TOP_ACCENT,
} from '../../config/modernSurface';

/** Single EntityRenderer instance for replay rendering (stateless, safe to reuse). */
const entityRenderer = new EntityRenderer();

interface ReplayPlaybackScreenProps {
  onExit: () => void;
}

const normalizeCoordinate = (value: number, size: number): number => {
  if (size <= 0) return 0;
  return ((value % size) + size) % size;
};

const drawGrid = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  context.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  context.lineWidth = 1;

  for (let gridX = 0; gridX < width; gridX += 80) {
    context.beginPath();
    context.moveTo(gridX, 0);
    context.lineTo(gridX, height);
    context.stroke();
  }

  for (let gridY = 0; gridY < height; gridY += 80) {
    context.beginPath();
    context.moveTo(0, gridY);
    context.lineTo(width, gridY);
    context.stroke();
  }
};

const drawReplayFrame = (
  canvas: HTMLCanvasElement,
  tickResult: PlaybackTickResult
): void => {
  const context = canvas.getContext('2d');
  if (!context) return;

  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  const backgroundGradient = context.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) / 1.4
  );
  backgroundGradient.addColorStop(0, 'rgba(30, 41, 59, 0.95)');
  backgroundGradient.addColorStop(1, '#020617');
  context.fillStyle = backgroundGradient;
  context.fillRect(0, 0, width, height);

  drawGrid(context, width, height);

  // Draw reconstructed enemies (behind ghost player)
  if (tickResult.enemies && tickResult.enemies.length > 0) {
    entityRenderer.drawReplayEnemies(context, tickResult.enemies, width, height);
  }

  if (!tickResult.ghost) return;

  const ghostX = normalizeCoordinate(tickResult.ghost.x, width);
  const ghostY = normalizeCoordinate(tickResult.ghost.y, height);

  context.shadowColor = tickResult.ghost.color;
  context.shadowBlur = 24;
  context.fillStyle = tickResult.ghost.color;
  context.globalAlpha = tickResult.ghost.alpha;
  context.beginPath();
  context.arc(ghostX, ghostY, 16, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 1;
  context.shadowBlur = 0;
  context.strokeStyle = COLORS.CASINO_GOLD;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(ghostX, ghostY, 22, 0, Math.PI * 2);
  context.stroke();
};

export const ReplayPlaybackScreen: React.FC<ReplayPlaybackScreenProps> = ({
  onExit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const { isRetro } = useTheme();
  const { t } = useLanguage();
  const replay = ReplayPlayerService.getReplay();
  const accentColor = isRetro ? COLORS.NEON_GREEN : COLORS.WHALE;

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    const replay = ReplayPlayerService.getReplay();
    const canvas = canvasRef.current;

    if (!replay || !canvas) {
      onExit();
      return undefined;
    }

    const renderFrame = (timestamp: number) => {
      const previousTime = lastFrameTimeRef.current ?? timestamp;
      const deltaTime = Math.min(100, timestamp - previousTime);
      lastFrameTimeRef.current = timestamp;

      const tickResult = ReplayPlayerService.tick(deltaTime);
      drawReplayFrame(canvas, tickResult);

      if (tickResult.done) {
        setIsComplete(true);
        frameRef.current = null;
        return;
      }

      frameRef.current = requestAnimationFrame(renderFrame);
    };

    frameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
    };
  }, [onExit]);

  return (
    <div
      className={cn(
        'fixed inset-0 overflow-hidden bg-slate-950 text-white',
        isRetro ? 'font-retro-pixel' : 'font-cyber'
      )}
      style={{ zIndex: Z_LAYERS.CYCLE_COMPLETE }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />

      <div
        className={cn(
          'pointer-events-none absolute left-[calc(1rem+var(--sal))] top-[calc(1rem+var(--sat))] px-3 py-2 sm:px-4 sm:py-3',
          isRetro
            ? 'border-2 bg-[#0a0a12]/90'
            : 'cyber-glass rounded-lg border bg-slate-950/80'
        )}
        style={{ borderColor: `${accentColor}4D` }}
      >
        <div
          className="text-[10px] font-black uppercase tracking-[0.22em] sm:text-xs"
          style={{ color: accentColor }}
        >
          {t('common.menu_pages.replays.playback_badge')}
        </div>
        {replay && (
          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
            {t('common.menu_pages.replays.playback_stats', {
              level: replay.finalLevel,
              kills: replay.totalKills.toLocaleString(),
            })}
          </div>
        )}
      </div>

      {isComplete && (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-4 top-1/2 mx-auto max-w-sm -translate-y-1/2 px-6 py-5 text-center',
            isRetro
              ? 'border-2 border-[#39FF14]/60 bg-[#0a0a12]/95'
              : MODERN_PANEL_FRAME
          )}
        >
          {!isRetro && (
            <div
              className={MODERN_PANEL_TOP_ACCENT}
              style={{ boxShadow: `0 0 20px ${accentColor}40` }}
            />
          )}
          <div
            className="text-sm font-black uppercase tracking-[0.24em]"
            style={{ color: accentColor }}
          >
            {t('common.menu_pages.replays.playback_complete')}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {t('common.menu_pages.replays.playback_complete_hint')}
          </div>
        </div>
      )}

      <ReplayOverlay onExit={onExit} />
    </div>
  );
};
