/**
 * LanguageSection - Language Selection Settings
 *
 * Allows users to choose their preferred interface language.
 */

import { memo } from 'react';
import { useLanguage, type SUPPORTED_LANGUAGES } from '../../contexts/LanguageContext';
import { IconSettings } from '../icons/CardIcons';

export interface LanguageSectionProps {
  focusedItem?: string | null;
}

export const LanguageSection = memo(({ focusedItem = null }: LanguageSectionProps) => {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: (typeof SUPPORTED_LANGUAGES)[number]; label: string }[] = [
    { code: 'en', label: t('settings.lang_en') },
    { code: 'tr', label: t('settings.lang_tr') },
    { code: 'hi', label: t('settings.lang_hi') },
    { code: 'vi', label: t('settings.lang_vi') },
    { code: 'es', label: t('settings.lang_es') },
    { code: 'pt', label: t('settings.lang_pt') },
    { code: 'zh', label: t('settings.lang_zh') },
    { code: 'ru', label: t('settings.lang_ru') },
  ];

  return (
    <section className="space-y-3 md:space-y-4">
      <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 md:text-xs">
        <IconSettings className="h-3.5 w-3.5" color="#64748b" />
        <span>{t('settings.language')}</span>
      </h3>

      <div className="space-y-2 rounded-sm border border-white/5 bg-white/5 p-3 transition-all md:p-4">
        <div className="custom-scrollbar flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
          {languages.map(lang => {
            const isSelected = language === lang.code;
            const isFocused = focusedItem === lang.code;

            return (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`group flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-[11px] font-black uppercase transition-all ${
                  isSelected
                    ? 'border-blue-500/50 bg-blue-600/20 text-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.2)]'
                    : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/10'
                } ${isFocused ? 'scale-[1.02] bg-white/10 ring-2 ring-white' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                      isSelected
                        ? 'animate-pulse bg-blue-400'
                        : 'bg-white/10 group-hover:bg-white/30'
                    }`}
                  />
                  <span className={isSelected ? 'text-white' : ''}>{lang.label}</span>
                </div>
                {isSelected && <span className="animate-pulse text-[9px]">ACTIVE</span>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
});

LanguageSection.displayName = 'LanguageSection';
