import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GameProvider } from './contexts/GameContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './services/system/DebugService'; // Initialize debug tools

import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

// ========================================
// PWA Scroll Prevention
// Prevents iOS Safari bounce/scroll in standalone PWA mode
// ========================================
const preventScroll = (e: TouchEvent) => {
  // Allow scroll on elements that explicitly need it (e.g., scrollable modals)
  const target = e.target as HTMLElement;

  // Check for .allow-scroll class or elements that have overflow-y: auto/scroll
  const scrollableParent = target.closest(
    '.allow-scroll, [style*="overflow-y: auto"], [style*="overflow-y: scroll"]'
  );

  // Also check computed style if class/inline style not found
  if (scrollableParent) return;

  // If we can't find it via attributes, check computed style for more robustness
  // but only if it's not a common non-scrollable tag to save performance
  if (target.tagName !== 'CANVAS' && target.tagName !== 'DIV') {
    const computedStyle = window.getComputedStyle(target);
    if (computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll') {
      return;
    }
  }

  // Prevent default scroll behavior on document level
  if (e.touches.length === 1) {
    // Only prevent if we are NOT inside a scrollable element
    e.preventDefault();
  }
};

// Add event listener with passive: false to allow preventDefault
document.addEventListener('touchmove', preventScroll, { passive: false });

// Also prevent touchstart scroll on iOS
document.addEventListener(
  'touchstart',
  e => {
    const target = e.target as HTMLElement;
    // Don't prevent on inputs/buttons/controls
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('.allow-scroll')
    ) {
      return;
    }
    // This helps prevent the initial scroll gesture registration
  },
  { passive: true }
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <GameProvider>
            <App />
          </GameProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
