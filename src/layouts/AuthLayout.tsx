import { Footer } from "@/components/Footer";
import { Chatbot } from "@/components/Chatbot"; // Import the Chatbot component
import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function AuthLayout() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <Button
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg"
        onClick={() => setIsChatbotOpen(!isChatbotOpen)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
    </div>
  );
}