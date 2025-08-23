import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Login from "@/pages/Login";
import StudySetDetail from "@/pages/StudySetDetail";
import StudySetForm from "@/pages/StudySetForm";
import StudyPage from "@/pages/StudyPage";
import NotesPage from "@/pages/NotesPage";
import NoteDetail from "@/pages/NoteDetail";
import ProfilePage from "@/pages/ProfilePage";
import StudySetGroupForm from "@/pages/StudySetGroupForm";
import StudySetGroupDetail from "@/pages/StudySetGroupDetail";
import ExplorePublicSets from "@/pages/ExplorePublicSets"; // Import the new component

const AppContent = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/sets/:setId" element={<StudySetDetail />} />
      <Route path="/sets/new" element={<StudySetForm />} />
      <Route path="/sets/:setId/edit" element={<StudySetForm />} />
      <Route path="/sets/:setId/study" element={<StudyPage />} />
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/notes/new" element={<NoteDetail />} />
      <Route path="/notes/:noteId" element={<NoteDetail />} />
      <Route path="/groups/new" element={<StudySetGroupForm />} />
      <Route path="/groups/:groupId" element={<StudySetGroupDetail />} />
      <Route path="/groups/:groupId/edit" element={<StudySetGroupForm />} />
      <Route path="/explore-public-sets" element={<ExplorePublicSets />} /> {/* Add the new route */}
    </Routes>
  );
};

export default AppContent;