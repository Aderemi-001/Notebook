/**
 * Author: Aderemi Adesanmi
 * Version: v1.0
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayout";
import PublicLayout from "@/layouts/PublicLayout";

import { CommandPalette } from "@/components/CommandPalette";

// Wrapper component to render DashboardLayout around Outlet
const DashboardLayoutWrapper = () => (
  <DashboardLayout>
    <CommandPalette />
    <Outlet />
  </DashboardLayout>
);

// Wrapper for PublicLayout
const PublicLayoutWrapper = () => (
  <PublicLayout>
    <Outlet />
  </PublicLayout>
);

// Import all page components directly
import Dashboard from "@/pages/Dashboard";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Login from "@/pages/Login";
import CreateStudySet from "@/pages/CreateStudySet";
import EditSet from "@/pages/EditSet";
import StudyMode from "@/pages/StudyMode";
import Profile from "@/pages/Profile";
import Notebook from "@/pages/Notebook";
import StudySetsLayout from "@/pages/StudySetsLayout";
import GroupsIndex from "@/pages/GroupsIndex";
import CreateGroup from "@/pages/CreateGroup";
import GroupDetail from "@/pages/GroupDetail";
import EditGroup from "@/pages/EditGroup";
import ExplorePublicSets from "@/pages/ExplorePublicSets";
import DailyReview from "@/pages/DailyReview";
import Settings from "@/pages/Settings";
import Statistics from "@/pages/Statistics";
import CognitiveConstellation from "@/pages/CognitiveConstellation";
import Collaborations from "@/pages/Collaborations";
import ExamsIndex from "@/pages/ExamsIndex";
import TakeExam from "@/pages/TakeExam";
import EssayIndex from "@/pages/EssayIndex";
import EssayPractice from "@/pages/EssayPractice";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import NotFound from "@/pages/NotFound";
import TextbookFinder from "@/pages/TextbookFinder";
import TestPage from "@/pages/TestPage";
import EmailConfirmation from "@/pages/EmailConfirmation";
import PasswordReset from "@/pages/PasswordReset";
import TermsAndConditions from "@/pages/TermsAndConditions";
import UserAgreement from "@/pages/UserAgreement";

const queryClient = new QueryClient();

import LoadingScreen from "@/components/LoadingScreen";

const App: React.FC = () => {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate initial load / branding splash
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            {/* Public Routes with Header/Footer */}
            <Route element={<PublicLayoutWrapper />}>
              <Route path="/login" element={<Login />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/confirm-email" element={<EmailConfirmation />} />
              <Route path="/reset-password" element={<PasswordReset />} />
            </Route>

            {/* Standalone Route for Agreement (No Header/Sidebar to force focus) */}
            <Route path="/user-agreement" element={<UserAgreement />} />

            {/* Dashboard Layout Routes */}
            <Route element={<DashboardLayoutWrapper />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/dashboard" element={<Statistics />} />
              <Route path="/daily-review" element={<DailyReview />} />
              <Route path="/constellation" element={<CognitiveConstellation />} />
              <Route path="/collaborations" element={<Collaborations />} />
              <Route path="/explore-public-sets" element={<ExplorePublicSets />} />
              <Route path="/textbook-finder" element={<TextbookFinder />} />
              <Route path="/test" element={<TestPage />} />

              {/* Study Sets */}
              <Route path="/create" element={<CreateStudySet />} />
              <Route path="/sets" element={<StudySetsLayout />} />
              <Route path="/sets/:setId" element={<StudySetsLayout />} />
              <Route path="/sets/:setId/edit" element={<EditSet />} />
              <Route path="/sets/:setId/study" element={<StudyMode />} />

              {/* Pro Notebook */}
              <Route path="/notebook" element={<Notebook />} />

              {/* Study Set Groups */}
              <Route path="/groups" element={<GroupsIndex />} />
              <Route path="/groups/create" element={<CreateGroup />} />
              <Route path="/groups/:groupId" element={<GroupDetail />} />
              <Route path="/groups/:groupId/edit" element={<EditGroup />} />

              {/* Exams / Quiz */}
              <Route path="/exams" element={<ExamsIndex />} />
              <Route path="/quiz/:examId" element={<TakeExam />} />

              {/* Essay Practice */}
              <Route path="/essays" element={<EssayIndex />} />
              <Route path="/essay-practice/:questionId" element={<EssayPractice />} />
            </Route>

            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;