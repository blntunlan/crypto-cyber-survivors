/**
 * Test for blank screen bug - LanguageProvider loading issue
 *
 * This test reproduces the blank screen issue that occurs when
 * translation files fail to load or are not yet loaded.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageProvider';
import { useLanguage } from '../contexts/useLanguage';

// Mock fetch to simulate translation loading failure
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Test component that uses useLanguage hook
const TestComponent = () => {
  const { t, language } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="loading-text">{t('common.loading_engine')}</span>
    </div>
  );
};

describe('LanguageProvider - Blank Screen Bug', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorage.clear();
    window.history.pushState(null, '', '/');
  });

  it('should show fallback text when translations fail to load', async () => {
    // Mock fetch to fail (simulating network issue)
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Should show the key as fallback when translation fails
    await waitFor(() => {
      expect(screen.getByTestId('loading-text')).toHaveTextContent(
        'common.loading_engine'
      );
    });
  });

  it('should show fallback text when translations are empty', async () => {
    // Mock fetch to return empty JSON
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({}),
    });

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Should show the key as fallback when translation is not found
    await waitFor(() => {
      expect(screen.getByTestId('loading-text')).toHaveTextContent(
        'common.loading_engine'
      );
    });
  });

  it('should handle missing translation key gracefully', async () => {
    // Mock fetch to return translations without the key we need
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          common: {
            start: 'Start Game',
            // missing 'loading_engine' key
          },
        }),
    });

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Should show the key as fallback when translation is missing
    await waitFor(() => {
      expect(screen.getByTestId('loading-text')).toHaveTextContent(
        'common.loading_engine'
      );
    });
  });

  it('should render correctly when translations load properly', async () => {
    // Mock fetch to return proper translations
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          common: {
            loading_engine: 'LOADING ENGINE...',
          },
        }),
    });

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Should show the translated text
    await waitFor(
      () => {
        expect(screen.getByTestId('loading-text')).toHaveTextContent(
          'LOADING ENGINE...'
        );
      },
      { timeout: 2000 }
    );
  });

  it('uses the language prefix from the current URL before stored preferences', async () => {
    localStorage.setItem('game_lang', 'en');
    window.history.pushState(null, '', '/tr/privacy');
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          common: {
            loading_engine: 'MOTOR YUKLENIYOR...',
          },
        }),
    });

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language')).toHaveTextContent('tr');
    });
    await waitFor(() => {
      expect(screen.getByTestId('loading-text')).toHaveTextContent('MOTOR');
    });
  });

  it('keeps unprefixed public legal routes in the default language', async () => {
    localStorage.setItem('game_lang', 'tr');
    window.history.pushState(null, '', '/privacy');
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          common: {
            loading_engine: 'LOADING ENGINE...',
          },
        }),
    });

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language')).toHaveTextContent('en');
    });
  });

  it('keeps the stored language on the app root after landing has been seen', async () => {
    localStorage.setItem('game_lang', 'tr');
    localStorage.setItem('has_seen_landing', 'true');
    window.history.pushState(null, '', '/');
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          common: {
            loading_engine: 'MOTOR',
          },
        }),
    });

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('language')).toHaveTextContent('tr');
    });
  });
});
