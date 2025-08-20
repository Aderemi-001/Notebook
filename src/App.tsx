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
import NotesIndex from "./pages/NotesIndex";
import CreateNote from "./pages/CreateNote";
import EditNote from "./pages/EditNote";
import AuthLayout from "./layouts/AuthLayout";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

const queryClient = new QueryClient();

// Define a simple ErrorBoundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              Oops! Something went wrong.
            </h1>
            <p className="mb-2">
              We're sorry, but an unexpected error occurred.
            </p>
            {this.state.error && (
              <div className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 p-3 rounded-md text-sm text-left break-all">
                <p className="font-semibold">Error Message:</p>
                <p>{this.state.error.message}</p>
                {/* Uncomment below for stack trace in development */}
                {/* <pre className="mt-2 text-xs whitespace-pre-wrap">{this.state.error.stack}</pre> */}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary> {/* Wrap the entire application with the ErrorBoundary */}
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
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;