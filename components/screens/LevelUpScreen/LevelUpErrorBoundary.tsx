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
          <div className="max-w-2xl w-full bg-black/80 border-2 border-red-500 rounded-xl p-6 text-white font-debug text-sm overflow-auto max-h-[80vh]">
            <h2 className="text-2xl font-bold text-red-500 mb-4">
              ⚠️ LevelUpScreen Error
            </h2>
            <div className="mb-4">
              <p className="text-yellow-400 font-bold">Error:</p>
              <pre className="bg-gray-900 p-2 rounded mt-1 overflow-x-auto">
                {this.state.error?.message}
              </pre>
            </div>
            <div className="mb-4">
              <p className="text-yellow-400 font-bold">Stack:</p>
              <pre className="bg-gray-900 p-2 rounded mt-1 overflow-x-auto text-xs">
                {this.state.error?.stack}
              </pre>
            </div>
            <div className="mb-4">
              <p className="text-yellow-400 font-bold">Debug Info:</p>
              <pre className="bg-gray-900 p-2 rounded mt-1 overflow-x-auto text-xs">
                {this.props.debugInfo}
              </pre>
            </div>
            <div>
              <p className="text-yellow-400 font-bold">Component Stack:</p>
              <pre className="bg-gray-900 p-2 rounded mt-1 overflow-x-auto text-xs">
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
