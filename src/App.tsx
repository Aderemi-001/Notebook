import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppContent from "@/components/AppContent";
import * as React from "react";
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter
import { AuthProvider } from "@/hooks/useAuth"; // Import AuthProvider

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter> {/* Wrap with BrowserRouter */}
        <AuthProvider> {/* Wrap with AuthProvider */}
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;