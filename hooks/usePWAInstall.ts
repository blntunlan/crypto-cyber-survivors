/**
 * @file usePWAInstall.ts
 * @description Hook for managing PWA installation prompt
 *
 * Captures the beforeinstallprompt event and provides methods to:
 * - Check if the app is installable
 * - Trigger the install prompt
 * - Track installation status
 */

import { useState, useEffect, useCallback } from 'react';
import { Logger } from '../services/system/Logger';

/** BeforeInstallPromptEvent interface for TypeScript */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/** PWA Install hook return type */
interface UsePWAInstallResult {
  /** Whether the app can be installed (prompt is available) */
  canInstall: boolean;
  /** Whether the app is already installed (standalone mode) */
  isInstalled: boolean;
  /** Whether the install prompt is currently showing */
  isPrompting: boolean;
  /** Whether the user dismissed the prompt */
  wasDismissed: boolean;
  /** Trigger the install prompt */
  install: () => Promise<boolean>;
  /** Platform info from the prompt event */
  platforms: string[];
}

/** Storage key for tracking dismissal */
const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hook to manage PWA installation
 *
 * @example
 * ```tsx
 * const { canInstall, install, isInstalled } = usePWAInstall();
 *
 * if (canInstall && !isInstalled) {
 *   return <button onClick={install}>Install App</button>;
 * }
 * ```
 */
export function usePWAInstall(): UsePWAInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [wasDismissed, setWasDismissed] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);

  // Check if app is already installed (standalone mode)
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error - iOS Safari specific
        window.navigator.standalone === true;

      setIsInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Check if user previously dismissed the prompt
  useEffect(() => {
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const dismissTime = parseInt(dismissedAt, 10);
        if (Date.now() - dismissTime < DISMISS_DURATION_MS) {
          setWasDismissed(true);
        } else {
          // Clear old dismissal
          localStorage.removeItem(DISMISS_KEY);
        }
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Capture the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setPlatforms(promptEvent.platforms ?? []);

      Logger.info('[PWA] Install prompt captured', {
        platforms: promptEvent.platforms,
      });
    };

    const handleAppInstalled = () => {
      Logger.info('[PWA] App was installed');
      setIsInstalled(true);
      setDeferredPrompt(null);

      // Clear any dismissal on install
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        // Ignore
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Install function
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      Logger.warn('[PWA] No install prompt available');
      return false;
    }

    setIsPrompting(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user response
      const { outcome } = await deferredPrompt.userChoice;

      Logger.info('[PWA] User response', { outcome });

      if (outcome === 'dismissed') {
        setWasDismissed(true);
        // Store dismissal time
        try {
          localStorage.setItem(DISMISS_KEY, Date.now().toString());
        } catch {
          // Ignore
        }
        return false;
      }

      // User accepted
      setDeferredPrompt(null);
      return true;
    } catch (error) {
      Logger.error('[PWA] Install error', error);
      return false;
    } finally {
      setIsPrompting(false);
    }
  }, [deferredPrompt]);

  return {
    canInstall: deferredPrompt !== null && !wasDismissed,
    isInstalled,
    isPrompting,
    wasDismissed,
    install,
    platforms,
  };
}

export default usePWAInstall;
