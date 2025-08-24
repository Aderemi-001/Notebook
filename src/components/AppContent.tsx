import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Login from "@/pages/Login";
import StudySetDetail from "@/pages/StudySetDetail";
import CreateStudySet from "@/pages/CreateStudySet"; // Renamed and imported
import EditSet from "@/pages/EditSet"; // Imported
import StudyMode from "@/pages/StudyMode"; // Imported
import NotesIndex from "@/pages/NotesIndex"; // Imported
import CreateNote from "@/pages/CreateNote"; // Imported
import EditNote from "@/pages/EditNote"; // Imported
import Profile from "@/pages/Profile"; // Imported
import GroupsIndex from "@/pages/GroupsIndex"; // Imported
import CreateGroup from "@/pages/CreateGroup"; // Imported
import GroupDetail from "@/pages/GroupDetail"; // Imported
import EditGroup from "@/pages/EditGroup"; // Imported
import ExplorePublicSets from "@/pages/ExplorePublicSets"; // Imported
import DailyReview from "@/pages/DailyReview"; // Imported
import Settings from "@/pages/Settings"; // Imported
import Statistics from "@/pages/Statistics"; // Imported
import CognitiveConstellation from "@/pages/CognitiveConstellation"; // Imported
import Collaborations from "@/pages/Collaborations"; // Imported
import ExamsIndex from "@/pages/ExamsIndex"; // Imported
import GenerateExam from "@/pages/GenerateExam"; // Imported
import PastExams from "@/pages/PastExams"; // Imported
import TakeExam from "@/pages/TakeExam"; // Imported
import EssayIndex from "@/pages/EssayIndex"; // Imported
import GenerateEssayQuestions from "@/pages/GenerateEssayQuestions"; // Imported
import PastEssayQuestions from "@/pages/PastEssayQuestions"; // Imported
import EssayPractice from "@/pages/EssayPractice"; // Imported
import PrivacyPolicy from "@/pages/PrivacyPolicy"; // Imported
import NotFound from "@/pages/NotFound"; // Imported

const AppContent = () => {
  return (
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
  );
};

export default AppContent;