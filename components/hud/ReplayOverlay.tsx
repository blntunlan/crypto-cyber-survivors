/**
 * ReplayOverlay — Playback controls during replay
 */

import React, { useEffect, useState, useRef } from 'react';
import { EventBus } from '../../services/core/EventBus';
import { ReplayPlayerService } from '../../services/replay/ReplayPlayerService';
import { useTheme } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemedButton } from '../themed/ThemedButton';
import { COLORS } from '../../config/Colors';
import { cn } from '../../utils/classnames';

interface ReplayOverlayProps {
  onExit: () => void;
}

const PLAYBACK_SPEEDS = [1, 2, 4] as const;

export const ReplayOverlay: React.FC<ReplayOverlayProps> = ({ onExit }) => {
  const [speed, setSpeed] = useState(1);
  const progressTextRef = useRef<HTMLSpanElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const { isRetro } = useTheme();
  const { t } = useLanguage();

  const formatTime = (pct: number) => {
    const replay = ReplayPlayerService.getReplay();
    if (!replay) return '0:00';
    const ms = pct * replay.duration;
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  const totalTime = () => {
    const replay = ReplayPlayerService.getReplay();
    if (!replay) return '0:00';
    const s = Math.floor(replay.duration / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  useEffect(() => {
    const unsub = EventBus.on('replayTick', data => {
      const pct = data.progress;
      if (progressTextRef.current) {
        progressTextRef.current.textContent = `${formatTime(pct)} / ${totalTime()}`;
      }
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${Math.min(100, pct * 100)}%`;
      }
    });
    return () => unsub();
  }, []);

  const setPlaybackSpeed = (s: number) => {
    setSpeed(s);
    ReplayPlayerService.setSpeed(s);
  };

  return (
    <div
      className={cn(
        'absolute bottom-[calc(0.75rem+var(--sab))] left-1/2 z-[100] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2',
        isRetro
          ? 'border-2 border-[#39FF14]/40 bg-[#0a0a12]/95 font-retro-pixel'
          : 'cyber-glass rounded-lg border border-white/10 bg-slate-950/90 font-cyber'
      )}
    >
      <span
        className="text-[10px] font-black uppercase tracking-[0.2em]"
        style={{ color: isRetro ? COLORS.NEON_GREEN : COLORS.WHALE }}
      >
        {t('common.menu_pages.replays.playback_badge')}
      </span>

      <span
        ref={progressTextRef}
        className="whitespace-nowrap text-[10px] tabular-nums text-slate-400"
      >
        0:00 / {totalTime()}
      </span>

      {/* Progress bar */}
      <div
        className={cn(
          'h-1 w-14 overflow-hidden bg-slate-800 sm:w-28',
          !isRetro && 'rounded-full'
        )}
      >
        <div
          ref={progressBarRef}
          className={cn('h-full w-0', !isRetro && 'rounded-full')}
          style={{ backgroundColor: isRetro ? COLORS.NEON_GREEN : COLORS.WHALE }}
        />
      </div>

      {/* Speed buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {PLAYBACK_SPEEDS.map(s => (
          <ThemedButton
            key={s}
            intent="ghost"
            onClick={() => setPlaybackSpeed(s)}
            className={cn(
              'min-h-[44px] min-w-[38px] px-2 text-[10px] font-black uppercase tracking-[0.1em] touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-400',
              !isRetro && 'border',
              !isRetro &&
                (speed === s
                  ? 'border-[#B026FF]/60 bg-[#B026FF]/15 text-[#c4b5fd] shadow-[0_0_12px_rgba(176,38,255,0.25)]'
                  : 'border-white/10 text-slate-400 hover:text-white'),
              isRetro &&
                (speed === s
                  ? 'border-2 border-[#39FF14] text-[#39FF14]'
                  : 'border-2 border-white/20 text-slate-400')
            )}
          >
            {s}x
          </ThemedButton>
        ))}
      </div>

      <ThemedButton
        intent="ghost"
        onClick={onExit}
        className={cn(
          'min-h-[44px] px-2.5 text-[10px] font-black uppercase tracking-[0.15em] touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-red-400',
          isRetro
            ? 'border-2 border-red-500/60 text-red-400'
            : 'border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300'
        )}
      >
        {t('common.menu_pages.replays.exit')}
      </ThemedButton>
    </div>
  );
};
