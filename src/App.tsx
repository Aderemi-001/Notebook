import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppContent from "@/components/AppContent"; // Import the new AppContent component
import * as React from "react";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;