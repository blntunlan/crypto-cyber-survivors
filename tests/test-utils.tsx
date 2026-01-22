/* eslint-disable react-refresh/only-export-components */
import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { useGameStore } from '../stores/gameStore';

/**
 * Reset all global stores to their default state.
 * Call this in beforeEach to ensure test isolation.
 */
export const resetAllStores = () => {
  useGameStore.getState().resetSettings();
  useGameStore.getState().resetProgress();
  useGameStore.getState().startNewSession();
};

/**
 * Mock Service Generator
 * Creates a type-safe mock of any service for testing interactions.
 */
export const createServiceMock = <T extends object>(methods: Array<keyof T>) => {
  const mock: any = {};
  methods.forEach(method => {
    mock[method] = vi.fn();
  });
  return mock as T;
};

import { LanguageContext } from '../contexts/LanguageContextDefinition';
import { ThemeContext } from '../contexts/themeContextDef';
import { cyberpunkTheme } from '../config/themes';
import { UserContext } from '../contexts/UserContext';

const MockLanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const t = (key: string) => key;
  return (
    <LanguageContext.Provider value={{ language: 'en', setLanguage: () => {}, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

const MockThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeContext.Provider
      value={{
        theme: cyberpunkTheme,
        themeName: 'cyberpunk',
        setTheme: () => {},
        toggleTheme: () => {},
        isRetro: false,
        isTransitioning: false,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

const MockUserProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <UserContext.Provider
      value={{
        user: null,
        isAuthenticated: false,
        isLoading: false,
        playerId: 'test-player-id',
        nickname: 'TestPlayer',
        login: async () => ({ success: true }),
        logout: () => {},
        updateLastSeen: async () => {},
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockUserProvider>
      <MockThemeProvider>
        <MockLanguageProvider>{children}</MockLanguageProvider>
      </MockThemeProvider>
    </MockUserProvider>
  );
};

const customRender = (
  ui: ReactElement,

  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';

export { customRender as render };
