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
import { ThemedPanel } from '../themed/ThemedPanel';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { t } = useLanguage();

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
        reserveBackButtonSpace
        title={t('common.menu.replays') as string}
        subtitle={t('common.menu_pages.replays.subtitle') as string}
      >
        <div className="space-y-4">
          <OverlaySectionRail
            label={t('common.menu_pages.replays.section_saved') as string}
            color={COLORS.WHALE}
          />

          {loading && (
            <ThemedPanel className="px-4 py-10 text-center font-cyber text-slate-500">
              {t('common.menu_pages.replays.loading')}
            </ThemedPanel>
          )}

          {!loading && replays.length === 0 && (
            <ThemedPanel className="px-4 py-10 text-center font-cyber text-slate-500">
              {t('common.menu_pages.replays.empty_state')}
            </ThemedPanel>
          )}

          <div className="space-y-3">
            {replays.map(replay => (
              <ThemedPanel
                key={replay.id}
                className={cn(
                  'flex flex-col gap-4 overflow-hidden p-4 transition-all sm:flex-row sm:items-center sm:justify-between',
                  isRetro ? 'font-retro-pixel' : 'font-cyber'
                )}
                style={{
                  background: !isRetro
                    ? `linear-gradient(120deg, ${COLORS.WHALE}10, rgba(2,6,23,0.85))`
                    : undefined,
                }}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-cyber text-sm font-black uppercase tracking-[0.2em] text-white">
                      {t('common.menu_pages.replays.score', {
                        value: replay.score.toLocaleString(),
                      })}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {t('common.menu_pages.replays.duration', {
                        value: formatDuration(replay.durationMs),
                      })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                    {replay.finalLevel ? (
                      <span>
                        {t('common.menu_pages.replays.level', {
                          value: replay.finalLevel,
                        })}
                      </span>
                    ) : null}
                    {replay.totalKills ? (
                      <span>
                        {t('common.menu_pages.replays.kills', {
                          value: replay.totalKills.toLocaleString(),
                        })}
                      </span>
                    ) : null}
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
                  {t('common.menu_pages.replays.watch')}
                </ThemedButton>
              </ThemedPanel>
            ))}
          </div>
        </div>
      </OverlayChrome>
    </>
  );
};
