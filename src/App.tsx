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
import ExplorePublicSets from "./pages/ExplorePublicSets";
import SearchCards from "./pages/SearchCards";
import GenerateEssayQuestions from "./pages/GenerateEssayQuestions";
import PastEssayQuestions from "./pages/PastEssayQuestions";
import EssayPractice from "./pages/EssayPractice";
import Settings from "./pages/Settings";
import NotesIndex from "./pages/NotesIndex"; // Import new NotesIndex page
import CreateNote from "./pages/CreateNote"; // Import new CreateNote page
import EditNote from "./pages/EditNote"; // Import new EditNote page
import AuthLayout from "./layouts/AuthLayout";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

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
              <Route
                path="/explore-public-sets"
                element={
                  <AuthLayout>
                    <ExplorePublicSets />
                  </AuthLayout>
                }
              />
              <Route
                path="/search-cards"
                element={
                  <AuthLayout>
                    <SearchCards />
                  </AuthLayout>
                }
              />
              <Route
                path="/generate-exam"
                element={
                  <AuthLayout>
                    <GenerateExam />
                  </AuthLayout>
                }
              />
              <Route
                path="/generate-essay-questions"
                element={
                  <AuthLayout>
                    <GenerateEssayQuestions />
                  </AuthLayout>
                }
              />
              <Route
                path="/past-essay-questions"
                element={
                  <AuthLayout>
                    <PastEssayQuestions />
                  </AuthLayout>
                }
              />
              <Route
                path="/essay-practice/:questionId"
                element={
                  <AuthLayout>
                    <EssayPractice />
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
              <Route path="/settings" element={<AuthLayout><Settings /></AuthLayout>} />
              <Route path="/login" element={<Login />} />
              {/* New Notes Routes */}
              <Route
                path="/notes"
                element={
                  <AuthLayout>
                    <NotesIndex />
                  </AuthLayout>
                }
              />
              <Route
                path="/create-note"
                element={
                  <AuthLayout>
                    <CreateNote />
                  </AuthLayout>
                }
              />
              <Route
                path="/notes/:noteId/edit"
                element={
                  <AuthLayout>
                    <EditNote />
                  </AuthLayout>
                }
              />
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