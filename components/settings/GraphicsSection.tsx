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
        <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <IconMonitor className="w-3.5 h-3.5" color="#64748b" />
          <span>{t('settings.visuals')}</span>
        </h3>

        <div className="space-y-1 md:space-y-2 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
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
              <div className="pt-3 md:pt-4 space-y-3 md:space-y-4 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-xs md:text-sm font-bold text-white uppercase tracking-tighter">
                    {t('settings.hud_scale')}
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
                  className={`w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500 transition-all ${
                    focusedToggle === 'hudScale'
                      ? 'ring-2 ring-white shadow-[0_0_10px_rgba(255,255,255,0.3)]'
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
