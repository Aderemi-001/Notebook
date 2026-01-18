/**
 * Author: Aderemi Adesanmi
 * Version: v3.0
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "./hooks/useSubscription";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PomodoroProvider } from "@/contexts/PomodoroContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import PublicLayout from "@/layouts/PublicLayout";
import { motion, AnimatePresence } from "framer-motion";

import { CommandPalette } from "@/components/CommandPalette";

// Wrapper component to render DashboardLayout around Outlet
// Also wraps with AgreementGuard to ensure terms are accepted
import AgreementGuard from "@/components/AgreementGuard";

const DashboardLayoutWrapper = () => (
  <AgreementGuard>
    <DashboardLayout>
      <CommandPalette />
      <Outlet />
    </DashboardLayout>
  </AgreementGuard>
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
import PomodoroTimer from "@/pages/PomodoroTimer";
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
import Collaborations from "@/pages/Collaborations";
import ExamsIndex from "@/pages/ExamsIndex";
import TakeExam from "@/pages/TakeExam";
import EssayIndex from "@/pages/EssayIndex";
import EssayPractice from "@/pages/EssayPractice";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import GenerateEssayQuestions from "@/pages/GenerateEssayQuestions";

import NotFound from "@/pages/NotFound";
import TextbookFinder from "@/pages/TextbookFinder";
import TestPage from "@/pages/TestPage";
import EmailConfirmation from "@/pages/EmailConfirmation";
import PasswordReset from "@/pages/PasswordReset";
import TermsAndConditions from "@/pages/TermsAndConditions";
import UserAgreement from "@/pages/UserAgreement";
import Pricing from "@/pages/Pricing";
import PaymentResult from "@/pages/PaymentResult";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminOverview } from "@/pages/admin/AdminOverview";
import { AdminUsers } from "@/pages/admin/AdminUsers";
import { AdminContent } from "@/pages/admin/AdminContent";
import { AdminBroadcasts } from "@/pages/admin/AdminBroadcasts";
import { AdminLogs } from "@/pages/admin/AdminLogs";
import { AdminSettings } from "@/pages/admin/AdminSettings";
import AdminTransactions from "@/pages/admin/AdminTransactions";

const queryClient = new QueryClient();

import LoadingScreen from "@/components/LoadingScreen";

import { ReloadPrompt } from "@/components/ReloadPrompt";
import { useUserPreferences } from "@/hooks/use-user-preferences";

const GlobalSettings: React.FC = () => {
  const { preferences } = useUserPreferences();

  // Apply font size preference globally
  React.useEffect(() => {
    if (preferences?.font_size_preference) {
      document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
      document.documentElement.classList.add(`font-size-${preferences.font_size_preference}`);
    }
  }, [preferences?.font_size_preference]);

  return null;
};

import { DemoController } from "@/components/demo/DemoController";

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
      <GlobalSettings />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <LanguageProvider>
            <PomodoroProvider>
              <SubscriptionProvider>
                <ReloadPrompt />
                <DemoController />
                <AnimatePresence mode="wait">
                  <Routes>
                    {/* Standalone Route for Login (No Public Header) */}
                    <Route path="/login" element={
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Login />
                      </motion.div>
                    } />
                    <Route path="/confirm-email" element={<EmailConfirmation />} />
                    <Route path="/reset-password" element={<PasswordReset />} />

                    {/* Public Routes with Header/Footer */}
                    <Route element={<PublicLayoutWrapper />}>
                      <Route path="/about" element={<About />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/terms" element={<TermsAndConditions />} />
                    </Route>

                    {/* Standalone Route for Agreement (No Header/Sidebar to force focus) */}
                    <Route path="/user-agreement" element={<UserAgreement />} />

                    {/* Dashboard Layout Routes */}
                    <Route element={<DashboardLayoutWrapper />}>
                      <Route path="/" element={
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                          <Dashboard />
                        </motion.div>
                      } />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/dashboard" element={<Statistics />} />
                      <Route path="/daily-review" element={<DailyReview />} />

                      <Route path="/collaborations" element={<Collaborations />} />
                      <Route path="/essays" element={<EssayIndex />} />

                      <Route path="/generate-essay-questions" element={<GenerateEssayQuestions />} />
                      <Route path="/explore-public-sets" element={<ExplorePublicSets />} />
                      <Route path="/textbook-finder" element={<TextbookFinder />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/payment-result" element={<PaymentResult />} />
                      <Route path="/test" element={<TestPage />} />

                      {/* Study Sets */}
                      <Route path="/create" element={<CreateStudySet />} />
                      <Route path="/sets" element={<StudySetsLayout />} />
                      <Route path="/sets/:setId" element={<StudySetsLayout />} />
                      <Route path="/sets/:setId/edit" element={<EditSet />} />
                      <Route path="/sets/:setId/study" element={<StudyMode />} />
                      <Route path="/focus-timer" element={<PomodoroTimer />} />

                      {/* Pro Notebook */}
                      <Route path="/notebook" element={<Notebook />} />
                      <Route path="/notebook/:noteId" element={<Notebook />} />

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

                    {/* Admin Routes */}
                    <Route element={<AdminLayout />}>
                      <Route path="/admin" element={<AdminOverview />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/content" element={<AdminContent />} />
                      <Route path="/admin/broadcasts" element={<AdminBroadcasts />} />
                      <Route path="/admin/logs" element={<AdminLogs />} />
                      <Route path="/admin/transactions" element={<AdminTransactions />} />
                      <Route path="/admin/settings" element={<AdminSettings />} />
                    </Route>

                    {/* Catch-all for 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AnimatePresence>
              </SubscriptionProvider>
            </PomodoroProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider >
  );
};

export default App;