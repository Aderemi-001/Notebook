import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
// Removed: import ProtectedRoute from "@/components/ProtectedRoute"; // This component is not used in the current routing structure
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Login from "@/pages/Login";
import StudySetDetail from "@/pages/StudySetDetail";
import CreateStudySet from "@/pages/CreateStudySet";
import EditSet from "@/pages/EditSet";
import StudyMode from "@/pages/StudyMode";
import NotesIndex from "@/pages/NotesIndex";
import CreateNote from "@/pages/CreateNote";
import EditNote from "@/pages/EditNote";
import Profile from "@/pages/Profile";
import GroupsIndex from "@/pages/GroupsIndex";
import CreateGroup from "@/pages/CreateGroup";
import GroupDetail from "@/pages/GroupDetail";
import EditGroup from "@/pages/EditGroup";
import ExplorePublicSets from "@/pages/ExplorePublicSets";
import DailyReview from "@/pages/DailyReview";
import Settings from "@/pages/Settings";
import Statistics from "@/pages/Statistics"; // This is the new Dashboard
import CognitiveConstellation from "@/pages/CognitiveConstellation";
import Collaborations from "@/pages/Collaborations";
import ExamsIndex from "@/pages/ExamsIndex";
import GenerateExam from "@/pages/GenerateExam";
import PastExams from "@/pages/PastExams";
import TakeExam from "@/pages/TakeExam";
import EssayIndex from "@/pages/EssayIndex";
import GenerateEssayQuestions from "@/pages/GenerateEssayQuestions";
import PastEssayQuestions from "@/pages/PastEssayQuestions";
import EssayPractice from "@/pages/EssayPractice";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import NotFound from "@/pages/NotFound";
import { AuthLayout } from "@/layouts/AuthLayout"; // Corrected to named import
import TextbookFinder from "@/pages/TextbookFinder";

const AppContent = () => {
  return (
    <AuthLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dashboard" element={<Statistics />} />
        <Route path="/daily-review" element={<DailyReview />} />
        <Route path="/constellation" element={<CognitiveConstellation />} />
        <Route path="/collaborations" element={<Collaborations />} />
        <Route path="/explore-public-sets" element={<ExplorePublicSets />} />
        <Route path="/textbook-finder" element={<TextbookFinder />} />

        {/* Study Sets */}
        <Route path="/create" element={<CreateStudySet />} />
        <Route path="/sets/:setId" element={<StudySetDetail />} />
        <Route path="/sets/:setId/edit" element={<EditSet />} />
        <Route path="/sets/:setId/study" element={<StudyMode />} />

        {/* Notes */}
        <Route path="/notes" element={<NotesIndex />} />
        <Route path="/create-note" element={<CreateNote />} />
        <Route path="/notes/:noteId/edit" element={<EditNote />} />

        {/* Study Set Groups */}
        <Route path="/groups" element={<GroupsIndex />} />
        <Route path="/groups/create" element={<CreateGroup />} />
        <Route path="/groups/:groupId" element={<GroupDetail />} />
        <Route path="/groups/:groupId/edit" element={<EditGroup />} />

        {/* Exams */}
        <Route path="/exams" element={<ExamsIndex />} />
        <Route path="/generate-exam" element={<GenerateExam />} />
        <Route path="/past-exams" element={<PastExams />} />
        <Route path="/exams/:examId" element={<TakeExam />} />

        {/* Essays */}
        <Route path="/essays" element={<EssayIndex />} />
        <Route path="/generate-essay-questions" element={<GenerateEssayQuestions />} />
        <Route path="/past-essay-questions" element={<PastEssayQuestions />} />
        <Route path="/essay-practice/:questionId" element={<EssayPractice />} />

        {/* Catch-all for 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthLayout>
  );
};

export default AppContent;