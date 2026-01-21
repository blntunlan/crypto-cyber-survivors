import React, { useState, useEffect, type ReactNode } from 'react';
import { LanguageContext } from './LanguageContextDefinition';
import { type Language } from './LanguageConstants';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Helper to determine initial language
  const getInitialLanguage = (): Language => {
    // 1. Priority: User's saved preference
    const saved = localStorage.getItem('game_lang') as Language | null;
    if (saved && ['en', 'tr', 'hi', 'vi', 'es', 'pt'].includes(saved)) {
      return saved;
    }

    // 2. Priority: Browser/Device language
    try {
      const browserLang = navigator.language.split('-')[0] as Language; // 'tr-TR' -> 'tr'
      if (['en', 'tr', 'hi', 'vi', 'es', 'pt'].includes(browserLang)) {
        return browserLang;
      }
    } catch {
      // Ignore errors in non-browser envs
    }

    // 3. Fallback
    return 'en';
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const [translations, setTranslations] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const response = await fetch(`/locales/${language}/common.json`);
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error('Failed to load translations:', error);
      }
    };
    void loadTranslations();
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('game_lang', lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // Fallback to key name if not found
      }
    }

    if (typeof value !== 'string') return key;

    let result = value;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(`{{${k}}}`, v.toString());
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
