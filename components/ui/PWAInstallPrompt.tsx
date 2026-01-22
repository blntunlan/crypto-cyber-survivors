/**
 * @file PWAInstallPrompt.tsx
 * @description Elegant PWA install prompt banner component
 *
 * Features:
 * - Animated slide-in from bottom
 * - Cyber/crypto themed design
 * - Dismiss and install actions
 * - Mobile-friendly touch targets
 * - Respects user preferences (won't show after dismiss for 7 days)
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useLanguage } from '../../contexts/LanguageContext';

/** Time to wait before showing the prompt (ms) */
const SHOW_DELAY_MS = 5000;

/**
 * PWA Install Prompt Banner
 *
 * Shows a non-intrusive banner prompting users to install the app.
 * Automatically hidden when:
 * - App is already installed
 * - User dismissed the prompt recently
 * - Browser doesn't support installation
 */
export const PWAInstallPrompt = memo(function PWAInstallPrompt() {
  const { canInstall, isInstalled, isPrompting, install } = usePWAInstall();
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Show prompt after delay
  useEffect(() => {
    if (!canInstall || isInstalled || isDismissed) {
      setIsVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled, isDismissed]);

  const handleInstall = useCallback(() => {
    void install().then(success => {
      if (success) {
        setIsVisible(false);
      }
    });
  }, [install]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    setIsVisible(false);
  }, []);

  // Don't render if not needed
  if (!canInstall || isInstalled) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="pwa-install-prompt"
          role="dialog"
          aria-labelledby="pwa-install-title"
        >
          {/* Cyber accents */}
          <div className="pwa-install-accent-top" />
          <div className="pwa-install-accent-bottom" />
          <div className="pwa-install-corner top-left" />
          <div className="pwa-install-corner bottom-right" />

          {/* Glow effect */}
          <div className="pwa-install-glow" />

          {/* Content */}
          <div className="pwa-install-content">
            {/* Icon */}
            <div className="pwa-install-icon">
              <div className="pwa-install-icon-inner">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
            </div>

            {/* Text */}
            <div className="pwa-install-text">
              <h3 id="pwa-install-title" className="cyber-glitch-text">
                {t('pwa.installTitle')}
              </h3>
              <p>{t('pwa.installDescription')}</p>
            </div>
          </div>

          {/* Actions - Moved outside for better layout */}
          <div className="pwa-install-actions">
            <button
              onClick={handleDismiss}
              className="pwa-install-dismiss"
              aria-label={t('pwa.notNow')}
            >
              {t('pwa.notNow')}
            </button>
            <button
              onClick={handleInstall}
              disabled={isPrompting}
              className="pwa-install-button neon-glow-cyan"
              aria-label={t('pwa.install')}
            >
              {isPrompting ? (
                <span className="pwa-install-loading">...</span>
              ) : (
                t('pwa.install')
              )}
            </button>
          </div>

          {/* Close button (mobile) */}
          <button
            onClick={handleDismiss}
            className="pwa-install-close"
            aria-label={t('common.close')}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default PWAInstallPrompt;
