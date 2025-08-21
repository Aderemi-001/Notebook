import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import CreateSet from "@/pages/CreateSet";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import StudySetDetail from "@/pages/StudySetDetail";
import StudyMode from "@/pages/StudyMode";
import EditSet from "@/pages/EditSet";
import Profile from "@/pages/Profile";
import CognitiveConstellation from "@/pages/CognitiveConstellation";
import GenerateExam from "@/pages/GenerateExam";
import TakeExam from "@/pages/TakeExam";
import PastExams from "@/pages/PastExams";
import ExplorePublicSets from "@/pages/ExplorePublicSets";
import GenerateEssayQuestions from "@/pages/GenerateEssayQuestions";
import PastEssayQuestions from "@/pages/PastEssayQuestions";
import EssayPractice from "@/pages/EssayPractice";
import Settings from "@/pages/Settings";
import NotesIndex from "@/pages/NotesIndex";
import CreateNote from "@/pages/CreateNote";
import EditNote from "@/pages/EditNote";
import Statistics from "@/pages/Statistics";
import DailyReview from "@/pages/DailyReview";
import CreateGroup from "@/pages/CreateGroup";
import GroupsIndex from "@/pages/GroupsIndex";
import EditGroup from "@/pages/EditGroup";
import GroupDetail from "@/pages/GroupDetail";
import Collaborations from "@/pages/Collaborations"; // Import Collaborations
import AuthLayout from "@/layouts/AuthLayout";
import { Toaster } from "@/components/ui/sonner";
import * as React from "react";
import { useDueCardsCount } from "@/hooks/use-due-cards-count";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { toast } from "sonner";

const AppContent: React.FC = () => {
  const { data: dueCardsCount, isLoading: isLoadingDueCards } = useDueCardsCount();
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();
  const [reminderShown, setReminderShown] = React.useState(false);

  React.useEffect(() => {
    if (!isLoadingDueCards && !isLoadingPreferences && preferences && dueCardsCount !== undefined) {
      if (preferences.enable_review_reminders && dueCardsCount > 0 && !reminderShown) {
        toast.info(
          `You have ${dueCardsCount} cards due for review!`,
          {
            description: "Click here to start studying.",
            action: {
              label: "Study Now",
              onClick: () => {
                window.location.href = "/"; // Navigate to the main page where due cards are visible
              },
            },
            duration: 10000, // Show for 10 seconds
            onDismiss: () => setReminderShown(true), // Mark as shown when dismissed
            onAutoClose: () => setReminderShown(true), // Mark as shown when auto-closed
          }
        );
        // Set reminderShown to true immediately to prevent multiple toasts on first load
        setReminderShown(true);
      } else if (dueCardsCount === 0) {
        // Reset reminderShown if no cards are due, so it can show again later if cards become due
        setReminderShown(false);
      }
    }
  }, [dueCardsCount, isLoadingDueCards, preferences, isLoadingPreferences, reminderShown]);

  return (
    <>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
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
            {/* Notes Routes */}
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
            {/* Statistics Route */}
            <Route
              path="/dashboard"
              element={
                <AuthLayout>
                  <Statistics />
                </AuthLayout>
              }
            />
            {/* Daily Review Route */}
            <Route
              path="/daily-review"
              element={
                <AuthLayout>
                  <DailyReview />
                </AuthLayout>
              }
            />
            {/* Group Routes */}
            <Route
              path="/groups"
              element={
                <AuthLayout>
                  <GroupsIndex />
                </AuthLayout>
              }
            />
            <Route
              path="/groups/create"
              element={
                <AuthLayout>
                  <CreateGroup />
                </AuthLayout>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <AuthLayout>
                  <GroupDetail />
                </AuthLayout>
              }
            />
            <Route
              path="/groups/:groupId/edit"
              element={
                <AuthLayout>
                  <EditGroup />
                </AuthLayout>
              }
            />
            {/* Collaborations Route */}
            <Route
              path="/collaborations"
              element={
                <AuthLayout>
                  <Collaborations />
                </AuthLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster richColors />
        </React.Fragment>
      </BrowserRouter>
    </>
  );
};

export default AppContent;