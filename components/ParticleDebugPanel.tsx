/**
 * ParticleDebugPanel - Live tuning UI for particle effects
 */

import React, { useState, useEffect } from 'react';
import { ParticleConfigService } from '../services/system/ParticleConfigService';

export const ParticleDebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState(ParticleConfigService.current());

  const shouldShow = import.meta.env.DEV;

  useEffect(() => {
    if (!shouldShow) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ALT + P to toggle
      if (e.key.toLowerCase() === 'p' && e.altKey) {
        setIsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shouldShow]);

  if (!shouldShow) return null;

  const handleUpdate = (
    group: 'trail' | 'impact' | 'collect' | 'bullets',
    key: string,
    value: number
  ) => {
    ParticleConfigService.update(group, { [key]: value });
    setConfig(ParticleConfigService.current());
  };

  const handleReset = () => {
    ParticleConfigService.reset();
    setConfig(ParticleConfigService.current());
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-[30rem] z-[9999] rounded-lg border border-slate-700 bg-slate-800 
                   p-2 text-[10px] text-slate-400 transition-colors hover:bg-slate-700"
      >
        ✨ PARTICLE DBG (ALT+P)
      </button>
    );
  }

  const Slider = ({
    label,
    min,
    max,
    step,
    value,
    onChange,
  }: {
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (v: number) => void;
  }) => (
    <div className="mb-2 flex flex-col gap-1">
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider">
        <span className="text-slate-500">{label}</span>
        <span className="text-amber-400">{value.toFixed(3)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-amber-500"
      />
    </div>
  );

  return (
    <div className="fixed bottom-20 right-4 z-[9999] w-72 rounded-sm border border-amber-500/40 bg-slate-900/90 p-4 shadow-[0_0_30px_rgba(245,158,11,0.15)] backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
            Particle Tuner
          </h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-500 transition-colors hover:text-white"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="custom-scrollbar max-h-[60vh] space-y-6 overflow-y-auto pr-2">
        {/* Trail Config */}
        <section>
          <div className="mb-3 border-b border-slate-800 pb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            Trail (Mermi İzi)
          </div>
          <Slider
            label="Life (Ömür)"
            min={0.01}
            max={1}
            step={0.01}
            value={config.trail.life}
            onChange={(v: number) => handleUpdate('trail', 'life', v)}
          />
          <Slider
            label="Radius Multi"
            min={0.01}
            max={1}
            step={0.01}
            value={config.trail.radiusMultiplier}
            onChange={(v: number) => handleUpdate('trail', 'radiusMultiplier', v)}
          />
          <Slider
            label="Spawn Chance"
            min={0}
            max={1}
            step={0.05}
            value={config.trail.spawnChance}
            onChange={(v: number) => handleUpdate('trail', 'spawnChance', v)}
          />
          <Slider
            label="Speed Multi"
            min={0}
            max={1}
            step={0.05}
            value={config.trail.speedMultiplier}
            onChange={(v: number) => handleUpdate('trail', 'speedMultiplier', v)}
          />
        </section>

        {/* Impact Config */}
        <section>
          <div className="mb-3 border-b border-slate-800 pb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            Impact (Vuruş)
          </div>
          <Slider
            label="Count (Adet)"
            min={1}
            max={50}
            step={1}
            value={config.impact.count}
            onChange={(v: number) => handleUpdate('impact', 'count', v)}
          />
          <Slider
            label="Life (Ömür)"
            min={0.1}
            max={2}
            step={0.1}
            value={config.impact.life}
            onChange={(v: number) => handleUpdate('impact', 'life', v)}
          />
          <Slider
            label="Speed (Hız)"
            min={1}
            max={20}
            step={0.5}
            value={config.impact.speed}
            onChange={(v: number) => handleUpdate('impact', 'speed', v)}
          />
        </section>

        {/* Collect Config */}
        <section>
          <div className="mb-3 border-b border-slate-800 pb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            Collect (Gem Toplama)
          </div>
          <Slider
            label="Count (Adet)"
            min={1}
            max={50}
            step={1}
            value={config.collect.count}
            onChange={(v: number) => handleUpdate('collect', 'count', v)}
          />
          <Slider
            label="Life (Ömür)"
            min={0.1}
            max={3}
            step={0.1}
            value={config.collect.life}
            onChange={(v: number) => handleUpdate('collect', 'life', v)}
          />
          <Slider
            label="Radius (Boyut)"
            min={1}
            max={10}
            step={1}
            value={config.collect.radius}
            onChange={(v: number) => handleUpdate('collect', 'radius', v)}
          />
        </section>

        {/* Bullet Config */}
        <section>
          <div className="mb-3 border-b border-slate-800 pb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            Bullets (Mermiler)
          </div>
          <Slider
            label="Base Size Multi"
            min={0.1}
            max={5}
            step={0.1}
            value={config.bullets.baseSizeMultiplier}
            onChange={(v: number) => handleUpdate('bullets', 'baseSizeMultiplier', v)}
          />
          <Slider
            label="Crit Size Multi"
            min={0.1}
            max={5}
            step={0.1}
            value={config.bullets.critSizeMultiplier}
            onChange={(v: number) => handleUpdate('bullets', 'critSizeMultiplier', v)}
          />
          <Slider
            label="Super Crit Multi"
            min={0.1}
            max={5}
            step={0.1}
            value={config.bullets.superCritSizeMultiplier}
            onChange={(v: number) =>
              handleUpdate('bullets', 'superCritSizeMultiplier', v)
            }
          />
        </section>

        <button
          onClick={handleReset}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 text-[10px] font-bold text-slate-300 transition-all hover:bg-slate-700 active:scale-[0.98]"
        >
          🔄 RESET TO DEFAULTS
        </button>
      </div>
    </div>
  );
};
