/**
 * useDevShortcuts - Developer Keyboard Shortcuts Hook
 *
 * Handles development-only keyboard shortcuts:
 * - Ctrl+Shift+A: Toggle Analytics Dashboard
 * - Ctrl+Shift+D: Toggle Admin Dashboard
 *
 * Only active in development mode (import.meta.env.DEV)
 */

import { useEffect, useState, useCallback } from 'react';

interface DevShortcutsState {
  /** Whether Analytics Dashboard is open */
  showAnalytics: boolean;
  /** Whether Admin Dashboard is open */
  showAdminDashboard: boolean;
  /** Whether VFX Lab is open */
  showVfxLab: boolean;
  /** Close Analytics Dashboard */
  closeAnalytics: () => void;
  /** Close Admin Dashboard */
  closeAdminDashboard: () => void;
  /** Close VFX Lab */
  closeVfxLab: () => void;
}

/**
 * Hook to handle developer keyboard shortcuts
 * @returns State and controls for dev panels
 */
export function useDevShortcuts(): DevShortcutsState {
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState<boolean>(false);
  const [showVfxLab, setShowVfxLab] = useState<boolean>(false);

  // Analytics Dashboard: Ctrl+Shift+A
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAnalytics(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Admin Dashboard: Ctrl+Shift+D
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowAdminDashboard(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // VFX Lab: Ctrl+Shift+V
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
        e.preventDefault();
        setShowVfxLab(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowVfxLab(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeAnalytics = useCallback(() => setShowAnalytics(false), []);
  const closeAdminDashboard = useCallback(() => setShowAdminDashboard(false), []);
  const closeVfxLab = useCallback(() => setShowVfxLab(false), []);

  return {
    showAnalytics,
    showAdminDashboard,
    showVfxLab,
    closeAnalytics,
    closeAdminDashboard,
    closeVfxLab,
  };
}
