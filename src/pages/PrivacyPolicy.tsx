"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="w-full px-4 md:px-8 py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="absolute left-4 top-4"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none">
          <p>
            This Privacy Policy describes how Notebook ("we," "us," or "our") collects, uses, and discloses your information when you use our application (the "Service").
          </p>

          <h2>1. Information We Collect</h2>
          <p>We collect information to provide a personalized study experience.</p>

          <h3>2. AI Processing Transparency</h3>
          <p>
            Notebook uses generative AI to power features like "Magic Fix" and "Card Generation."
          </p>
          <ul>
            <li><strong>Data Transmit:</strong> When you use AI features, the relevant portion of your content (notes, card terms, or essays) is sent to our AI partners (Google Gemini/LLM, Groq).</li>
            <li><strong>Privacy of Inputs:</strong> We use API-level access which, per our providers' standard terms, ensures your data is NOT used to train their public models. Your data remains your own.</li>
          </ul>

          <h3>3. How We Share Data</h3>
          <ul>
            <li><strong>Infrastructure:</strong> Supabase (Database/Auth).</li>
            <li><strong>AI Partners:</strong> Google (for complex reasoning and grading), Groq (for fast card generation).</li>
            <li><strong>Payments:</strong> PayFast (for subscription processing). We do not store your full credit card details.</li>
          </ul>

          <h2>5. Data Security & Retention</h2>
          <p>
            We use industry-standard encryption to protect your data. Your content is stored until you choose to delete your account or specific items within the application.
          </p>

          <h2>6. Your Rights</h2>
          <p>
            You have the right to access, export, or delete your personal data at any time. If you wish to permanently delete your account, you can do so in the Profile or Settings section (where available) or by contacting support.
          </p>

          <h2>7. Contact Us</h2>
          <p>
            Questions? Contact <strong>my.notebook.by.remi@gmail.com</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}