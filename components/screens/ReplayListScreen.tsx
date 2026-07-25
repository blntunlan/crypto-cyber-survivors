/**
 * ReplayListScreen — Browse and watch replays
 */

import React, { useEffect, useState } from 'react';
import { ReplayPlayerService } from '../../services/replay/ReplayPlayerService';
import { type ReplaySummary } from '../../types/replayPlayback';
import { ThemedButton } from '../themed/ThemedButton';
import {
  OverlayBackButton,
  OverlayChrome,
  OverlaySectionRail,
} from '../ui/OverlayChrome';
import { COLORS } from '../../config/Colors';
import { ThemedPanel } from '../themed/ThemedPanel';
import { useLanguage } from '../../contexts/LanguageContext';
import { StatePanel } from '../ui/StatePanel';

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
            <StatePanel
              state="loading"
              title={t('common.menu_pages.replays.loading')}
            />
          )}

          {!loading && replays.length === 0 && (
            <StatePanel
              state="empty"
              title={t('common.menu_pages.replays.empty_state')}
            />
          )}

          <div className="space-y-3">
            {replays.map(replay => (
              <ThemedPanel
                key={replay.id}
                padding="md"
                surface="raised"
                className="flex flex-col gap-4 overflow-hidden sm:flex-row sm:items-center sm:justify-between"
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
                  className="shrink-0"
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
