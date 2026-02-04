import React, { Component, type ErrorInfo } from 'react';
import { type ErrorBoundaryState } from './types';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  debugInfo: string;
}

export class LevelUpErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[LevelUpScreen Error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-red-900/90 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-sm border-2 border-red-500 bg-black/80 p-6 font-debug text-sm text-white">
            <h2 className="mb-4 text-2xl font-bold text-red-500">
              ⚠️ LevelUpScreen Error
            </h2>
            <div className="mb-4">
              <p className="font-bold text-yellow-400">Error:</p>
              <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-2">
                {this.state.error?.message}
              </pre>
            </div>
            <div className="mb-4">
              <p className="font-bold text-yellow-400">Stack:</p>
              <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-2 text-xs">
                {this.state.error?.stack}
              </pre>
            </div>
            <div className="mb-4">
              <p className="font-bold text-yellow-400">Debug Info:</p>
              <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-2 text-xs">
                {this.props.debugInfo}
              </pre>
            </div>
            <div>
              <p className="font-bold text-yellow-400">Component Stack:</p>
              <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-2 text-xs">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
