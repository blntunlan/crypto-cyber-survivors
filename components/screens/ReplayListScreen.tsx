/**
 * ReplayListScreen — Browse and watch replays
 */

import React, { useEffect, useState } from 'react';
import { ReplayPlayerService } from '../../services/replay/ReplayPlayerService';
import { type ReplaySummary } from '../../types/replayPlayback';
import { useTheme } from '../../contexts/useTheme';
import { ThemedButton } from '../themed/ThemedButton';
import {
  OverlayBackButton,
  OverlayChrome,
  OverlaySectionRail,
} from '../ui/OverlayChrome';
import { COLORS } from '../../config/Colors';
import { cn } from '../../utils/classnames';

interface ReplayListScreenProps {
  onBack: () => void;
  onWatch: (replayId: string) => void;
}

export const ReplayListScreen: React.FC<ReplayListScreenProps> = ({
  onBack,
  onWatch,
}) => {
  const [replays, setReplays] = useState<ReplaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { isRetro } = useTheme();

  useEffect(() => {
    const load = async () => {
      const data = await ReplayPlayerService.fetchMyReplays();
      setReplays(data);
      setLoading(false);
    };
    void load();
  }, []);

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <>
      <OverlayBackButton onClick={onBack} />
      <OverlayChrome
        zIndex={200}
        maxWidthClassName="max-w-5xl"
        title="Replays"
        subtitle="Review previous runs without leaving the terminal layer"
      >
        <div className="space-y-4">
          <OverlaySectionRail label="Saved Sessions" color={COLORS.WHALE} />

          {loading && (
            <div className="rounded-sm border border-white/10 bg-white/5 px-4 py-10 text-center text-slate-500">
              Loading replays...
            </div>
          )}

          {!loading && replays.length === 0 && (
            <div className="rounded-sm border border-white/10 bg-white/5 px-4 py-10 text-center text-slate-500">
              No replays yet. Complete a run to save one.
            </div>
          )}

          <div className="space-y-3">
            {replays.map(replay => (
              <div
                key={replay.id}
                className={cn(
                  'flex flex-col gap-4 overflow-hidden p-4 transition-all sm:flex-row sm:items-center sm:justify-between',
                  isRetro
                    ? 'border-2 border-[#39FF14]/40 bg-[#0a0a12]/80'
                    : 'rounded-sm border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                )}
                style={{
                  backgroundColor: !isRetro ? `${COLORS.WHALE}08` : undefined,
                }}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-cyber text-sm font-black uppercase tracking-[0.2em] text-white">
                      Score {replay.score}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Duration {formatDuration(replay.durationMs)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                    {replay.finalLevel ? <span>Level {replay.finalLevel}</span> : null}
                    {replay.totalKills ? <span>{replay.totalKills} kills</span> : null}
                    <span>{new Date(replay.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <ThemedButton
                  intent="secondary"
                  onClick={() => onWatch(replay.id)}
                  className={cn(
                    'min-h-[44px] shrink-0 px-5 text-xs font-black uppercase tracking-[0.22em]',
                    !isRetro && 'border-[#8b5cf6]/30 text-[#c4b5fd] hover:text-white'
                  )}
                >
                  Watch
                </ThemedButton>
              </div>
            ))}
          </div>
        </div>
      </OverlayChrome>
    </>
  );
};
