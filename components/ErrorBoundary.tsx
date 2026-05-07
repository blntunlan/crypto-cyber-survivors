/**
 * ErrorBoundary - React Error Boundary Component
 *
 * Catches JavaScript errors anywhere in child component tree,
 * logs them, and displays a fallback UI.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Logger } from '../services/system/Logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // If it's a dynamic import failure (usually due to a new deployment replacing old chunks),
    // we can attempt an automatic page reload once to fetch the new index.html and chunks.
    if (
      error.message &&
      (error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Importing a module script failed'))
    ) {
      // Use sessionStorage to prevent an infinite reload loop if the new chunk is TRULY missing
      const isReloading = sessionStorage.getItem('app-chunk-reload');
      if (!isReloading) {
        sessionStorage.setItem('app-chunk-reload', 'true');
        window.location.reload();
        return { hasError: false, error: null }; // Returning false because we are reloading
      } else {
        // If we already reloaded and it STILL failed, clear the flag and show error
        sessionStorage.removeItem('app-chunk-reload');
      }
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Clear the reload flag on successful load without chunk errors
    // Actually, it's better to clear it elsewhere, but componentDidCatch only runs on error.

    Logger.error('React Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo });
  }

  componentDidMount() {
    // Clear the chunk reload flag when the app loads successfully
    sessionStorage.removeItem('app-chunk-reload');
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0D0D0D',
            color: '#f8fafc',
            fontFamily: 'monospace',
            padding: '2rem',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontSize: '3rem',
                color: '#ef4444',
                marginBottom: '1rem',
              }}
            >
              💥 LIQUIDATED
            </h1>
            <h2
              style={{
                fontSize: '1.5rem',
                color: '#94a3b8',
                marginBottom: '2rem',
              }}
            >
              Something went wrong
            </h2>

            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '2rem',
                textAlign: 'left',
                fontSize: '0.875rem',
                color: '#f87171',
                maxHeight: '200px',
                overflow: 'auto',
              }}
            >
              <strong>Error:</strong> {this.state.error?.message ?? 'Unknown error'}
              {import.meta.env.DEV && this.state.error?.stack && (
                <pre
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    color: '#94a3b8',
                  }}
                >
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <button
              onClick={this.handleRetry}
              style={{
                backgroundColor: '#22c55e',
                color: '#000',
                border: 'none',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                borderRadius: '8px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              🔄 Try Again
            </button>

            <p
              style={{
                marginTop: '2rem',
                fontSize: '0.875rem',
                color: '#64748b',
              }}
            >
              If this error persists, try refreshing the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
