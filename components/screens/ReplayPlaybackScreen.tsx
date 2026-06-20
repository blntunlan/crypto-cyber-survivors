import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ReplayOverlay } from '../hud/ReplayOverlay';
import { ReplayPlayerService } from '../../services/replay/ReplayPlayerService';
import { type PlaybackData, type PlaybackTickResult } from '../../types/replayPlayback';
import { COLORS } from '../../config/Colors';
import { Z_LAYERS } from '../../constants/ZIndex';

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
  replay: PlaybackData,
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

  const progress = tickResult.progress ?? 0;
  context.fillStyle = 'rgba(148, 163, 184, 0.72)';
  context.font = '12px monospace';
  context.fillText(`SESSION ${replay.sessionId}`, 24, 34);
  context.fillText(
    `LVL ${replay.finalLevel} · KILLS ${replay.totalKills} · ${Math.round(progress * 100)}%`,
    24,
    54
  );

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
      drawReplayFrame(canvas, replay, tickResult);

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
      className="fixed inset-0 overflow-hidden bg-slate-950 font-mono text-white"
      style={{ zIndex: Z_LAYERS.CYCLE_COMPLETE }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-6 top-6 rounded border border-violet-400/30 bg-slate-950/75 px-4 py-3 text-xs uppercase tracking-[0.22em] text-violet-200">
        Replay Playback
      </div>

      {isComplete && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto max-w-sm -translate-y-1/2 rounded border border-emerald-400/40 bg-slate-950/85 px-6 py-4 text-center">
          <div className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">
            Replay Complete
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Use EXIT to return to the terminal.
          </div>
        </div>
      )}

      <ReplayOverlay onExit={onExit} />
    </div>
  );
};
