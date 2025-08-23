import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";

import Index from "@/pages/Index";
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
import Collaborations from "@/pages/Collaborations";
import AuthLayout from "@/layouts/AuthLayout";
import * as React from "react";
import { useDueCardsCount } from "@/hooks/use-due-cards-count";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { toast } from "sonner";
import { format } from 'date-fns';
import Chatbot from "./Chatbot";
import { supabase } from "@/integrations/supabase/client";
import CreateSet from "@/pages/CreateSet";

const AppContent: React.FC = () => {
  const { data: dueCardsCount, isLoading: isLoadingDueCards } = useDueCardsCount();
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();
  const [lastReminderShownDate, setLastReminderShownDate] = React.useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastDailyReviewReminderDate');
    }
    return null;
  });
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!isLoadingDueCards && !isLoadingPreferences && preferences && dueCardsCount !== undefined) {
      const today = format(new Date(), 'yyyy-MM-dd');

      if (preferences.enable_review_reminders && dueCardsCount > 0 && lastReminderShownDate !== today) {
        toast.info(
          `You have ${dueCardsCount} cards due for review!`,
          {
            description: "Click here to start studying.",
            action: {
              label: "Study Now",
              onClick: () => {
                window.location.href = "/daily-review";
                localStorage.setItem('lastDailyReviewReminderDate', today);
                setLastReminderShownDate(today);
              },
            },
            duration: 10000,
            onDismiss: () => {
              localStorage.setItem('lastDailyReviewReminderDate', today);
              setLastReminderShownDate(today);
            },
            onAutoClose: () => {
              localStorage.setItem('lastDailyReviewReminderDate', today);
              setLastReminderShownDate(today);
            },
          }
        );
      } else if (dueCardsCount === 0 && lastReminderShownDate !== null) {
        localStorage.removeItem('lastDailyReviewReminderDate');
        setLastReminderShownDate(null);
      }
    }
  }, [dueCardsCount, isLoadingDueCards, preferences, isLoadingPreferences, lastReminderShownDate]);

  return (
    <TooltipProvider>
      <Toaster richColors />
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <AuthLayout><Index /></AuthLayout>
              }
            />
            <Route
              path="/create"
              element={
                <AuthLayout><CreateSet /></AuthLayout>
              }
            />
            <Route
              path="/sets/:setId"
              element={
                <AuthLayout><StudySetDetail /></AuthLayout>
              }
            />
            <Route
              path="/sets/:setId/study"
              element={
                <AuthLayout><StudyMode /></AuthLayout>
              }
            />
            <Route
              path="/sets/:setId/edit"
              element={
                <AuthLayout><EditSet /></AuthLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <AuthLayout><Profile /></AuthLayout>
              }
            />
            <Route
              path="/constellation"
              element={
                <AuthLayout><CognitiveConstellation /></AuthLayout>
              }
            />
            <Route
              path="/explore-public-sets"
              element={
                <AuthLayout><ExplorePublicSets /></AuthLayout>
              }
            />
            <Route
              path="/generate-exam"
              element={
                <AuthLayout><GenerateExam /></AuthLayout>
              }
            />
            <Route
              path="/generate-essay-questions"
              element={
                <AuthLayout><GenerateEssayQuestions /></AuthLayout>
              }
            />
            <Route
              path="/past-essay-questions"
              element={
                <AuthLayout><PastEssayQuestions /></AuthLayout>
              }
            />
            <Route
              path="/essay-practice/:questionId"
              element={
                <AuthLayout><EssayPractice /></AuthLayout>
              }
            />
            <Route
              path="/exams/:examId"
              element={
                <AuthLayout><TakeExam /></AuthLayout>
              }
            />
            <Route
              path="/past-exams"
              element={
                <AuthLayout><PastExams /></AuthLayout>
              }
            />
            <Route path="/settings" element={<AuthLayout><Settings /></AuthLayout>} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/notes"
              element={
                <AuthLayout><NotesIndex /></AuthLayout>
              }
            />
            <Route
              path="/create-note"
              element={
                <AuthLayout><CreateNote /></AuthLayout>
              }
            />
            <Route
              path="/notes/:noteId/edit"
              element={
                <AuthLayout><EditNote /></AuthLayout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <AuthLayout><Statistics /></AuthLayout>
              }
            />
            <Route
              path="/daily-review"
              element={
                <AuthLayout><DailyReview /></AuthLayout>
              }
            />
            <Route
              path="/groups"
              element={
                <AuthLayout><GroupsIndex /></AuthLayout>
              }
            />
            <Route
              path="/groups/create"
              element={
                <AuthLayout><CreateGroup /></AuthLayout>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <AuthLayout><GroupDetail /></AuthLayout>
              }
            />
            <Route
              path="/groups/:groupId/edit"
              element={
                <AuthLayout><EditGroup /></AuthLayout>
              }
            />
            <Route
              path="/collaborations"
              element={
                <AuthLayout><Collaborations /></AuthLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster richColors />
          {isLoggedIn && <Chatbot />}
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default AppContent;