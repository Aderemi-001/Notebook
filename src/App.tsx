import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CreateSet from "./pages/CreateSet";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import StudySetDetail from "./pages/StudySetDetail";
import StudyMode from "./pages/StudyMode"; // Import the new StudyMode component
import AuthLayout from "./layouts/AuthLayout";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <AuthLayout>
                <Index />
              </AuthLayout>
            }
          />
          <Route
            path="/create"
            element={
              <AuthLayout>
                <CreateSet />
              </AuthLayout>
            }
          />
          <Route
            path="/sets/:setId"
            element={
              <AuthLayout>
                <StudySetDetail />
              </AuthLayout>
            }
          />
          <Route
            path="/sets/:setId/study" // New route for study mode
            element={
              <AuthLayout>
                <StudyMode />
              </AuthLayout>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster richColors />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;