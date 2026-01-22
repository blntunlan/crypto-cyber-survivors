import React from 'react';
import { useDifficultyV2 } from '../../hooks/useDifficultyV2';
import { motion } from 'framer-motion';

export const DifficultyV2Monitor: React.FC = () => {
  const { context, total, wavePhase } = useDifficultyV2(100);

  if (!context) {
    return (
      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 animate-pulse">
        <p className="text-slate-500 text-sm">Initializing Difficulty System V2...</p>
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
    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50 last:border-0">
      <span className="text-xs text-slate-400 capitalize">
        {label.replace(/([A-Z])/g, ' $1')}
      </span>
      <span className={`text-xs font-mono font-bold ${color}`}>
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
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
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
        <div className="bg-slate-900 border border-cyan-500/30 p-4 rounded-xl">
          <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1">
            Total Difficulty
          </p>
          <p className="text-2xl font-black text-white">{total.toFixed(2)}x</p>
          <ProgressBar value={total} max={10} color="bg-cyan-500" />
        </div>
        <div className="bg-slate-900 border border-purple-500/30 p-4 rounded-xl">
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">
            Wave Phase
          </p>
          <p className="text-lg font-bold text-white capitalize">{wavePhase}</p>
          <div className="text-[10px] text-purple-300/50 mt-1">
            Agg Core: {aggregates.core.toFixed(2)}x
          </div>
        </div>
        <div className="bg-slate-900 border border-orange-500/30 p-4 rounded-xl">
          <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-1">
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
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Core Progression
          </h4>
          <FactorRow label="Cycle" value={factors.cycle} />
          <FactorRow label="Level" value={factors.level} />
          <FactorRow label="Wave Mult" value={factors.wave} />
          <FactorRow label="Base PnL" value={factors.pnl} />
          <div className="mt-4 pt-4 border-t border-slate-800">
            <FactorRow
              label="Aggregated Core"
              value={aggregates.core}
              color="text-blue-400"
            />
          </div>
        </div>

        {/* Dynamic Modifiers */}
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
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
          <div className="mt-4 pt-4 border-t border-slate-800">
            <FactorRow
              label="Aggregated Mod"
              value={aggregates.modifier}
              color="text-orange-400"
            />
          </div>
        </div>

        {/* Market Indicators */}
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Market Indicators
          </h4>
          <FactorRow label="RSI Factor" value={factors.rsi} />
          <FactorRow label="Volume Intensity" value={factors.volume} />
          <FactorRow label="ATR Volatility" value={factors.atr} />
          <div className="mt-4 pt-4 border-t border-slate-800">
            <FactorRow
              label="Aggregated Market"
              value={aggregates.market}
              color="text-green-400"
            />
          </div>
        </div>

        {/* Scaling Details */}
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
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
