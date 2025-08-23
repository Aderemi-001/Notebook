"use client";

import { Route, Routes } from "react-router-dom";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/sonner"; // Changed from react-hot-toast
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Contact from "@/pages/Contact"; // Import the new Contact page

function AppContent() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/contact" element={<Contact />} /> {/* Add the new Contact route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default AppContent;