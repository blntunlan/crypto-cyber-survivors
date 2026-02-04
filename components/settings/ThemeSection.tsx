/**
 * ThemeSection - Theme Selection Settings
 *
 * Allows users to switch between Cyberpunk and 16-bit Retro themes.
 * Supports keyboard navigation with separate focus for each theme.
 *
 * TODO: Retro theme temporarily disabled - will be enabled in future release
 */

import { memo } from 'react';
import { useTheme } from '../../contexts/useTheme';
import { IconCyberpunk, IconSparkles } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';

export const ThemeSection = memo(
  ({ focusedItem = null }: { focusedItem?: 'cyberpunk' | 'retro-16bit' | null }) => {
    const { themeName } = useTheme();
    const { t } = useLanguage();

    const isCyberpunk = themeName === 'cyberpunk';

    return (
      <section className="space-y-3 md:space-y-4">
        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 md:text-xs">
          <IconSparkles className="h-3.5 w-3.5" color="#64748b" />
          <span>{t('settings.theme')}</span>
        </h3>

        <div className="space-y-2 rounded-sm border border-white/5 bg-white/5 p-3 transition-all md:p-4">
          {/* Cyberpunk Button - Currently the only active theme */}
          <button
            disabled
            className={`flex w-full cursor-default items-center justify-between rounded-lg border px-4 py-2.5 text-[11px] font-black uppercase transition-all ${
              isCyberpunk
                ? 'border-cyan-500/50 bg-cyan-600/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'border-white/5 bg-white/5 text-slate-500'
            } ${focusedItem === 'cyberpunk' ? 'scale-[1.02] bg-white/10 ring-2 ring-white' : ''}`}
          >
            <div className="flex items-center gap-3">
              <IconCyberpunk
                className="h-4 w-4"
                color={isCyberpunk ? '#22d3ee' : '#64748b'}
              />
              <span className={isCyberpunk ? 'text-white' : ''}>
                {t('settings.theme_cyber')}
              </span>
            </div>
            {isCyberpunk && <span className="animate-pulse text-[9px]">ACTIVE</span>}
          </button>

          {/* Retro Button - Temporarily disabled
          <button
            onClick={() => setTheme('retro-16bit')}
            className={`w-full py-2.5 px-4 rounded-lg text-[11px] font-black uppercase transition-all border flex items-center justify-between ${
              isRetro
                ? 'bg-orange-600/20 text-orange-400 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
            } ${focusedItem === 'retro-16bit' ? 'ring-2 ring-white scale-[1.02] bg-white/10' : ''}`}
          >
            <div className="flex items-center gap-3">
              <IconRetro className="w-4 h-4" color={isRetro ? '#fb923c' : '#64748b'} />
              <span className={isRetro ? 'text-white' : ''}>
                {t('settings.theme_retro')}
              </span>
            </div>
            {isRetro && <span className="text-[9px] animate-pulse">ACTIVE</span>}
          </button>
          */}

          {/* Coming Soon indicator */}
          <div className="pt-1 text-center text-[9px] text-slate-600">
            More themes coming soon...
          </div>
        </div>
      </section>
    );
  }
);

ThemeSection.displayName = 'ThemeSection';
