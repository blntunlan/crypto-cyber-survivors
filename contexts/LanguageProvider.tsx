import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { LanguageContext } from './LanguageContextDefinition';
import { SUPPORTED_LANGUAGES, type Language } from './LanguageConstants';

const LANGUAGE_STORAGE_KEY = 'game_lang';

async function fetchLanguageTranslations(
  language: Language
): Promise<Record<string, unknown>> {
  const response = await fetch(`/locales/${language}/common.json`);
  if ('ok' in response && !response.ok) {
    throw new Error(`Failed to load translations for ${language}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

const getInitialLanguage = (): Language => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
      return saved;
    }
  } catch {
    // Ignore localStorage errors in non-browser or restricted environments.
  }

  try {
    const browserLang = navigator.language.split('-')[0] as Language;
    if (SUPPORTED_LANGUAGES.includes(browserLang)) {
      return browserLang;
    }
  } catch {
    // Ignore navigator access errors in non-browser envs.
  }

  return 'en';
};

const resolveTranslationValue = (
  translations: Record<string, unknown>,
  key: string
): unknown => {
  const keys = key.split('.');
  let value: unknown = translations;

  for (const segment of keys) {
    if (value && typeof value === 'object' && segment in value) {
      value = (value as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }

  return value;
};

const applyTranslationParams = (
  input: string,
  params?: Record<string, string | number>
): string => {
  if (!params) return input;

  let result = input;
  Object.entries(params).forEach(([paramKey, paramValue]) => {
    result = result.replace(`{{${paramKey}}}`, paramValue.toString());
  });

  return result;
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());
  const [translations, setTranslations] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let isCancelled = false;

    const loadTranslations = async () => {
      try {
        const data = await fetchLanguageTranslations(language);
        if (!isCancelled) {
          setTranslations(data);
        }
      } catch (error) {
        console.error('Failed to load translations:', error);
      }
    };

    void loadTranslations();

    return () => {
      isCancelled = true;
    };
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors and continue with in-memory language state.
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const value = resolveTranslationValue(translations, key);
      if (value == null) return key;

      if (Array.isArray(value)) {
        const stringItems = value
          .filter((item): item is string => typeof item === 'string')
          .map(item => applyTranslationParams(item, params));
        return stringItems.join('\n');
      }

      if (typeof value !== 'string') return key;
      return applyTranslationParams(value, params);
    },
    [translations]
  );

  const contextValue = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>
  );
};
