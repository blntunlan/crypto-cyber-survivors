import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useIsRetro } from '../../contexts/useTheme';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemedPanel } from '../themed/ThemedPanel';
import { COLORS } from '../../config/Colors';
import { cn } from '../../utils/classnames';
import { MODERN_SCREEN_OVERLAY } from '../../config/modernSurface';

export interface OverlayChromeProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidthClassName?: string;
  panelClassName?: string;
  className?: string;
  contentClassName?: string;
  accentColor?: string;
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
  accentColor = COLORS.ELECTRIC_BLUE,
  zIndex,
  reserveBackButtonSpace = false,
}) => {
  const isRetro = useIsRetro();
  const sizes = useThemeSize();

  return (
    <div
      className={cn(
        'allow-scroll fixed inset-0 flex items-start justify-center overflow-y-auto px-3 pb-[calc(1rem+var(--sab))] pt-[calc(1rem+var(--sat))] sm:items-center sm:px-6 sm:py-6',
        reserveBackButtonSpace && 'pt-[calc(4rem+var(--sat))] sm:pt-6',
        isRetro ? 'bg-black/90' : `${MODERN_SCREEN_OVERLAY} animate-fade-in`,
        className
      )}
      style={zIndex ? { zIndex } : undefined}
    >
      <ThemedPanel
        className={cn(
          'relative my-auto w-full overflow-hidden p-5 sm:p-6',
          maxWidthClassName,
          !isRetro &&
            'bg-slate-900/95 !rounded-[1.5rem] border border-white/20 shadow-[0_20px_80px_rgba(2,6,23,0.8),0_0_0_1px_rgba(148,163,184,0.22)]',
          panelClassName
        )}
      >
        {!isRetro && (
          <>
            <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] border border-white/25" />
            <div className="pointer-events-none absolute inset-2 rounded-[1.1rem] border border-cyan-200/10" />
            <div
              className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{ boxShadow: `0 0 20px ${accentColor}40` }}
            />
          </>
        )}

        <div className={cn('relative z-10', contentClassName)}>
          {(title != null || subtitle != null) && (
            <header
              className={cn(
                'mb-5 space-y-2 text-center sm:mb-6',
                isRetro && 'font-retro-pixel'
              )}
            >
              {title && (
                <h2
                  className={cn(
                    isRetro
                      ? 'font-retro-pixel text-[#FFD600]'
                      : 'cyber-sway-text font-cyber text-white',
                    sizes.heading,
                    'font-black uppercase tracking-tight'
                  )}
                >
                  {title}
                </h2>
              )}

              {subtitle && (
                <p
                  className={cn(
                    isRetro
                      ? 'font-retro-pixel text-[#DCDCDC]'
                      : 'font-cyber text-slate-500',
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
}> = ({ label, color = COLORS.ELECTRIC_BLUE, className }) => {
  const isRetro = useIsRetro();

  return (
    <div className={cn('mb-2 flex items-center gap-2', className)}>
      <div
        className={cn(
          'h-px flex-1',
          isRetro ? 'bg-white/20' : 'bg-gradient-to-r from-transparent to-white/10'
        )}
      />
      <span
        className={cn(
          isRetro ? 'font-retro-pixel' : 'font-cyber',
          'text-[10px] font-bold uppercase tracking-[0.2em]'
        )}
        style={{ color }}
      >
        {label}
      </span>
      <div
        className={cn(
          'h-px flex-1',
          isRetro ? 'bg-white/20' : 'bg-gradient-to-l from-transparent to-white/10'
        )}
      />
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
  const isRetro = useIsRetro();
  const translated = t('common.back');
  const text = label ?? (Array.isArray(translated) ? translated[0] : translated);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={text}
      className={cn(
        'fixed flex h-11 w-11 touch-manipulation items-center justify-center gap-2 px-0 text-xs font-semibold uppercase tracking-widest transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 active:scale-95 sm:h-10 sm:w-auto sm:px-4',
        isRetro
          ? 'rounded-none border-2 border-[#39FF14]/50 bg-black/60 font-retro-pixel text-[#DCDCDC] hover:border-[#39FF14] hover:bg-[#39FF14]/10 hover:text-[#39FF14] focus-visible:ring-[#39FF14]'
          : 'rounded-lg border border-white/10 bg-slate-900/95 font-cyber text-slate-400 shadow-[0_16px_40px_rgba(2,6,23,0.55)] hover:border-cyan-400/40 hover:bg-slate-800 hover:text-white focus-visible:ring-cyan-400',
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
    </button>
  );
};
