"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, Phone } from "lucide-react"; // Added Mail and Phone icons

const Contact: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
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
          <CardTitle className="text-3xl font-bold text-center">Contact Us</CardTitle>
          <CardDescription className="text-center mt-2">
            We'd love to hear from you! Reach out with any questions or feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-6 p-6">
          <p>
            If you have any questions, suggestions, or need support regarding Notebook, please don't hesitate to contact us using the information below. We aim to respond to all inquiries promptly.
          </p>

          <h2 className="flex items-center gap-2 text-2xl font-semibold mt-8 mb-4">
            Get in Touch
          </h2>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 flex-shrink-0" /> Email: <a href="mailto:my.notebook.by.remi@gmail.com" className="text-blue-500 hover:underline">my.notebook.by.remi@gmail.com</a>
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0" /> Tel: <a href="tel:+27697641352" className="text-blue-500 hover:underline">+27 69 764 1352</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contact;