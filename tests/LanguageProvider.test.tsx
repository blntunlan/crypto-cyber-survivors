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
  const { t } = useLanguage();
  return (
    <div>
      <span data-testid="loading-text">{t('common.loading_engine')}</span>
    </div>
  );
};

describe('LanguageProvider - Blank Screen Bug', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorage.clear();
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
});
