/**
 * CycleCompleteScreen - Displayed when a 5-minute cycle ends in COMPETITIVE mode
 */

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/useTheme';
import { useThemeSize } from '../../hooks/useThemeSize';
import { CoinService, type CoinCalculation } from '../../services/gameplay/CoinService';
import { ComboSystem } from '../../services/combat/ComboSystem';
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
import { type CycleCompleteData } from '../../types/gameMode';
import { Logger } from '../../services/system/Logger';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemedButton } from '../themed/ThemedButton';
import { OverlayChrome, OverlaySectionRail } from '../ui/OverlayChrome';
import { cn } from '../../utils/classnames';

interface CycleCompleteScreenProps {
  data: CycleCompleteData;
  onCashOut: () => void | Promise<void>;
  onContinue: () => void | Promise<void>;
}

export function CycleCompleteScreen({
  data,
  onCashOut,
  onContinue,
}: CycleCompleteScreenProps): React.JSX.Element {
  const { isRetro } = useTheme();
  const sizes = useThemeSize();
  const { t } = useLanguage();

  const [coinCalculation, setCoinCalculation] = useState<CoinCalculation | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    Logger.info('[CycleCompleteScreen] Mounted');
  }, []);

  useEffect(() => {
    const calc = CoinService.calculateCycleReward({
      survivalTimeSeconds: data.survivalTimeSeconds,
      kills: data.totalKills,
      level: data.level,
      pnl: data.effectivePnl,
      maxStreak: ComboSystem.getMaxStreak(),
    });
    setCoinCalculation(calc);
    audio.playLevelUp();
  }, [data]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pnlColor = data.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;
  const continueRisk = Math.min(0.5 + data.cycleNumber * 0.1, 0.9);

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

        {coinCalculation && (
          <section className="space-y-3">
            <OverlaySectionRail
              label={t('common.cycle_complete_screen.coins_earned')}
              color={COLORS.JACKPOT_YELLOW}
            />
            <div
              className={cn(
                'space-y-3 p-4',
                isRetro
                  ? 'border-2 border-[#FFD600]/50 bg-[#0a0a12]/80'
                  : 'rounded-sm border border-[#FFD600]/20 bg-[#FFD600]/5'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-cyber text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                  Cycle reward
                </span>
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="text-xs uppercase tracking-[0.18em] text-slate-400 underline"
                >
                  {showBreakdown
                    ? t('common.cycle_complete_screen.hide')
                    : t('common.cycle_complete_screen.details')}
                </button>
              </div>
              <div
                className={`${sizes.heading} font-cyber font-black`}
                style={{ color: COLORS.JACKPOT_YELLOW }}
              >
                {coinCalculation.total.toLocaleString()} META
              </div>
              {showBreakdown && (
                <div className="space-y-2 border-t border-white/10 pt-3">
                  {Object.entries(coinCalculation.breakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="uppercase tracking-[0.12em] text-slate-500">
                        {key}
                      </span>
                      <span className="font-numbers font-bold text-slate-100">
                        +{value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <div
          className={cn(
            'rounded-sm border px-4 py-3 text-center text-sm uppercase tracking-[0.16em]',
            isRetro ? 'border-2' : ''
          )}
          style={{
            backgroundColor: `${COLORS.DUMP_ORANGE}10`,
            borderColor: `${COLORS.DUMP_ORANGE}66`,
            color: COLORS.DUMP_ORANGE,
          }}
        >
          {t('common.cycle_complete_screen.continue_risk', {
            val: Math.round(continueRisk * 100),
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ThemedButton
            intent="primary"
            onClick={() => {
              audio.playButton();
              void onCashOut();
            }}
            className="min-h-[50px] text-xs font-black uppercase tracking-[0.22em]"
          >
            <span className="inline-flex items-center gap-2">
              <IconBitcoin className="h-5 w-5" color="currentColor" />
              {t('common.cycle_complete_screen.cash_out')}
            </span>
          </ThemedButton>

          <ThemedButton
            intent="secondary"
            onClick={() => {
              audio.playButton();
              void onContinue();
            }}
            className="min-h-[50px] text-xs font-black uppercase tracking-[0.22em]"
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

        <div className="text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {t('common.cycle_complete_screen.multiplier_hint', {
            val: Math.round((1 + data.cycleNumber * 0.5) * 100),
          })}
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
