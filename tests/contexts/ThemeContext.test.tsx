import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { useTheme } from '../../contexts/useTheme';
import { ThemedButton } from '../../components/themed/ThemedButton';

function ThemeSwitcher(): React.JSX.Element {
  const { setTheme, themeName } = useTheme();

  return (
    <>
      <output data-testid="theme-name">{themeName}</output>
      <button type="button" onClick={() => setTheme('retro-16bit')}>
        Activate retro
      </button>
    </>
  );
}

describe('ThemeProvider', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  });

  test('removes theme motion durations when reduced motion is preferred', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });

    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(
        document.documentElement.style.getPropertyValue('--ui-motion-duration-fast')
      ).toBe('0ms');
    });
  });

  test('restores a persisted skin before rendering player UI', async () => {
    localStorage.setItem('crypto-survivor-theme', 'retro-16bit');

    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-name')).toHaveTextContent('retro-16bit');
      expect(document.documentElement).toHaveAttribute('data-theme', 'retro-16bit');
    });
  });

  test('activates the selected retro skin and synchronizes it to the document', async () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Activate retro' }));

    await waitFor(() => {
      expect(screen.getByTestId('theme-name')).toHaveTextContent('retro-16bit');
      expect(document.documentElement).toHaveAttribute('data-theme', 'retro-16bit');
    });
  });

  test('disables a loading themed button and exposes its busy state', () => {
    render(
      <ThemeProvider>
        <ThemedButton loading>Launch run</ThemedButton>
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: 'Launch run' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
