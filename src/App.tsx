import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import AppContent from "./components/AppContent"; // Import the new AppContent component

const queryClient = new QueryClient();

// Define a simple ErrorBoundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              Oops! Something went wrong.
            </h1>
            <p className="mb-2">
              We're sorry, but an unexpected error occurred.
            </p>
            {this.state.error && (
              <div className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 p-3 rounded-md text-sm text-left break-all">
                <p className="font-semibold">Error Message:</p>
                <p>{this.state.error.message}</p>
                {/* Uncomment below for stack trace in development */}
                {/* <pre className="mt-2 text-xs whitespace-pre-wrap">{this.state.error.stack}</pre> */}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div>
          <AppContent />
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;