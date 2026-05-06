import React, { type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-gray-400 mb-4">Something went wrong.</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
        data-testid="error-retry-btn"
      >
        Try again
      </button>
    </div>
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          {this.props.fallback ?? (
            <ErrorFallback onRetry={() => this.setState({ hasError: false })} />
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
