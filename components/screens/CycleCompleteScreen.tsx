/**
 * CycleCompleteScreen - Displayed when a 5-minute cycle ends in COMPETITIVE mode
 *
 * Shows:
 * - Survival stats
 * - Coins earned breakdown
 * - Cash Out vs Continue options
 */

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/useTheme';
import { useThemeSize } from '../../hooks/useThemeSize';
import { CoinService, type CoinCalculation } from '../../services/gameplay/CoinService';
import { ComboSystem } from '../../services/combat/ComboSystem';
import { COLORS } from '../../constants';
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
  const { theme, isRetro } = useTheme();
  const sizes = useThemeSize();
  const { t } = useLanguage();

  const [coinCalculation, setCoinCalculation] = useState<CoinCalculation | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    Logger.info('[CycleCompleteScreen] Mounted');
  }, []);

  useEffect(() => {
    // Calculate coins
    const calc = CoinService.calculateCycleReward({
      survivalTimeSeconds: data.survivalTimeSeconds,
      kills: data.totalKills,
      level: data.level,
      pnl: data.effectivePnl,
      maxStreak: ComboSystem.getMaxStreak(),
    });
    setCoinCalculation(calc);

    // Play fanfare
    audio.playLevelUp();
  }, [data]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pnlColor = data.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;
  const continueRisk = Math.min(0.5 + data.cycleNumber * 0.1, 0.9); // Increasing risk

  return (
    <div
      className="allow-scroll fixed inset-0 flex items-center justify-center overflow-y-auto p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: Z_LAYERS.CYCLE_COMPLETE,
      }}
    >
      <div
        className={`relative mx-4 my-auto w-full max-w-md p-6 transition-all md:p-8 ${
          isRetro
            ? 'rounded-none border-4 border-[var(--color-primary)] bg-zinc-900'
            : 'cyber-glass rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <div
            className={`${isRetro ? 'font-retro-pixel' : 'cyber-glitch-text font-cyber'} ${sizes.heading} text-shadow-none mb-1 font-black`}
            style={{ color: COLORS.JACKPOT_YELLOW }}
          >
            {t('common.cycle_complete_screen.title', { val: data.cycleNumber })}
          </div>

          <div
            className={`text-[8px] text-slate-400 ${isRetro ? 'font-retro-pixel' : 'font-cyber'} uppercase tracking-widest`}
          >
            {t('common.cycle_complete_screen.subtitle')}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <StatBox
            label={t('common.cycle_complete_screen.time_survived')}
            value={formatTime(data.survivalTimeSeconds)}
            theme={theme}
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
            theme={theme}
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
            theme={theme}
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
            theme={theme}
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

        {/* Coin Earnings */}
        {coinCalculation && (
          <div
            className={`mb-6 p-4 ${isRetro ? 'border-2' : 'rounded-sm'}`}
            style={{
              backgroundColor: `${COLORS.JACKPOT_YELLOW}10`,
              borderColor: COLORS.JACKPOT_YELLOW,
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-slate-300">
                {t('common.cycle_complete_screen.coins_earned')}
              </span>

              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="text-xs text-slate-400 underline"
              >
                {showBreakdown
                  ? t('common.cycle_complete_screen.hide')
                  : t('common.cycle_complete_screen.details')}
              </button>
            </div>
            <div
              className={`${sizes.heading} font-black`}
              style={{ color: COLORS.JACKPOT_YELLOW }}
            >
              🪙 {coinCalculation.total.toLocaleString()}
            </div>

            {showBreakdown && (
              <div className="mt-3 space-y-1 border-t border-slate-700/50 pt-3">
                {Object.entries(coinCalculation.breakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-slate-400">{key}</span>
                    <span className="text-slate-200">+{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Continue Risk Warning */}
        <div
          className={`mb-6 p-3 text-center text-sm ${isRetro ? 'border-2' : 'rounded-lg'}`}
          style={{
            backgroundColor: `${COLORS.DUMP_ORANGE}10`,
            borderColor: COLORS.DUMP_ORANGE,
            color: COLORS.DUMP_ORANGE,
          }}
        >
          ⚠️{' '}
          {t('common.cycle_complete_screen.continue_risk', {
            val: Math.round(continueRisk * 100),
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              audio.playButton();
              void onCashOut();
            }}
            className={`flex flex-1 items-center justify-center gap-2 py-4 font-black uppercase tracking-wider transition-all ${
              isRetro
                ? 'border-4 active:translate-y-1'
                : 'rounded-sm border-2 hover:scale-105 active:scale-95'
            }`}
            style={{
              backgroundColor: COLORS.PUMP_GREEN,
              borderColor: COLORS.PUMP_GREEN,
              color: '#000',
            }}
          >
            <IconBitcoin className="h-5 w-5" color="black" />
            {t('common.cycle_complete_screen.cash_out')}
          </button>

          <button
            onClick={() => {
              audio.playButton();
              void onContinue();
            }}
            className={`flex flex-1 items-center justify-center gap-2 py-4 font-black uppercase tracking-wider transition-all ${
              isRetro
                ? 'border-4 active:translate-y-1'
                : 'rounded-sm border-2 hover:scale-105 active:scale-95'
            }`}
            style={{
              backgroundColor: isRetro ? 'transparent' : `${theme.colors.primary}20`,
              borderColor: theme.colors.primary,
              color: theme.colors.primary,
            }}
          >
            <IconZap className="h-5 w-5" color={theme.colors.primary} />
            {t('common.cycle_complete_screen.continue')}
          </button>
        </div>

        {/* Continue Multiplier Hint */}
        <div className="mt-3 text-center text-xs text-slate-500">
          {t('common.cycle_complete_screen.multiplier_hint', {
            val: Math.round((1 + data.cycleNumber * 0.5) * 100),
          })}
        </div>
      </div>
    </div>
  );
}

// Helper component for stat display
function StatBox({
  label,
  value,
  theme,
  isRetro,
  valueColor,
  icon,
}: {
  label: string;
  value: string;
  theme: { colors: { surface: string; text: string } };
  isRetro?: boolean;
  valueColor?: string;
  icon?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className={`relative overflow-hidden p-3 ${isRetro ? 'rounded-none border-2 border-slate-700 bg-zinc-900' : 'rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm'}`}
    >
      {/* Background Icon Watermark */}
      <div className="pointer-events-none absolute -bottom-2 -right-2 scale-150 opacity-10">
        {icon}
      </div>

      <div className="relative z-10 mb-1 flex items-center gap-2">
        <div className="origin-left scale-75 opacity-80">{icon}</div>
        <div
          className={`text-xs uppercase text-slate-400 ${isRetro ? 'font-retro-text tracking-widest' : 'font-bold tracking-wider'}`}
        >
          {label}
        </div>
      </div>
      <div
        className={`relative z-10 text-xl font-black ${isRetro ? 'font-retro-pixel' : 'font-cyber tracking-tight'}`}
        style={{ color: valueColor ?? theme.colors.text }}
      >
        {value}
      </div>
    </div>
  );
}
