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
import GenerateExam from "./pages/GenerateExam";
import TakeExam from "./pages/TakeExam";
import PastExams from "./pages/PastExams";
import SearchSets from "./pages/SearchSets";
import AuthLayout from "./layouts/AuthLayout";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
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
              {/* Removed ExplorePublicSets route */}
              <Route
                path="/generate-exam"
                element={
                  <AuthLayout>
                    <GenerateExam />
                  </AuthLayout>
                }
              />
              <Route
                path="/exams/:examId"
                element={
                  <AuthLayout>
                    <TakeExam />
                  </AuthLayout>
                }
              />
              <Route
                path="/past-exams"
                element={
                  <AuthLayout>
                    <PastExams />
                  </AuthLayout>
                }
              />
              <Route
                path="/search"
                element={
                  <AuthLayout>
                    <SearchSets />
                  </AuthLayout>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster richColors />
          </React.Fragment>
        </BrowserRouter>
      </div>
    </QueryClientProvider>
  );
}

export default App;