/**
 * GraphicsSection - Graphics Settings Component
 *
 * Controls for particles, screen shake, damage numbers, HUD scale.
 */

import { memo } from 'react';
import { useGameStore, selectGraphics } from '../../stores/gameStore';
import { ToggleButton } from './ToggleButton';
import { IconMonitor } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';

interface GraphicsSectionProps {
  isMobile: boolean;
  focusedToggle?: 'particles' | 'shake' | 'damage' | 'hudScale' | 'fps' | null;
}

export const GraphicsSection = memo(
  ({ isMobile, focusedToggle }: GraphicsSectionProps) => {
    const graphics = useGameStore(selectGraphics);
    const {
      toggleParticles,
      toggleScreenShake,
      toggleDamageNumbers,
      setHudScale,
      toggleFPS,
    } = useGameStore();
    const { t } = useLanguage();

    return (
      <section className="space-y-3 md:space-y-4">
        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 md:text-xs">
          <IconMonitor className="h-3.5 w-3.5" color="#64748b" />
          <span>{t('settings.visuals')}</span>
        </h3>

        <div className="space-y-1 rounded-sm border border-white/5 bg-white/5 p-3 md:space-y-2 md:p-4">
          <ToggleButton
            label={t('settings.particles')}
            enabled={graphics.showParticles}
            onToggle={toggleParticles}
            isFocused={focusedToggle === 'particles'}
          />

          <ToggleButton
            label={t('settings.screen_shake')}
            enabled={graphics.showScreenShake}
            onToggle={toggleScreenShake}
            isFocused={focusedToggle === 'shake'}
          />

          <ToggleButton
            label={t('settings.damage_numbers')}
            enabled={graphics.showDamageNumbers}
            onToggle={toggleDamageNumbers}
            isFocused={focusedToggle === 'damage'}
          />

          {isMobile && (
            <>
              <div className="space-y-3 border-t border-white/5 pt-3 md:space-y-4 md:pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-tighter text-white md:text-sm">
                    {t('settings.hud_scale')}
                  </span>

                  <span className="font-tech text-[10px] text-yellow-500 md:text-xs">
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
                  className={`h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-yellow-500 transition-all ${
                    focusedToggle === 'hudScale'
                      ? 'shadow-[0_0_10px_rgba(255,255,255,0.3)] ring-2 ring-white'
                      : ''
                  }`}
                />
              </div>
              <div className="pt-2">
                <ToggleButton
                  label={t('settings.show_fps')}
                  enabled={graphics.showFPS}
                  onToggle={toggleFPS}
                  isFocused={focusedToggle === 'fps'}
                />
              </div>
            </>
          )}
        </div>
      </section>
    );
  }
);

GraphicsSection.displayName = 'GraphicsSection';
