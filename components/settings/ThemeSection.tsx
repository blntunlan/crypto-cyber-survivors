/**
 * ThemeSection - Theme Selection Settings
 *
 * Allows users to switch between Cyberpunk and 16-bit Retro themes.
 * Supports keyboard navigation with separate focus for each theme.
 */

import { memo } from 'react';
import { useTheme } from '../../contexts/useTheme';
import { IconCyberpunk, IconSparkles } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemedBadge } from '../themed/ThemedBadge';
import { ThemedButton } from '../themed/ThemedButton';

export const ThemeSection = memo(
  ({ focusedItem = null }: { focusedItem?: 'cyberpunk' | 'retro-16bit' | null }) => {
    const { setTheme, themeName } = useTheme();
    const { t } = useLanguage();

    const themeChoices = [
      {
        icon: IconCyberpunk,
        id: 'cyberpunk' as const,
        label: t('settings.theme_cyber'),
      },
      {
        icon: IconSparkles,
        id: 'retro-16bit' as const,
        label: t('settings.theme_retro'),
      },
    ];

    return (
      <section className="space-y-3 md:space-y-4">
        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 md:text-xs">
          <IconSparkles className="h-3.5 w-3.5" />
          <span>{t('settings.theme')}</span>
        </h3>

        <div className="space-y-2">
          {themeChoices.map(choice => {
            const Icon = choice.icon;
            const isActive = themeName === choice.id;

            return (
              <ThemedButton
                key={choice.id}
                type="button"
                intent={isActive ? 'primary' : 'secondary'}
                selected={isActive || focusedItem === choice.id}
                aria-pressed={isActive}
                className="w-full justify-between text-left"
                onClick={() => setTheme(choice.id)}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{choice.label}</span>
                </span>
                {isActive && <ThemedBadge tone="success">Active</ThemedBadge>}
              </ThemedButton>
            );
          })}
        </div>
      </section>
    );
  }
);

ThemeSection.displayName = 'ThemeSection';
