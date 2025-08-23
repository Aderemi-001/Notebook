import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppContent from "@/components/AppContent";
import * as React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AuthLayout from "@/layouts/AuthLayout"; // Import AuthLayout

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AuthLayout> {/* Wrap AppContent with AuthLayout */}
            <AppContent />
          </AuthLayout>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;