/**
 * @fileoverview Tutorial Tooltip Component
 * Animated tooltip that displays tutorial step content with optional selection UI
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TutorialPosition } from '../../config/TutorialConfig';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/useTheme';
import { type ThemeName } from '../../types/theme';
import './TutorialTooltip.css';

interface TooltipPosition {
  top: number;
  left: number;
  transformOrigin: string;
}

interface TutorialTooltipProps {
  /** Current Step ID */
  stepId?: string;
  /** Tooltip title */
  title: string;
  /** Tooltip description */
  description: string;
  /** Icon to display (emoji or component) */
  icon?: string;
  /** Position relative to target or screen */
  position: TutorialPosition;
  /** CSS selector of target element (for positioning) */
  targetSelector?: string;
  /** Current step number */
  stepNumber: number;
  /** Total number of steps */
  totalSteps: number;
  /** Whether this is visible */
  isVisible: boolean;
  /** Callback for next button */
  onNext: () => void;
  /** Callback for skip button */
  onSkip: () => void;
  /** Callback for previous button */
  onPrev?: () => void;
  /** Whether to show back button */
  showBack?: boolean;
  /** Whether this is the last step */
  isLastStep?: boolean;
  /** Text for next button */
  nextText: string;
  /** Text for skip button */
  skipText: string;
  /** Text for back button */
  backText?: string;
  /** Text for finish button (last step) */
  finishText?: string;
}

/**
 * Calculate tooltip position based on target element
 */
function calculatePosition(
  position: TutorialPosition,
  targetSelector: string | undefined,
  tooltipWidth: number,
  tooltipHeight: number
): TooltipPosition {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // Center position (default)
  if (!targetSelector || position === 'center') {
    return {
      top: Math.max(20, (windowHeight - tooltipHeight) / 2),
      left: Math.max(20, (windowWidth - tooltipWidth) / 2),
      transformOrigin: 'center center',
    };
  }

  const target = document.querySelector(targetSelector);
  if (!target) {
    return {
      top: (windowHeight - tooltipHeight) / 2,
      left: (windowWidth - tooltipWidth) / 2,
      transformOrigin: 'center center',
    };
  }

  const targetRect = target.getBoundingClientRect();
  const padding = 20;

  switch (position) {
    case 'top':
      return {
        top: Math.max(padding, targetRect.top - tooltipHeight - padding),
        left: Math.max(
          padding,
          Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            windowWidth - tooltipWidth - padding
          )
        ),
        transformOrigin: 'center bottom',
      };
    case 'bottom':
      return {
        top: Math.min(
          windowHeight - tooltipHeight - padding,
          targetRect.bottom + padding
        ),
        left: Math.max(
          padding,
          Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            windowWidth - tooltipWidth - padding
          )
        ),
        transformOrigin: 'center top',
      };
    case 'left':
      return {
        top: Math.max(
          padding,
          Math.min(
            targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
            windowHeight - tooltipHeight - padding
          )
        ),
        left: Math.max(padding, targetRect.left - tooltipWidth - padding),
        transformOrigin: 'right center',
      };
    case 'right':
      return {
        top: Math.max(
          padding,
          Math.min(
            targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
            windowHeight - tooltipHeight - padding
          )
        ),
        left: Math.min(
          windowWidth - tooltipWidth - padding,
          targetRect.right + padding
        ),
        transformOrigin: 'left center',
      };
    default:
      return {
        top: (windowHeight - tooltipHeight) / 2,
        left: (windowWidth - tooltipWidth) / 2,
        transformOrigin: 'center center',
      };
  }
}

/**
 * Animated tutorial tooltip with step content and selection UI
 */
