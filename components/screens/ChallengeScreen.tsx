/**
 * ChallengeScreen — Daily/Weekly challenge selection
 */

import React, { useEffect, useState } from 'react';
import { ChallengeService } from '../../services/challenges/ChallengeService';
import { EventBus } from '../../services/core/EventBus';
import { type ChallengeDefinition, type ChallengeStatus } from '../../types/challenge';
import { useTheme } from '../../contexts/useTheme';
import { useThemeSize } from '../../hooks/useThemeSize';
import { ThemedButton } from '../themed/ThemedButton';
import { ThemedPanel } from '../themed/ThemedPanel';
import {
  OverlayBackButton,
  OverlayChrome,
  OverlaySectionRail,
} from '../ui/OverlayChrome';
import { COLORS } from '../../config/Colors';
import { cn } from '../../utils/classnames';
import { useLanguage } from '../../contexts/LanguageContext';

interface ChallengeScreenProps {
  onBack: () => void;
}

const ChallengeCard: React.FC<{
  challenge: ChallengeDefinition;
  completed: boolean;
  onSelect: (c: ChallengeDefinition) => void;
}> = ({ challenge, completed, onSelect }) => {
  const { isRetro } = useTheme();
  const sizes = useThemeSize();
  const { t } = useLanguage();
  const accentColor = challenge.type === 'daily' ? COLORS.CASINO_GOLD : COLORS.WHALE;
  const contractLabel =
    challenge.type === 'daily'
      ? (t('common.menu_pages.challenges.daily_contract') as string)
      : (t('common.menu_pages.challenges.weekly_contract') as string);

  return (
    <ThemedPanel
      className={cn(
        'relative overflow-hidden p-4 transition-all duration-200 sm:p-5',
        isRetro ? 'font-retro-pixel' : 'font-cyber',
        completed && !isRetro && 'ring-1 ring-emerald-400/50'
      )}
      style={{
        borderColor: completed && isRetro ? COLORS.PUMP_GREEN : undefined,
        background: !isRetro
          ? `linear-gradient(135deg, ${accentColor}12, rgba(2,6,23,0.85))`
          : undefined,
      }}
    >
      {!isRetro && (
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
          style={{ boxShadow: `0 0 14px ${accentColor}35` }}
        />
      )}

      <OverlaySectionRail label={contractLabel} color={accentColor} className="mb-3" />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3
            className={cn(
              isRetro ? 'font-retro-pixel' : 'font-cyber',
              'text-base font-black uppercase tracking-wide text-white sm:text-lg'
            )}
          >
            {challenge.name}
          </h3>
          <p className={cn(sizes.small, 'mt-1 text-slate-400')}>
            {challenge.description}
          </p>
        </div>
        {completed && (
          <span
            className={cn(
              isRetro ? 'font-retro-pixel' : 'font-cyber',
              'shrink-0 text-[10px] font-black uppercase tracking-[0.2em]'
            )}
            style={{ color: COLORS.PUMP_GREEN }}
          >
            {t('common.menu_pages.challenges.cleared')}
          </span>
        )}
      </div>

      {challenge.constraints.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {challenge.constraints.map((constraint, index) => (
            <span
              key={`${constraint.type}-${index}`}
              className={cn(
                isRetro ? 'font-retro-pixel' : 'font-cyber',
                'border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]'
              )}
              style={{
                borderColor: `${COLORS.NEON_ORANGE}88`,
                color: COLORS.NEON_ORANGE,
                backgroundColor: `${COLORS.NEON_ORANGE}10`,
              }}
            >
              {constraint.type}: {String(constraint.value)}
            </span>
          ))}
        </div>
      )}

      <div className="mb-4 space-y-2">
        {challenge.objectives.map((objective, index) => (
          <div
            key={`${objective.type}-${index}`}
            className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-sm text-slate-300"
          >
            <span className="uppercase tracking-[0.12em] text-slate-500">
              {objective.type.replace(/_/g, ' ')}
            </span>
            <span className="font-numbers font-bold text-white">
              {objective.target}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between rounded-sm border border-white/10 bg-slate-950/50 px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          {t('common.menu_pages.challenges.reward_label')}
        </span>
        <span className="font-cyber text-sm font-black uppercase tracking-[0.12em] text-[#FFD600]">
          {t('common.menu_pages.challenges.reward_value', {
            meta: challenge.reward.metaCoins.toLocaleString(),
            xp: challenge.reward.bonusXp.toLocaleString(),
          })}
        </span>
      </div>

      {!completed ? (
        <ThemedButton
          intent="primary"
          onClick={() => onSelect(challenge)}
          className="min-h-[46px] w-full text-xs font-black uppercase tracking-[0.22em]"
        >
          {t('common.menu_pages.challenges.activate')}
        </ThemedButton>
      ) : (
        <div className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
          {t('common.menu_pages.challenges.completed_label')}
        </div>
      )}
    </ThemedPanel>
  );
};

export const ChallengeScreen: React.FC<ChallengeScreenProps> = ({ onBack }) => {
  const [daily, setDaily] = useState<ChallengeDefinition | null>(null);
  const [weekly, setWeekly] = useState<ChallengeDefinition | null>(null);
  const [status, setStatus] = useState<ChallengeStatus>({
    dailyCompleted: false,
    weeklyCompleted: false,
  });
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const load = async () => {
      const [d, w, s] = await Promise.all([
        ChallengeService.fetchTodayChallenge(),
        ChallengeService.fetchWeeklyChallenge(),
        ChallengeService.fetchStatus(),
      ]);
      setDaily(d);
      setWeekly(w);
      setStatus(s);
      setLoading(false);
    };
    void load();
  }, []);

  const selectChallenge = (challenge: ChallengeDefinition) => {
    ChallengeService.setActiveChallenge(challenge);
    EventBus.emit('gameNotification', {
      title: t('common.menu_pages.challenges.toast_title') as string,
      message: challenge.name,
      type: 'info',
    });
    onBack();
  };

  return (
    <>
      <OverlayBackButton onClick={onBack} />
      <OverlayChrome
        zIndex={200}
        maxWidthClassName="max-w-5xl"
        title={t('common.menu.challenges') as string}
        subtitle={t('common.menu_pages.challenges.subtitle') as string}
      >
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {loading && (
              <ThemedPanel className="px-4 py-10 text-center font-cyber text-slate-500 lg:col-span-2">
                {t('common.menu_pages.challenges.loading')}
              </ThemedPanel>
            )}
            {!loading && daily && (
              <ChallengeCard
                challenge={daily}
                completed={status.dailyCompleted}
                onSelect={selectChallenge}
              />
            )}
            {!loading && weekly && (
              <ChallengeCard
                challenge={weekly}
                completed={status.weeklyCompleted}
                onSelect={selectChallenge}
              />
            )}
          </div>

          {!loading && !daily && !weekly && (
            <ThemedPanel className="px-4 py-10 text-center font-cyber text-slate-500">
              {t('common.menu_pages.challenges.empty_state')}
            </ThemedPanel>
          )}
        </div>
      </OverlayChrome>
    </>
  );
};
