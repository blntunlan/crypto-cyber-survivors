export type Language = 'en' | 'tr' | 'hi' | 'vi' | 'es' | 'pt' | 'zh' | 'ru';
export type RouteLanguage = Exclude<Language, 'en'>;

export const DEFAULT_LANGUAGE: Language = 'en';
export const SUPPORTED_LANGUAGES: Language[] = [
  'en',
  'tr',
  'hi',
  'vi',
  'es',
  'pt',
  'zh',
  'ru',
];

export const ROUTE_LANGUAGES: RouteLanguage[] = [
  'tr',
  'hi',
  'vi',
  'es',
  'pt',
  'zh',
  'ru',
];

export const isSupportedLanguage = (value: string): value is Language =>
  SUPPORTED_LANGUAGES.includes(value as Language);

export const isRouteLanguage = (value: string): value is RouteLanguage =>
  ROUTE_LANGUAGES.includes(value as RouteLanguage);
