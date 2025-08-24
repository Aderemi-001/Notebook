import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import StudySets from "@/pages/StudySets";
import StudySet from "@/pages/StudySet";
import Cards from "@/pages/Cards";
import Account from "@/pages/Account";
import Settings from "@/pages/Settings";
import Notes from "@/pages/Notes";
import Note from "@/pages/Note";
import Concepts from "@/pages/Concepts";
import Concept from "@/pages/Concept";
import Exams from "@/pages/Exams";
import Exam from "@/pages/Exam";
import EssayQuestions from "@/pages/EssayQuestions";
import EssayQuestion from "@/pages/EssayQuestion";
import Contact from "@/pages/Contact";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { AuthLayout } from "@/layouts/AuthLayout"; // Corrected import
import TextbookFinder from "@/pages/TextbookFinder"; // Import the new page

export default function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthLayout />}>
          <Route index element={<Index />} />
          <Route path="login" element={<Login />} />
          <Route path="contact" element={<Contact />} />
          <Route path="textbook-finder" element={<TextbookFinder />} /> {/* Add the new route */}
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="study-sets" element={<StudySets />} />
            <Route path="study-sets/:id" element={<StudySet />} />
            <Route path="study-sets/:setId/cards" element={<Cards />} />
            <Route path="notes" element={<Notes />} />
            <Route path="notes/:id" element={<Note />} />
            <Route path="concepts" element={<Concepts />} />
            <Route path="concepts/:id" element={<Concept />} />
            <Route path="exams" element={<Exams />} />
            <Route path="exams/:id" element={<Exam />} />
            <Route path="essay-questions" element={<EssayQuestions />} />
            <Route path="essay-questions/:id" element={<EssayQuestion />} />
            <Route path="account" element={<Account />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}