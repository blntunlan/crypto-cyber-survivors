import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GameProvider } from './contexts/GameContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './services/system/DebugService'; // Initialize debug tools
if (import.meta.env.DEV) {
  void import('./services/core/ReduxDevToolsBridge'); // Bridge EventBus to Redux DevTools (DEV only)
}

import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { applyRuntimeDebugDocumentFlags } from './config/RuntimeDebugFlags';

applyRuntimeDebugDocumentFlags();

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
