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
      <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <IconSettings className="w-3.5 h-3.5" color="#64748b" />
        <span>{t('settings.language')}</span>
      </h3>

      <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/5 space-y-2 transition-all">
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {languages.map(lang => {
            const isSelected = language === lang.code;
            const isFocused = focusedItem === lang.code;

            return (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`w-full py-2.5 px-4 rounded-lg text-[11px] font-black uppercase transition-all border flex items-center justify-between group ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(37,99,235,0.2)]'
                    : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
                } ${isFocused ? 'ring-2 ring-white scale-[1.02] bg-white/10' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      isSelected
                        ? 'bg-blue-400 animate-pulse'
                        : 'bg-white/10 group-hover:bg-white/30'
                    }`}
                  />
                  <span className={isSelected ? 'text-white' : ''}>{lang.label}</span>
                </div>
                {isSelected && <span className="text-[9px] animate-pulse">ACTIVE</span>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
});

LanguageSection.displayName = 'LanguageSection';
