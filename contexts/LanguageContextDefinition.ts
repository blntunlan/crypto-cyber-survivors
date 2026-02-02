import { createContext } from 'react';
import { type Language } from './LanguageConstants';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string | string[];
}

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);
