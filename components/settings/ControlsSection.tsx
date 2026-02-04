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
      <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 md:text-xs">
        <IconZap className="h-3.5 w-3.5" color="#64748b" />
        <span>{t('settings.controls')}</span>
      </h3>

      <div className="grid grid-cols-2 gap-2 rounded-sm border border-white/5 bg-white/5 p-3 md:p-4">
        <div className="flex flex-col">
          <span className="text-[8px] font-bold uppercase text-slate-500 md:text-[10px]">
            {t('settings.move')}
          </span>

          <span className="font-tech text-xs font-bold leading-tight text-white md:text-sm">
            WASD / ARROWS
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-bold uppercase text-slate-500 md:text-[10px]">
            {t('settings.dash')}
          </span>

          <span className="font-tech text-xs font-bold leading-tight text-white md:text-sm">
            SPACE
          </span>
        </div>
        <div className="mt-1 flex flex-col md:mt-2">
          <span className="text-[8px] font-bold uppercase text-slate-500 md:text-[10px]">
            {t('settings.pause')}
          </span>

          <span className="font-tech text-xs font-bold leading-tight text-white md:text-sm">
            ESC / P
          </span>
        </div>
        <div className="mt-1 flex flex-col md:mt-2">
          <span className="text-[8px] font-bold uppercase text-slate-500 md:text-[10px]">
            {t('settings.auto_fire')}
          </span>
          <span className="text-[8px] font-bold uppercase text-yellow-500/80 md:text-[10px]">
            {t('settings.always_on')}
          </span>
        </div>
      </div>
    </section>
  );
};
