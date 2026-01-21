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

import { LanguageProvider } from '../contexts/LanguageContext';

import { ThemeProvider } from '../contexts/ThemeContext';

import { UserProvider } from '../contexts/UserContext';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <UserProvider>
      <ThemeProvider>
        <LanguageProvider>{children}</LanguageProvider>
      </ThemeProvider>
    </UserProvider>
  );
};

const customRender = (
  ui: ReactElement,

  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';

export { customRender as render };
