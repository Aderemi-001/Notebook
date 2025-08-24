import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppContent from "@/components/AppContent";
import * as React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // Import Routes and Route
import { AuthProvider } from "@/hooks/useAuth";
// Removed: import { ThemeProvider } from "./components/ThemeProvider.tsx";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes> {/* Add Routes here for the direct test */}
            <Route path="/direct-test" element={
              <div className="min-h-screen flex items-center justify-center bg-blue-100 text-blue-800 text-2xl font-bold">
                Direct Test Page Works!
              </div>
            } />
            <Route path="*" element={<AppContent />} /> {/* Render AppContent for all other routes */}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;