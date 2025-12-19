import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GameProvider } from './contexts/GameContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './services/DebugService'; // Initialize debug tools

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <GameProvider>
        <App />
      </GameProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
