import React from 'react';
import { useDifficultyV2 } from '../../hooks/useDifficultyV2';
import { LazyMotion, domAnimation, m } from 'framer-motion';

interface FactorRowProps {
  label: string;
  value: number | string;
  color?: string;
}

const FactorRow: React.FC<FactorRowProps> = ({
  label,
  value,
  color = 'text-white',
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

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 5,
  color = 'bg-cyan-500',
}) => {
  const percentage = Math.min(100, (value / max) * 100);
  return (
    <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
      <m.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        className={`h-full ${color}`}
      />
    </div>
  );
};

export const DifficultyV2Monitor: React.FC = () => {
  const { output, total } = useDifficultyV2();

  if (!output) {
    return (
      <LazyMotion features={domAnimation}>
        <div className="animate-pulse rounded-sm border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-sm text-slate-500">Initializing Difficulty System V2...</p>
        </div>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-sm border border-cyan-500/30 bg-slate-900 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Total Difficulty
            </p>
            <p className="text-2xl font-black text-white">{total.toFixed(2)}x</p>
            <ProgressBar value={total} max={10} color="bg-cyan-500" />
          </div>
          <div className="rounded-sm border border-purple-500/30 bg-slate-900 p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
              Director Output
            </p>
            <p className="text-lg font-bold capitalize text-white">
              {output.wavePhase}
            </p>
            <div className="mt-1 text-[10px] text-purple-300/50">
              Spawn: {output.spawnRate.toFixed(2)}x
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Core Factors */}
          <div className="rounded-sm border border-slate-800 bg-slate-900/50 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              V2 Outputs
            </h4>
            <FactorRow
              label="Enemy Speed"
              value={(output.enemySpeed || 1).toFixed(2)}
            />
            <FactorRow label="Enemy HP" value={(output.enemyHP || 1).toFixed(2)} />
            <FactorRow
              label="Enemy Damage"
              value={(output.enemyDamage || 1).toFixed(2)}
            />
          </div>

          {/* Dynamic Modifiers */}
          <div className="rounded-sm border border-slate-800 bg-slate-900/50 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              V2 State
            </h4>
            <FactorRow label="Liquidation Warn" value={output.liquidationWarning} />
            <FactorRow
              label="FOV Reduction"
              value={(output.fovReduction || 0).toFixed(2)}
            />
            <FactorRow
              label="Shock Active"
              value={output.shockActive ? 'Yes' : 'No'}
              color={output.shockActive ? 'text-red-400' : 'text-slate-500'}
            />
          </div>
        </div>
      </div>
    </LazyMotion>
  );
};
