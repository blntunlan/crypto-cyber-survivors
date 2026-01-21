import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GameProvider } from './contexts/GameContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './services/DebugService'; // Initialize debug tools

import { LanguageProvider } from './contexts/LanguageContext';

// ========================================
// PWA Scroll Prevention
// Prevents iOS Safari bounce/scroll in standalone PWA mode
// ========================================
const preventScroll = (e: TouchEvent) => {
  // Allow scroll on elements that explicitly need it (e.g., scrollable modals)
  const target = e.target as HTMLElement;
  if (target.closest('.allow-scroll')) return;

  // Prevent default scroll behavior on document level
  if (e.touches.length === 1) {
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
        <GameProvider>
          <App />
        </GameProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
