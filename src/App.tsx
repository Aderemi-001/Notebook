import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CreateSet from "./pages/CreateSet";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import StudySetDetail from "./pages/StudySetDetail";
import StudyMode from "./pages/StudyMode";
import EditSet from "./pages/EditSet";
import Profile from "./pages/Profile";
import CognitiveConstellation from "./pages/CognitiveConstellation";
import ExplorePublicSets from "./pages/ExplorePublicSets"; // Import the new page
import AuthLayout from "./layouts/AuthLayout";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react"; // Import React for React.Fragment

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <React.Fragment>
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
              path="/sets/:setId/study"
              element={
                <AuthLayout>
                  <StudyMode />
                </AuthLayout>
              }
            />
            <Route
              path="/sets/:setId/edit"
              element={
                <AuthLayout>
                  <EditSet />
                </AuthLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <AuthLayout>
                  <Profile />
                </AuthLayout>
              }
            />
            <Route
              path="/constellation"
              element={
                <AuthLayout>
                  <CognitiveConstellation />
                </AuthLayout>
              }
            />
            <Route
              path="/explore" // New route for ExplorePublicSets
              element={
                <AuthLayout>
                  <ExplorePublicSets />
                </AuthLayout>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster richColors />
        </React.Fragment>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;