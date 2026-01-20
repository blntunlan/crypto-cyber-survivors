/**
 * ControlsSection - Keyboard Controls Reference Component
 *
 * Displays keyboard shortcuts for the game.
 */

import React from 'react';
import { IconZap } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';

export const ControlsSection: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section className="space-y-3 md:space-y-4">
      <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <IconZap className="w-3.5 h-3.5" color="#64748b" />
        <span>{t('settings.controls')}</span>
      </h3>

      <div className="grid grid-cols-2 gap-2 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
        <div className="flex flex-col">
          <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">
            {t('settings.move')}
          </span>

          <span className="text-xs md:text-sm font-bold text-white font-tech leading-tight">
            WASD / ARROWS
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">
            {t('settings.dash')}
          </span>

          <span className="text-xs md:text-sm font-bold text-white font-tech leading-tight">
            SPACE
          </span>
        </div>
        <div className="flex flex-col mt-1 md:mt-2">
          <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">
            {t('settings.pause')}
          </span>

          <span className="text-xs md:text-sm font-bold text-white font-tech leading-tight">
            ESC / P
          </span>
        </div>
        <div className="flex flex-col mt-1 md:mt-2">
          <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">
            {t('settings.auto_fire')}
          </span>
          <span className="text-[8px] md:text-[10px] font-bold text-yellow-500/80 uppercase">
            {t('settings.always_on')}
          </span>
        </div>
      </div>
    </section>
  );
};
