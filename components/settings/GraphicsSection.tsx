/**
 * GraphicsSection - Graphics Settings Component
 *
 * Controls for particles, screen shake, damage numbers, HUD scale.
 */

import { memo } from 'react';
import { useGameStore, selectGraphics } from '../../stores/gameStore';
import { ToggleButton } from './ToggleButton';

interface GraphicsSectionProps {
  isMobile: boolean;
  focusedToggle?: 'particles' | 'shake' | 'damage' | null;
}

export const GraphicsSection = memo(({ isMobile, focusedToggle }: GraphicsSectionProps) => {
  const graphics = useGameStore(selectGraphics);
  const { toggleParticles, toggleScreenShake, toggleDamageNumbers, setHudScale, toggleFPS } =
    useGameStore();

  return (
    <section className="space-y-3 md:space-y-4">
      <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">
        Graphics
      </h3>
      <div className="space-y-1 md:space-y-2 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
        <ToggleButton
          label="Particles"
          enabled={graphics.showParticles}
          onToggle={toggleParticles}
          isFocused={focusedToggle === 'particles'}
        />
        <ToggleButton
          label="Screen Shake"
          enabled={graphics.showScreenShake}
          onToggle={toggleScreenShake}
          isFocused={focusedToggle === 'shake'}
        />
        <ToggleButton
          label="Damage Numbers"
          enabled={graphics.showDamageNumbers}
          onToggle={toggleDamageNumbers}
          isFocused={focusedToggle === 'damage'}
        />

        {isMobile && (
          <>
            <div className="pt-3 md:pt-4 space-y-3 md:space-y-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm font-bold text-white uppercase tracking-tighter">
                  HUD Scale
                </span>
                <span className="text-[10px] md:text-xs font-tech text-yellow-500">
                  {Math.round(graphics.hudScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={graphics.hudScale}
                onChange={e => setHudScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>
            <ToggleButton label="Show FPS" enabled={graphics.showFPS} onToggle={toggleFPS} />
          </>
        )}
      </div>
    </section>
  );
});

GraphicsSection.displayName = 'GraphicsSection';
