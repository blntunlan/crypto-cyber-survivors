/**
 * @fileoverview Tutorial Overlay Screen
 * Full-screen tutorial experience for new players
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIsMobile } from '../../hooks/useDevice';
import { TutorialSpotlight } from '../ui/TutorialSpotlight';
import { TutorialTooltip } from '../ui/TutorialTooltip';
import type { TutorialStep } from '../../config/TutorialConfig';
import { useTheme } from '../../contexts/useTheme';
import './TutorialOverlay.css';

interface TutorialOverlayProps {
  /** Current tutorial step */
  step: TutorialStep;
  /** Current step index (1-based for display) */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Whether this is the first step */
  isFirstStep: boolean;
  /** Whether this is the last step */
  isLastStep: boolean;
  /** Callback for next step */
  onNext: () => void;
  /** Callback for previous step */
  onPrev: () => void;
  /** Callback for skipping tutorial */
  onSkip: () => void;
  /** Callback for completing tutorial (on last step) */
  onComplete: () => void;
}

/**
 * Full-screen tutorial overlay with spotlight and tooltip
 * Handles keyboard navigation and theme-aware styling
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  step,
  stepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}) => {
  const { t } = useLanguage();
  const { themeName } = useTheme();
  const isMobile = useIsMobile();

  // Handle next action (either next step or complete)
  const handleNext = (): void => {
    if (isLastStep) {
      onComplete();
    } else {
      onNext();
    }
  };

  // Prevent body scroll while tutorial is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Get translated text for current step
  const title = t(step.titleKey);
  const description = t(step.descriptionKey);

  return (
    <motion.div
      className={`tutorial-overlay tutorial-overlay--${themeName}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-description"
    >
      {/* Spotlight effect (only when highlighting an element) */}
      <TutorialSpotlight
        selector={step.highlightSelector}
        padding={12}
        clickThrough={step.requiresInteraction}
        onClickOutside={handleNext}
      />

      {/* Dark overlay when no spotlight */}
      <AnimatePresence>
        {!step.highlightSelector && (
          <motion.div
            className="tutorial-overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Tutorial tooltip */}
      <TutorialTooltip
        stepId={step.id}
        title={title}
        description={description}
        icon={step.icon}
        position={step.position}
        targetSelector={step.highlightSelector}
        stepNumber={stepIndex + 1}
        totalSteps={totalSteps}
        isVisible={true}
        onNext={handleNext}
        onSkip={onSkip}
        onPrev={onPrev}
        showBack={!isFirstStep}
        isLastStep={isLastStep}
        nextText={t('tutorial.next')}
        skipText={t('tutorial.skip')}
        backText={t('tutorial.prev')}
        finishText={t('tutorial.gotIt')}
      />

      {/* Keyboard hints (desktop only — mobile uses on-screen buttons) */}
      {!isMobile && (
        <motion.div
          className="tutorial-overlay-hints"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <span className="tutorial-hint">
            <kbd>Enter</kbd> {t('tutorial.next')}
          </span>
          <span className="tutorial-hint">
            <kbd>Esc</kbd> {t('tutorial.skip')}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TutorialOverlay;
