import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface AuthLayoutProps {
  children: React.ReactNode;
}

// Simple authenticated layout wrapper for routes that require a logged-in user.
// Note: Most of the app already uses DashboardLayout + AgreementGuard; this
// wrapper is mainly for legacy or standalone usages via AppContent.
const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
};

export default AuthLayout;
