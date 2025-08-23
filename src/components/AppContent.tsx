"use client";

import { Route, Routes } from "react-router-dom";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/sonner"; // Corrected import to use sonner
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Contact from "@/pages/Contact";

function AppContent() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default AppContent;