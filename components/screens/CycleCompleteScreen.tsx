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
import { CoinService, type CoinCalculation } from '../../services/CoinService';
import { COLORS } from '../../constants';
import { Z_LAYERS } from '../../constants/ZIndex';
import { audio } from '../../services/AudioService';
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
import { Logger } from '../../services/Logger';

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
      maxStreak: 0, // TODO: Pass from game state
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
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: Z_LAYERS.CYCLE_COMPLETE,
      }}
    >
      <div
        className={`relative w-full max-w-md mx-4 p-6 md:p-8 transition-all ${
          isRetro
            ? 'bg-zinc-900 border-4 border-[var(--color-primary)] rounded-none'
            : 'cyber-glass rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className={`${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-glitch-text'} ${sizes.heading} font-black mb-1 text-shadow-none`}
            style={{ color: COLORS.JACKPOT_YELLOW }}
          >
            CYCLE {data.cycleNumber} COMPLETE
          </div>
          <div
            className={`text-slate-400 text-[8px] ${isRetro ? 'font-retro-pixel' : 'font-cyber'} uppercase tracking-widest`}
          >
            5 minutes survived
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatBox
            label="Time Survived"
            value={formatTime(data.survivalTimeSeconds)}
            theme={theme}
            isRetro={isRetro}
            icon={
              <IconMonitor
                className={isRetro ? 'w-5 h-5' : 'w-6 h-6'}
                color={COLORS.ELECTRIC_BLUE}
              />
            }
          />
          <StatBox
            label="Level Reached"
            value={data.level.toString()}
            theme={theme}
            isRetro={isRetro}
            icon={
              <IconTrophy
                className={isRetro ? 'w-5 h-5' : 'w-6 h-6'}
                color={COLORS.JACKPOT_YELLOW}
              />
            }
          />
          <StatBox
            label="Total Kills"
            value={data.totalKills.toString()}
            theme={theme}
            isRetro={isRetro}
            icon={
              <IconSkull
                className={isRetro ? 'w-5 h-5' : 'w-6 h-6'}
                color={COLORS.CASINO_RED}
              />
            }
          />
          <StatBox
            label="P&L Performance"
            value={`${data.effectivePnl >= 0 ? '+' : ''}${(data.effectivePnl * 100).toFixed(1)}%`}
            theme={theme}
            isRetro={isRetro}
            valueColor={pnlColor}
            icon={
              data.effectivePnl >= 0 ? (
                <IconTrendUp
                  className={isRetro ? 'w-5 h-5' : 'w-6 h-6'}
                  color={COLORS.PUMP_GREEN}
                />
              ) : (
                <IconTrendDown
                  className={isRetro ? 'w-5 h-5' : 'w-6 h-6'}
                  color={COLORS.DUMP_ORANGE}
                />
              )
            }
          />
        </div>

        {/* Coin Earnings */}
        {coinCalculation && (
          <div
            className={`mb-6 p-4 ${isRetro ? 'border-2' : 'rounded-xl'}`}
            style={{
              backgroundColor: `${COLORS.JACKPOT_YELLOW}10`,
              borderColor: COLORS.JACKPOT_YELLOW,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 font-bold">COINS EARNED</span>
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="text-xs text-slate-400 underline"
              >
                {showBreakdown ? 'Hide' : 'Details'}
              </button>
            </div>
            <div
              className={`${sizes.heading} font-black`}
              style={{ color: COLORS.JACKPOT_YELLOW }}
            >
              🪙 {coinCalculation.total.toLocaleString()}
            </div>

            {showBreakdown && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1">
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
          ⚠️ Continue Risk: {Math.round(continueRisk * 100)}% difficulty increase
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              audio.playButton();
              void onCashOut();
            }}
            className={`flex-1 py-4 font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              isRetro
                ? 'border-4 active:translate-y-1'
                : 'rounded-xl border-2 hover:scale-105 active:scale-95'
            }`}
            style={{
              backgroundColor: COLORS.PUMP_GREEN,
              borderColor: COLORS.PUMP_GREEN,
              color: '#000',
            }}
          >
            <IconBitcoin className="w-5 h-5" color="black" />
            Cash Out
          </button>
          <button
            onClick={() => {
              audio.playButton();
              void onContinue();
            }}
            className={`flex-1 py-4 font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              isRetro
                ? 'border-4 active:translate-y-1'
                : 'rounded-xl border-2 hover:scale-105 active:scale-95'
            }`}
            style={{
              backgroundColor: isRetro ? 'transparent' : `${theme.colors.primary}20`,
              borderColor: theme.colors.primary,
              color: theme.colors.primary,
            }}
          >
            <IconZap className="w-5 h-5" color={theme.colors.primary} />
            Continue
          </button>
        </div>

        {/* Continue Multiplier Hint */}
        <div className="text-center mt-3 text-xs text-slate-500">
          Continue to earn {Math.round((1 + data.cycleNumber * 0.5) * 100)}% coin
          multiplier next cycle
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
      className={`p-3 relative overflow-hidden ${isRetro ? 'rounded-none border-2 border-slate-700 bg-zinc-900' : 'rounded-lg bg-white/5 backdrop-blur-sm border border-white/10'}`}
    >
      {/* Background Icon Watermark */}
      <div className="absolute -right-2 -bottom-2 opacity-10 pointer-events-none scale-150">
        {icon}
      </div>

      <div className="flex items-center gap-2 mb-1 relative z-10">
        <div className="opacity-80 scale-75 origin-left">{icon}</div>
        <div
          className={`text-xs text-slate-400 uppercase ${isRetro ? 'font-retro-text tracking-widest' : 'font-bold tracking-wider'}`}
        >
          {label}
        </div>
      </div>
      <div
        className={`text-xl font-black relative z-10 ${isRetro ? 'font-retro-pixel' : 'font-cyber tracking-tight'}`}
        style={{ color: valueColor ?? theme.colors.text }}
      >
        {value}
      </div>
    </div>
  );
}
