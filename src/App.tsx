import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppContent from "@/AppContent"; // Corrected import path
import * as React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
// Removed: import { ThemeProvider } from "./components/ThemeProvider.tsx";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;