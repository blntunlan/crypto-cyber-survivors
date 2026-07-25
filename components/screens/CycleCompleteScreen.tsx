/**
 * CycleCompleteScreen - Live server-signed cash-out offer.
 */

import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTheme } from '../../contexts/useTheme';
import { useThemeSize } from '../../hooks/useThemeSize';
import { COLORS } from '../../config/Colors';
import { Z_LAYERS } from '../../constants/ZIndex';
import { audio } from '../../services/audio';
import {
  IconSkull,
  IconTrendUp,
  IconTrendDown,
  IconTrophy,
  IconZap,
  IconBitcoin,
  IconMonitor,
} from '../icons/CardIcons';
import { type CashOutOfferData } from '../../types/gameMode';
import { Logger } from '../../services/system/Logger';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemedButton } from '../themed/ThemedButton';
import { OverlayChrome, OverlaySectionRail } from '../ui/OverlayChrome';
import { cn } from '../../utils/classnames';

interface CycleCompleteScreenProps {
  offer: CashOutOfferData;
  onCashOut: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
}

export function CycleCompleteScreen({
  offer,
  onCashOut,
  onReject,
}: CycleCompleteScreenProps): React.JSX.Element {
  const { isRetro } = useTheme();
  const sizes = useThemeSize();
  const { t } = useLanguage();
  const data = offer.cycle;

  const [timeRemaining, setTimeRemaining] = useState(() =>
    Math.max(0, Math.ceil(offer.quote.expiresAtSeconds - Date.now() / 1_000))
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(0);
  const hasSelectedRef = useRef(false);
  const onCashOutEvent = useEffectEvent(onCashOut);
  const onRejectEvent = useEffectEvent(onReject);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    Logger.info('[CycleCompleteScreen] Mounted');
    audio.playLevelUp();
  }, []);

  useEffect(() => {
    let timerId: number | null = null;
    const updateRemaining = (): void => {
      const remaining = Math.max(
        0,
        Math.ceil(offer.quote.expiresAtSeconds - Date.now() / 1_000)
      );
      setTimeRemaining(remaining);
      if (remaining > 0) {
        timerId = window.setTimeout(updateRemaining, 1_000);
      }
    };

    updateRemaining();
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [offer.quote.expiresAtSeconds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasSelectedRef.current) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'a':
        case 'A':
        case 'ArrowLeft':
        case 'w':
        case 'W':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = prev > 0 ? prev - 1 : 1;
            audio.playSlotTick(0.5);
            return newIndex;
          });
          break;
        case 'd':
        case 'D':
        case 'ArrowRight':
        case 's':
        case 'S':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = prev < 1 ? prev + 1 : 0;
            audio.playSlotTick(0.5);
            return newIndex;
          });
          break;
        case ' ':
        case 'Enter': {
          e.preventDefault();
          const currentIdx = selectedIndexRef.current;
          hasSelectedRef.current = true;
          audio.playButton();
          if (currentIdx === 0) {
            void onCashOutEvent();
          } else {
            void onRejectEvent();
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pnlColor = data.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;
  return (
    <OverlayChrome
      zIndex={Z_LAYERS.CYCLE_COMPLETE}
      maxWidthClassName="max-w-3xl"
      title={
        t('common.cycle_complete_screen.title', { val: data.cycleNumber }) as string
      }
      subtitle={t('common.cycle_complete_screen.subtitle') as string}
      accentColor={COLORS.JACKPOT_YELLOW}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 text-sm uppercase tracking-[0.16em] text-slate-300">
          <span>Greed {offer.greedLevel}</span>
          <span className="font-numbers text-2xl font-black text-yellow-400">
            {timeRemaining}s
          </span>
        </div>

        <section className="space-y-3">
          <OverlaySectionRail
            label={t('common.cycle_complete_screen.subtitle') as string}
            color={COLORS.JACKPOT_YELLOW}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <StatBox
              label={t('common.cycle_complete_screen.time_survived')}
              value={formatTime(data.survivalTimeSeconds)}
              isRetro={isRetro}
              icon={
                <IconMonitor
                  className={isRetro ? 'h-5 w-5' : 'h-6 w-6'}
                  color={COLORS.ELECTRIC_BLUE}
                />
              }
            />
            <StatBox
              label={t('common.cycle_complete_screen.level_reached')}
              value={data.level.toString()}
              isRetro={isRetro}
              icon={
                <IconTrophy
                  className={isRetro ? 'h-5 w-5' : 'h-6 w-6'}
                  color={COLORS.JACKPOT_YELLOW}
                />
              }
            />
            <StatBox
              label={t('common.cycle_complete_screen.total_kills')}
              value={data.totalKills.toString()}
              isRetro={isRetro}
              icon={
                <IconSkull
                  className={isRetro ? 'h-5 w-5' : 'h-6 w-6'}
                  color={COLORS.CASINO_RED}
                />
              }
            />
            <StatBox
              label={t('common.cycle_complete_screen.pnl_performance')}
              value={`${data.effectivePnl >= 0 ? '+' : ''}${(data.effectivePnl * 100).toFixed(1)}%`}
              isRetro={isRetro}
              valueColor={pnlColor}
              icon={
                data.effectivePnl >= 0 ? (
                  <IconTrendUp
                    className={isRetro ? 'h-5 w-5' : 'h-6 w-6'}
                    color={COLORS.PUMP_GREEN}
                  />
                ) : (
                  <IconTrendDown
                    className={isRetro ? 'h-5 w-5' : 'h-6 w-6'}
                    color={COLORS.DUMP_ORANGE}
                  />
                )
              }
            />
          </div>
        </section>

        <section className="space-y-3">
          <OverlaySectionRail
            label={t('common.cycle_complete_screen.coins_earned')}
            color={COLORS.JACKPOT_YELLOW}
          />
          <div
            className={cn(
              'space-y-3 p-4',
              isRetro
                ? 'border-2 border-yellow-500/50 bg-[#0a0a12]/80'
                : 'rounded-sm border border-yellow-500/20 bg-yellow-500/5'
            )}
          >
            <span className="font-cyber text-sm font-black uppercase tracking-[0.18em] text-slate-300">
              {t('common.cycle_complete_screen.cycle_reward') as string}
            </span>
            <div
              className={`${sizes.heading} font-cyber font-black`}
              style={{ color: COLORS.JACKPOT_YELLOW }}
            >
              {offer.quote.rewardPoints.toLocaleString()} META
            </div>
          </div>
        </section>

        <div
          className={cn(
            'px-4 py-3 text-center text-sm uppercase tracking-[0.16em]',
            isRetro
              ? 'border-2 border-orange-500/50 bg-orange-500/10 text-orange-400'
              : 'rounded-sm border border-orange-500/40 bg-orange-500/10 text-orange-400'
          )}
        >
          Greed {offer.greedLevel + 1}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ThemedButton
            intent="primary"
            onClick={() => {
              if (hasSelectedRef.current) return;
              hasSelectedRef.current = true;
              audio.playButton();
              void onCashOut();
            }}
            className={cn(
              'min-h-[52px] text-xs font-black uppercase tracking-[0.22em] transition-transform',
              selectedIndex === 0 &&
                'scale-[1.03] ring-2 ring-yellow-400 ring-offset-2 ring-offset-black/80'
            )}
          >
            <span className="inline-flex items-center gap-2">
              <IconBitcoin className="h-5 w-5" color="currentColor" />
              {t('common.cycle_complete_screen.cash_out')}
            </span>
          </ThemedButton>

          <ThemedButton
            intent="secondary"
            onClick={() => {
              if (hasSelectedRef.current) return;
              hasSelectedRef.current = true;
              audio.playButton();
              void onReject();
            }}
            className={cn(
              'min-h-[52px] text-xs font-black uppercase tracking-[0.22em] transition-transform',
              selectedIndex === 1 &&
                'scale-[1.03] ring-2 ring-yellow-400 ring-offset-2 ring-offset-black/80'
            )}
          >
            <span className="inline-flex items-center gap-2">
              <IconZap
                className="h-5 w-5"
                color={isRetro ? COLORS.NEON_GREEN : 'currentColor'}
              />
              {t('common.cycle_complete_screen.continue')}
            </span>
          </ThemedButton>
        </div>
      </div>
    </OverlayChrome>
  );
}

function StatBox({
  label,
  value,
  isRetro,
  valueColor,
  icon,
}: {
  label: string;
  value: string;
  isRetro?: boolean;
  valueColor?: string;
  icon?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'relative overflow-hidden p-4',
        isRetro
          ? 'border-2 border-[#39FF14]/30 bg-[#0a0a12]/80'
          : 'rounded-sm border border-white/10 bg-white/5 backdrop-blur-sm'
      )}
    >
      <div className="pointer-events-none absolute -bottom-2 -right-2 scale-150 opacity-10">
        {icon}
      </div>

      <div className="relative z-10 mb-2 flex items-center gap-2">
        <div className="origin-left scale-75 opacity-80">{icon}</div>
        <div
          className={cn(
            isRetro ? 'font-retro-pixel' : 'font-cyber',
            'text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400'
          )}
        >
          {label}
        </div>
      </div>

      <div
        className={cn(
          isRetro ? 'font-retro-pixel' : 'font-cyber',
          'relative z-10 text-xl font-black tracking-tight'
        )}
        style={{ color: valueColor ?? COLORS.TEXT }}
      >
        {value}
      </div>
    </div>
  );
}
