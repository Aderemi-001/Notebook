import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth"; // Import AuthProvider

import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Notes from "./pages/Notes";
import CreateNote from "./pages/CreateNote";
import EditNote from "./pages/EditNote";
import NoteDetail from "./pages/NoteDetail";
import StudySets from "./pages/StudySets";
import CreateStudySet from "./pages/CreateStudySet";
import EditStudySet from "./pages/EditStudySet";
import StudySetDetail from "./pages/StudySetDetail";
import StudySession from "./pages/StudySession";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import Concepts from "./pages/Concepts";
import CreateConcept from "./pages/CreateConcept";
import EditConcept from "./pages/EditConcept";
import ConceptDetail from "./pages/ConceptDetail";
import GeneratedQuestions from "./pages/GeneratedQuestions";
import CreateGeneratedQuestion from "./pages/CreateGeneratedQuestion";
import EditGeneratedQuestion from "./pages/EditGeneratedQuestion";
import GeneratedQuestionDetail from "./pages/GeneratedQuestionDetail";
import Exams from "./pages/Exams";
import CreateExam from "./pages/CreateExam";
import EditExam from "./pages/EditExam";
import ExamDetail from "./pages/ExamDetail";
import EssayQuestions from "./pages/EssayQuestions";
import CreateEssayQuestion from "./pages/CreateEssayQuestion";
import EditEssayQuestion from "./pages/EditEssayQuestion";
import EssayQuestionDetail from "./pages/EssayQuestionDetail";
import EssayResponses from "./pages/EssayResponses";
import CreateEssayResponse from "./pages/CreateEssayResponse";
import EditEssayResponse from "./pages/EditEssayResponse";
import EssayResponseDetail from "./pages/EssayResponseDetail";
import LearningContent from "./pages/LearningContent";
import CreateLearningContent from "./pages/CreateLearningContent";
import EditLearningContent from "./pages/EditLearningContent";
import LearningContentDetail from "./pages/LearningContentDetail";
import StudySetGroups from "./pages/StudySetGroups";
import CreateStudySetGroup from "./pages/CreateStudySetGroup";
import EditStudySetGroup from "./pages/EditStudySetGroup";
import StudySetGroupDetail from "./pages/StudySetGroupDetail";
import PublicStudySets from "./pages/PublicStudySets";
import Layout from "./components/Layout";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router>
          <AuthProvider> {/* Wrap with AuthProvider */}
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Index />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="login" element={<Login />} />
                <Route path="notes" element={<Notes />} />
                <Route path="notes/new" element={<CreateNote />} />
                <Route path="notes/:id" element={<NoteDetail />} />
                <Route path="notes/:id/edit" element={<EditNote />} />
                <Route path="study-sets" element={<StudySets />} />
                <Route path="study-sets/new" element={<CreateStudySet />} />
                <Route path="study-sets/:id" element={<StudySetDetail />} />
                <Route path="study-sets/:id/edit" element={<EditStudySet />} />
                <Route path="study-sets/:id/study" element={<StudySession />} />
                <Route path="public-study-sets" element={<PublicStudySets />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="concepts" element={<Concepts />} />
                <Route path="concepts/new" element={<CreateConcept />} />
                <Route path="concepts/:id" element={<ConceptDetail />} />
                <Route path="concepts/:id/edit" element={<EditConcept />} />
                <Route path="generated-questions" element={<GeneratedQuestions />} />
                <Route path="generated-questions/new" element={<CreateGeneratedQuestion />} />
                <Route path="generated-questions/:id" element={<GeneratedQuestionDetail />} />
                <Route path="generated-questions/:id/edit" element={<EditGeneratedQuestion />} />
                <Route path="exams" element={<Exams />} />
                <Route path="exams/new" element={<CreateExam />} />
                <Route path="exams/:id" element={<ExamDetail />} />
                <Route path="exams/:id/edit" element={<EditExam />} />
                <Route path="essay-questions" element={<EssayQuestions />} />
                <Route path="essay-questions/new" element={<CreateEssayQuestion />} />
                <Route path="essay-questions/:id" element={<EssayQuestionDetail />} />
                <Route path="essay-questions/:id/edit" element={<EditEssayQuestion />} />
                <Route path="essay-responses" element={<EssayResponses />} />
                <Route path="essay-responses/new" element={<CreateEssayResponse />} />
                <Route path="essay-responses/:id" element={<EssayResponseDetail />} />
                <Route path="essay-responses/:id/edit" element={<EditEssayResponse />} />
                <Route path="learning-content" element={<LearningContent />} />
                <Route path="learning-content/new" element={<CreateLearningContent />} />
                <Route path="learning-content/:id" element={<LearningContentDetail />} />
                <Route path="learning-content/:id/edit" element={<EditLearningContent />} />
                <Route path="study-set-groups" element={<StudySetGroups />} />
                <Route path="study-set-groups/new" element={<CreateStudySetGroup />} />
                <Route path="study-set-groups/:id" element={<StudySetGroupDetail />} />
                <Route path="study-set-groups/:id/edit" element={<EditStudySetGroup />} />
              </Route>
            </Routes>
          </AuthProvider>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;