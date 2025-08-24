import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppContent from "@/components/AppContent";
import * as React from "react";
import { BrowserRouter } from "react-router-dom"; // Removed Routes and Route from here as they will be inside AppContent
import { AuthProvider } from "@/hooks/useAuth";
import AuthLayout from "@/layouts/AuthLayout"; // Import AuthLayout

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AuthLayout> {/* AuthLayout now wraps AppContent */}
            <AppContent />
          </AuthLayout>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;