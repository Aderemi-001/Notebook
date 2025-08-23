import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { NotebookCard, CardHeader, CardTitle, CardContent } from "@/components/NotebookCard";
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Privacy Policy</h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>
      </div>

      <NotebookCard>
        <CardHeader>
          <CardTitle>Your Privacy Matters to Us</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>
            This Privacy Policy describes how My Notebook ("we," "us," or "our") collects, uses, and discloses your personal information when you use our application.
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            We collect information to provide better services to all our users. The types of information we collect depend on how you use our services.
          </p>
          <h3>Personal Information You Provide to Us:</h3>
          <ul>
            <li><strong>Account Information:</strong> When you create an account, we collect your email address and a display name.</li>
            <li><strong>Study Content:</strong> Any study sets, flashcards, notes, or other learning materials you create or upload within the app.</li>
            <li><strong>Usage Data:</strong> Information about how you interact with the app, such as study progress, exam attempts, and feature usage.</li>
          </ul>

          <h3>Information We Collect Automatically:</h3>
          <ul>
            <li><strong>Device and Usage Information:</strong> We may collect information about the device you use to access our services, including IP address, browser type, operating system, and app version.</li>
            <li><strong>Cookies and Similar Technologies:</strong> We use cookies to maintain your session and preferences.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul>
            <li>To provide, maintain, and improve our services.</li>
            <li>To personalize your learning experience, such as tracking study progress and suggesting reviews.</li>
            <li>To communicate with you about your account or our services.</li>
            <li>To develop new features and services.</li>
            <li>To ensure the security and integrity of our services.</li>
          </ul>

          <h2>3. How We Share Your Information</h2>
          <p>We do not share your personal information with companies, organizations, or individuals outside of My Notebook except in the following cases:</p>
          <ul>
            <li><strong>With Your Consent:</strong> We will share personal information with companies, organizations, or individuals outside of My Notebook when we have your consent to do so.</li>
            <li><strong>For External Processing:</strong> We provide personal information to our affiliates or other trusted businesses or persons to process it for us, based on our instructions and in compliance with our Privacy Policy and any other appropriate confidentiality and security measures. This includes services like AI content generation (e.g., flashcards, summaries) where your study content may be sent to third-party AI models for processing.</li>
            <li><strong>For Legal Reasons:</strong> We will share personal information outside of My Notebook if we have a good-faith belief that access, use, preservation, or disclosure of the information is reasonably necessary to meet any applicable law, regulation, legal process, or enforceable governmental request.</li>
          </ul>

          <h2>4. Your Choices and Rights</h2>
          <ul>
            <li>You can access and update your profile information through your account settings.</li>
            <li>You can delete your study content at any time.</li>
            <li>You may have additional rights depending on your jurisdiction, such as the right to request access to, rectification of, or erasure of your personal data.</li>
          </ul>

          <h2>5. Data Security</h2>
          <p>
            We work hard to protect My Notebook and our users from unauthorized access to or unauthorized alteration, disclosure, or destruction of information we hold. We implement various security measures, including encryption and access controls, to safeguard your data.
          </p>

          <h2>6. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>

          <h2>7. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at [Your Contact Email Here].
          </p>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default PrivacyPolicy;