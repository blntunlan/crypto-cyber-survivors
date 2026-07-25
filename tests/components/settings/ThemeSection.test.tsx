import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ThemeSection } from '../../../components/settings/ThemeSection';

const setTheme = vi.fn();

vi.mock('../../../contexts/useTheme', () => ({
  useTheme: () => ({
    themeName: 'cyberpunk',
    setTheme,
  }),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) =>
      ({
        'settings.theme': 'Visual style',
        'settings.theme_cyber': 'Cyberpunk',
        'settings.theme_retro': '16-Bit',
      })[key] ?? key,
  }),
}));

describe('ThemeSection', () => {
  beforeEach(() => {
    setTheme.mockReset();
  });

  test('lets a player activate the retro skin', () => {
    render(<ThemeSection />);

    fireEvent.click(screen.getByRole('button', { name: '16-Bit' }));

    expect(setTheme).toHaveBeenCalledWith('retro-16bit');
  });
});
