import React from 'react';
import App from '../App';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GameProvider } from '../contexts/GameContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { applyRuntimeDebugDocumentFlags } from '../config/RuntimeDebugFlags';
import '../services/system/DebugService';

if (import.meta.env.DEV) {
  void import('../services/core/ReduxDevToolsBridge');
}

applyRuntimeDebugDocumentFlags();

const LegacyAppEntry = (): React.ReactElement => (
  <ErrorBoundary>
    <LanguageProvider>
      <ThemeProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </ThemeProvider>
    </LanguageProvider>
  </ErrorBoundary>
);

export default LegacyAppEntry;
