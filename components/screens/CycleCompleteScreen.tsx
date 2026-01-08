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
import { audio } from '../../services/AudioService';
import { type CycleCompleteData } from '../../types/gameMode';

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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
    >
      <div
        className={`relative w-full max-w-md mx-4 p-6 md:p-8 transition-all ${
          isRetro
            ? 'bg-zinc-900 border-4 border-[var(--color-primary)] rounded-none'
            : 'bg-slate-900/40 border border-[var(--color-primary)]/20 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className={`font-display ${sizes.heading} font-black mb-1`}
            style={{ color: COLORS.JACKPOT_YELLOW }}
          >
            CYCLE {data.cycleNumber} COMPLETE
          </div>
          <div className="text-slate-400 text-[8px] font-display uppercase tracking-widest">
            5 minutes survived
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatBox label="Time" value={formatTime(data.survivalTimeSeconds)} theme={theme} />
          <StatBox label="Level" value={data.level.toString()} theme={theme} />
          <StatBox label="Kills" value={data.totalKills.toString()} theme={theme} />
          <StatBox
            label="P&L"
            value={`${data.effectivePnl >= 0 ? '+' : ''}${(data.effectivePnl * 100).toFixed(1)}%`}
            theme={theme}
            valueColor={pnlColor}
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
            <div className={`${sizes.heading} font-black`} style={{ color: COLORS.JACKPOT_YELLOW }}>
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
            className={`flex-1 py-4 font-black uppercase tracking-wider transition-all ${
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
            💰 Cash Out
          </button>
          <button
            onClick={() => {
              audio.playButton();
              void onContinue();
            }}
            className={`flex-1 py-4 font-black uppercase tracking-wider transition-all ${
              isRetro
                ? 'border-4 active:translate-y-1'
                : 'rounded-xl border-2 hover:scale-105 active:scale-95'
            }`}
            style={{
              backgroundColor: 'transparent',
              borderColor: theme.colors.primary,
              color: theme.colors.primary,
            }}
          >
            🎮 Continue
          </button>
        </div>

        {/* Continue Multiplier Hint */}
        <div className="text-center mt-3 text-xs text-slate-500">
          Continue to earn {Math.round((1 + data.cycleNumber * 0.5) * 100)}% coin multiplier next
          cycle
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
  valueColor,
}: {
  label: string;
  value: string;
  theme: { colors: { surface: string; text: string } };
  valueColor?: string;
}): React.JSX.Element {
  return (
    <div
      className="p-3 rounded-lg text-center"
      style={{ backgroundColor: `${theme.colors.surface}80` }}
    >
      <div className="text-xs text-slate-400 uppercase mb-1">{label}</div>
      <div className="text-xl font-black" style={{ color: valueColor ?? theme.colors.text }}>
        {value}
      </div>
    </div>
  );
}
