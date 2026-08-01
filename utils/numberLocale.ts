import { type Language } from '../contexts/LanguageConstants';

const NUMBER_LOCALES: Record<Language, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  hi: 'hi-IN',
  vi: 'vi-VN',
  es: 'es-ES',
  pt: 'pt-BR',
  zh: 'zh-CN',
  ru: 'ru-RU',
};

export const getNumberLocale = (language: Language): string => NUMBER_LOCALES[language];
