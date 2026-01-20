import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIsRetro } from '../../contexts/useTheme';

interface LanguageSectionProps {
  isFocused?: boolean;
}

export const LanguageSection: React.FC<LanguageSectionProps> = ({ isFocused }) => {
  const { language, setLanguage, t } = useLanguage();
  const isRetro = useIsRetro();

  const languages: { code: 'en' | 'tr' | 'hi' | 'vi' | 'es' | 'pt'; label: string }[] =
    [
      { code: 'en', label: t('settings.lang_en') },
      { code: 'tr', label: t('settings.lang_tr') },
      { code: 'hi', label: t('settings.lang_hi') },
      { code: 'vi', label: t('settings.lang_vi') },
      { code: 'es', label: t('settings.lang_es') },
      { code: 'pt', label: t('settings.lang_pt') },
    ];

  return (
    <div
      className={`space-y-3 ${isFocused ? 'ring-2 ring-white/20 rounded-lg p-2' : ''}`}
    >
      <h3
        className={`${isRetro ? 'font-retro-pixel text-xs' : 'font-cyber text-sm'} uppercase tracking-wider text-slate-500`}
      >
        {t('settings.language')}
      </h3>

      <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`py-2.5 px-4 text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-between group ${
              language === lang.code
                ? isRetro
                  ? 'bg-yellow-500 text-black border-yellow-600 shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                : isRetro
                  ? 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                  : 'bg-slate-900/40 text-slate-500 border-white/5 hover:border-white/20 hover:text-white'
            } ${isRetro ? 'rounded-none' : 'rounded-xl'}`}
          >
            <span className="flex items-center gap-3">
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${language === lang.code ? (isRetro ? 'bg-black' : 'bg-black animate-pulse') : 'bg-white/10 group-hover:bg-white/30'}`}
              />
              {lang.label}
            </span>
            {language === lang.code && (
              <span
                className={`text-[8px] ${isRetro ? 'font-retro-pixel' : 'font-stats'}`}
              >
                ACTIVE
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
