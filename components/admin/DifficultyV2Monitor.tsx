import React from 'react';
import { useDifficultyV2 } from '../../hooks/useDifficultyV2';
import { motion } from 'framer-motion';

export const DifficultyV2Monitor: React.FC = () => {
  const { context, total, wavePhase } = useDifficultyV2(100);

  if (!context) {
    return (
      <div className="animate-pulse rounded-sm border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-sm text-slate-500">Initializing Difficulty System V2...</p>
      </div>
    );
  }

  const { factors, aggregates } = context;

  const FactorRow = ({
    label,
    value,
    color = 'text-white',
  }: {
    label: string;
    value: number | string;
    color?: string;
  }) => (
    <div className="flex items-center justify-between border-b border-slate-800/50 py-1.5 last:border-0">
      <span className="text-xs capitalize text-slate-400">
        {label.replace(/([A-Z])/g, ' $1')}
      </span>
      <span className={`font-mono text-xs font-bold ${color}`}>
        {typeof value === 'number' ? value.toFixed(3) : value}
      </span>
    </div>
  );

  const ProgressBar = ({
    value,
    max = 5,
    color = 'bg-cyan-500',
  }: {
    value: number;
    max?: number;
    color?: string;
  }) => {
    const percentage = Math.min(100, (value / max) * 100);
    return (
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color}`}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-sm border border-cyan-500/30 bg-slate-900 p-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
            Total Difficulty
          </p>
          <p className="text-2xl font-black text-white">{total.toFixed(2)}x</p>
          <ProgressBar value={total} max={10} color="bg-cyan-500" />
        </div>
        <div className="rounded-sm border border-purple-500/30 bg-slate-900 p-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
            Wave Phase
          </p>
          <p className="text-lg font-bold capitalize text-white">{wavePhase}</p>
          <div className="mt-1 text-[10px] text-purple-300/50">
            Agg Core: {aggregates.core.toFixed(2)}x
          </div>
        </div>
        <div className="rounded-sm border border-orange-500/30 bg-slate-900 p-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-orange-400">
            Risk Modifier
          </p>
          <p className="text-2xl font-black text-white">
            {aggregates.modifier.toFixed(2)}x
          </p>
          <ProgressBar value={aggregates.modifier} max={5} color="bg-orange-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Core Factors */}
        <div className="rounded-sm border border-slate-800 bg-slate-900/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Core Progression
          </h4>
          <FactorRow label="Cycle" value={factors.cycle} />
          <FactorRow label="Level" value={factors.level} />
          <FactorRow label="Wave Mult" value={factors.wave} />
          <FactorRow label="Base PnL" value={factors.pnl} />
          <div className="mt-4 border-t border-slate-800 pt-4">
            <FactorRow
              label="Aggregated Core"
              value={aggregates.core}
              color="text-blue-400"
            />
          </div>
        </div>

        {/* Dynamic Modifiers */}
        <div className="rounded-sm border border-slate-800 bg-slate-900/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Dynamic Modifiers
          </h4>
          <FactorRow label="Liquidation" value={factors.liquidation.factor} />
          <FactorRow label="Kill Streak" value={factors.streak} />
          <FactorRow
            label="Shock Multiplier"
            value={factors.shock.factor}
            color={factors.shock.triggered ? 'text-red-400' : 'text-white'}
          />
          <FactorRow
            label="Warning Level"
            value={factors.liquidation.warningLevel}
            color={
              factors.liquidation.warningLevel !== 'NONE'
                ? 'text-red-400'
                : 'text-slate-500'
            }
          />
          <div className="mt-4 border-t border-slate-800 pt-4">
            <FactorRow
              label="Aggregated Mod"
              value={aggregates.modifier}
              color="text-orange-400"
            />
          </div>
        </div>

        {/* Market Indicators */}
        <div className="rounded-sm border border-slate-800 bg-slate-900/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Market Indicators
          </h4>
          <FactorRow label="RSI Factor" value={factors.rsi} />
          <FactorRow label="Volume Intensity" value={factors.volume} />
          <FactorRow label="ATR Volatility" value={factors.atr} />
          <div className="mt-4 border-t border-slate-800 pt-4">
            <FactorRow
              label="Aggregated Market"
              value={aggregates.market}
              color="text-green-400"
            />
          </div>
        </div>

        {/* Scaling Details */}
        <div className="rounded-sm border border-slate-800 bg-slate-900/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            Leverage Scaling
          </h4>
          <FactorRow label="Current Leverage" value={context.inputs.leverage + 'x'} />
          <FactorRow label="Spawn Scale" value={context.inputs.leverageScale.spawn} />
          <FactorRow label="Speed Scale" value={context.inputs.leverageScale.speed} />
          <FactorRow label="HP Scale" value={context.inputs.leverageScale.hp} />
          <FactorRow label="Damage Scale" value={context.inputs.leverageScale.damage} />
        </div>
      </div>
    </div>
  );
};
