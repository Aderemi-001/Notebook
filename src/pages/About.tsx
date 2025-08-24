"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, BookOpen, Brain, LayoutDashboard, Users, Lightbulb, GraduationCap, PenTool, NotebookPen, Mail, Phone } from "lucide-react"; // Added Mail and Phone icons

const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <Card className="max-w-4xl mx-auto">
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
          <CardTitle className="text-3xl font-bold text-center">About My Notebook</CardTitle>
          <CardDescription className="text-center mt-2">
            Your intelligent companion for effective learning and organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-6 p-6">
          <p>
            My Notebook is a comprehensive study tool designed to empower students and lifelong learners to organize their study materials, enhance their understanding, and prepare for exams with the help of artificial intelligence.
          </p>

          <h2 className="flex items-center gap-2 text-2xl font-semibold mt-8 mb-4">
            <Lightbulb className="h-6 w-6 text-primary" /> Key Features
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Study Sets & Flashcards</h3>
                <p className="text-sm text-muted-foreground">
                  Create study sets manually or import content from various file types (PDF, TXT, CSV, Markdown, JSON, XML, HTML, JS, TS, CSS). Our AI automatically generates flashcards, concepts, and relationships, and can even estimate the optimal number of cards. Study with a spaced repetition system (SM-2 algorithm) and track your progress.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <NotebookPen className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Rich Text Notes & AI Summarization</h3>
                <p className="text-sm text-muted-foreground">
                  Create detailed rich text notes, optionally linking them to study sets. Summarize your notes with AI to quickly extract key takeaways.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">AI-Generated Exams</h3>
                <p className="text-sm text-muted-foreground">
                  Generate custom exams from your study sets, choosing the number and types of questions (multiple choice, short answer, true/false). The AI grades your responses and provides instant feedback and scores.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <PenTool className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Essay Practice with AI Feedback</h3>
                <p className="text-sm text-muted-foreground">
                  Generate essay questions based on concepts from your cognitive constellation. Practice writing responses and receive AI feedback and scores based on suggested answer points.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Cognitive Constellation</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize the interconnected concepts extracted by AI from your study materials. Understand relationships between ideas and refresh your constellation with new content.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <LayoutDashboard className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Dashboard & Statistics</h3>
                <p className="text-sm text-muted-foreground">
                  Track your learning journey with detailed study statistics, including total cards, mastered cards, due cards, and a study calendar with streak tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Study Set Groups & Public Sets</h3>
                <p className="text-sm text-muted-foreground">
                  Organize your study sets into custom groups. Explore and add public study sets created by other users to expand your knowledge base.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-8">
            My Notebook is continuously evolving to provide the best learning experience. We are committed to helping you achieve your academic and personal growth goals.
          </p>

          <h2 className="flex items-center gap-2 text-2xl font-semibold mt-8 mb-4">
            <Mail className="h-6 w-6 text-primary" /> Contact Information
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

export default About;