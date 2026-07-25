import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemedPanel } from '../themed/ThemedPanel';
import { ThemedButton } from '../themed/ThemedButton';
import { useUiSkin } from '../themed/useUiSkin';
import { cn } from '../../utils/classnames';

export interface OverlayChromeProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidthClassName?: string;
  panelClassName?: string;
  className?: string;
  contentClassName?: string;
  accentColor?: string;
  overlayPriority?: 'critical' | 'decision' | 'utility';
  zIndex?: number;
  reserveBackButtonSpace?: boolean;
}

export const OverlayChrome: React.FC<OverlayChromeProps> = ({
  children,
  title,
  subtitle,
  maxWidthClassName = 'max-w-xl',
  panelClassName,
  className,
  contentClassName,
  accentColor = 'var(--ui-action-primary-surface)',
  overlayPriority,
  zIndex,
  reserveBackButtonSpace = false,
}) => {
  const skin = useUiSkin();
  const sizes = useThemeSize();

  return (
    <div
      className={cn(
        'allow-scroll fixed inset-0 flex items-start justify-center overflow-y-auto px-3 pb-[calc(1rem+var(--sab))] pt-[calc(1rem+var(--sat))] sm:items-center sm:px-6 sm:py-6',
        reserveBackButtonSpace && 'pt-[calc(4rem+var(--sat))] sm:pt-6',
        skin.overlay.backdrop,
        className
      )}
      style={zIndex ? { zIndex } : undefined}
    >
      <ThemedPanel
        data-testid="overlay-chrome-surface"
        data-overlay-style={skin.overlay.style}
        data-overlay-priority={overlayPriority}
        className={cn(
          'relative my-auto w-full overflow-hidden p-5 sm:p-6',
          maxWidthClassName,
          panelClassName
        )}
      >
        <div
          aria-hidden="true"
          className={skin.overlay.decoration}
          style={{
            boxShadow: `0 0 12px color-mix(in srgb, ${accentColor} 20%, transparent)`,
          }}
        />

        <div className={cn('relative z-10', contentClassName)}>
          {(title != null || subtitle != null) && (
            <header
              className={cn('mb-5 space-y-2 text-center sm:mb-6', skin.overlay.header)}
            >
              {title && (
                <h2
                  className={cn(
                    skin.overlay.title,
                    sizes.heading,
                    'font-black uppercase tracking-tight'
                  )}
                  style={{ color: accentColor }}
                >
                  {title}
                </h2>
              )}

              {subtitle && (
                <p
                  className={cn(
                    skin.overlay.subtitle,
                    sizes.tiny,
                    'uppercase tracking-[0.2em]'
                  )}
                >
                  {subtitle}
                </p>
              )}
            </header>
          )}

          {children}
        </div>
      </ThemedPanel>
    </div>
  );
};

export const OverlaySectionRail: React.FC<{
  label: React.ReactNode;
  color?: string;
  className?: string;
}> = ({ label, color = 'var(--ui-action-primary-surface)', className }) => {
  const skin = useUiSkin();

  return (
    <div className={cn('mb-2 flex items-center gap-2', className)}>
      <div className={cn('h-px flex-1', skin.overlay.railLine)} />
      <span
        className={cn(
          skin.overlay.rail,
          'text-[10px] font-bold uppercase tracking-[0.2em]'
        )}
        style={{ color }}
      >
        {label}
      </span>
      <div className={cn('h-px flex-1', skin.overlay.railLine)} />
    </div>
  );
};

interface OverlayBackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  zIndex?: number;
}

export const OverlayBackButton: React.FC<OverlayBackButtonProps> = ({
  onClick,
  label,
  className,
  zIndex = 260,
}) => {
  const { t } = useLanguage();
  const translated = t('common.back');
  const text = label ?? (Array.isArray(translated) ? translated[0] : translated);

  return (
    <ThemedButton
      size="sm"
      intent="secondary"
      onClick={onClick}
      aria-label={text}
      className={cn(
        'fixed h-11 w-11 px-0 active:scale-95 sm:h-auto sm:w-auto sm:px-3',
        className
      )}
      style={{
        top: 'calc(1rem + env(safe-area-inset-top, 0px))',
        left: 'calc(1rem + env(safe-area-inset-left, 0px))',
        zIndex,
      }}
    >
      <ArrowLeft className="pointer-events-none h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{text}</span>
    </ThemedButton>
  );
};