export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
  stepId,
  title,
  description,
  icon,
  position,
  targetSelector,
  stepNumber,
  totalSteps,
  isVisible,
  onNext,
  onSkip,
  onPrev,
  showBack = false,
  isLastStep = false,
  nextText,
  skipText,
  backText = 'Back',
  finishText = 'Got it!',
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage } = useLanguage();
  const { setTheme, themeName, isRetro } = useTheme();
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    transformOrigin: 'center center',
  });

  useEffect(() => {
    if (!isVisible) return;

    const updatePosition = (): void => {
      const width = tooltipRef.current?.offsetWidth ?? 440;
      const height = tooltipRef.current?.offsetHeight ?? 250;
      setTooltipPos(calculatePosition(position, targetSelector, width, height));
    };

    // Initial position
    requestAnimationFrame(updatePosition);

    // Update on resize
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isVisible, position, targetSelector, stepId]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      } else if (e.key === 'Backspace' && showBack && onPrev) {
        e.preventDefault();
        onPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onNext, onSkip, onPrev, showBack]);

  const renderLanguageSelection = () => (
    <div className="tutorial-selection-grid">
      {SUPPORTED_LANGUAGES.map(lang => (
        <motion.button
          key={lang}
          className={`tutorial-selection-item ${language === lang ? 'active' : ''}`}
          onClick={() => setLanguage(lang)}
        >
          <span className="lang-code">{lang.toUpperCase()}</span>
          <span className="lang-label">
            {lang === 'en'
              ? 'English'
              : lang === 'tr'
                ? 'Türkçe'
                : lang === 'es'
                  ? 'Español'
                  : lang === 'pt'
                    ? 'Português'
                    : lang === 'hi'
                      ? 'हिन्दी'
                      : lang === 'vi'
                        ? 'Tiếng Việt'
                        : lang === 'zh'
                          ? '中文'
                          : lang === 'ru'
                            ? 'Русский'
                            : lang}
          </span>
          {language === lang && (
            <motion.div
              layoutId="active-lang"
              className="active-indicator"
              initial={false}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );

  const renderThemeSelection = () => (
    <div className="tutorial-selection-grid theme-selection">
      <motion.button
        className={`tutorial-selection-item theme-cyberpunk ${themeName === 'cyberpunk' ? 'active' : ''}`}
        onClick={() => setTheme('cyberpunk' as ThemeName)}
      >
        <div className="theme-preview cyberpunk-preview" />
        <span className="theme-label">Cyberpunk</span>
        {themeName === 'cyberpunk' && (
          <motion.div
            layoutId="active-theme"
            className="active-indicator"
            initial={false}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
      </motion.button>
      <motion.button
        className={`tutorial-selection-item theme-retro-16bit ${themeName === 'retro-16bit' ? 'active' : ''}`}
        onClick={() => setTheme('retro-16bit' as ThemeName)}
      >
        <div className="theme-preview retro-preview" />
        <span className="theme-label">Retro Pixel</span>
        {themeName === 'retro-16bit' && (
          <motion.div
            layoutId="active-theme"
            className="active-indicator"
            initial={false}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
      </motion.button>
    </div>
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={tooltipRef}
          className={`tutorial-tooltip theme-${themeName}`}
          data-theme-name={themeName}
          data-is-retro={isRetro}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transformOrigin: tooltipPos.transformOrigin,
          }}
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -15 }}
          transition={{
            opacity: { duration: 0.3 },
            scale: { duration: 0.4 },
            y: { duration: 0.4 },
          }}
        >
          {/* Progress bar */}
          <div className="tutorial-tooltip-progress">
            <motion.div
              className="tutorial-tooltip-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(stepNumber / totalSteps) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {/* Header */}
          <div className="tutorial-tooltip-header">
            {icon && <span className="tutorial-tooltip-icon">{icon}</span>}
            <h3 className="tutorial-tooltip-title">{title}</h3>
          </div>

          {/* Content */}
          <div className="tutorial-tooltip-body" style={{ minHeight: '120px' }}>
            <p className="tutorial-tooltip-description">{description}</p>

            {/* Special Selection UI */}
            <div className="tutorial-extra-content">
              {stepId === 'language-selection' && renderLanguageSelection()}
              {stepId === 'theme-selection' && renderThemeSelection()}
            </div>
          </div>

          {/* Footer */}
          <div className="tutorial-tooltip-footer">
            <span className="tutorial-tooltip-step">
              {stepNumber} / {totalSteps}
            </span>

            <div className="tutorial-tooltip-actions">
              <button
                type="button"
                className="tutorial-tooltip-btn tutorial-tooltip-btn-skip"
                onClick={onSkip}
              >
                {skipText}
              </button>

              <div className="nav-group">
                {showBack && onPrev && stepNumber > 1 && (
                  <button
                    type="button"
                    className="tutorial-tooltip-btn tutorial-tooltip-btn-back"
                    onClick={onPrev}
                  >
                    {backText}
                  </button>
                )}

                <button
                  type="button"
                  className="tutorial-tooltip-btn tutorial-tooltip-btn-next"
                  onClick={onNext}
                  autoFocus
                >
                  {isLastStep ? finishText : nextText}
                </button>
              </div>
            </div>
          </div>

          {/* Step dots */}
          <div className="tutorial-tooltip-dots">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={`tutorial-tooltip-dot ${i + 1 === stepNumber ? 'active' : ''} ${i + 1 < stepNumber ? 'completed' : ''}`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TutorialTooltip;
