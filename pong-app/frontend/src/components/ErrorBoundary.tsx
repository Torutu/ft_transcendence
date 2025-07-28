// // components/ErrorBoundary.tsx
// import { Component, ErrorInfo, ReactNode } from 'react';

// interface Props {
//   children: ReactNode;
//   fallback: ReactNode;
// }

// interface State {
//   hasError: boolean;
// }

// class ErrorBoundary extends Component<Props, State> {
//   state: State = { hasError: false };

//   static getDerivedStateFromError(_: Error): State {
//     return { hasError: true };
//   }

//   componentDidCatch(error: Error, errorInfo: ErrorInfo) {
//     console.error("Uncaught error:", error, errorInfo);
//   }

//   render() {
//     if (this.state.hasError) {
//       return this.props.fallback;
//     }
//     return this.props.children;
//   }
// }

// export default ErrorBoundary;


import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    // You can log errors to an error reporting service here
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="mb-4">Please refresh the page and try again.</p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="text-sm cursor-pointer">Error details</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;