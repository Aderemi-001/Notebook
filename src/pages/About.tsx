"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BrandLogo from '@/components/BrandLogo';
import {
  Search,
  Users,
  Lightbulb,
  GraduationCap,
  PenTool,
  NotebookPen,
  History,
  Network,
  Handshake,
  Library,
  ChevronLeft
} from "lucide-react";

const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <Card className="max-w-4xl mx-auto shadow-xl">
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
          <div className="flex flex-col items-center gap-4 py-6">
            <BrandLogo size="xl" rounded="2xl" className="shadow-lg" />
            <CardTitle className="text-4xl font-extrabold text-center bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              About Notebook
            </CardTitle>
            <CardDescription className="text-center text-lg max-w-lg">
              Your intelligent AI-powered study companion, designed to make learning intuitive, organized, and truly effective.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none space-y-10 p-8 pt-0">
          <div className="text-center max-w-2xl mx-auto italic text-muted-foreground">
            "Notebook is a comprehensive ecosystem designed to empower students and lifelong learners. We bridge the gap between static notes and active mastery using the latest in AI technology."
          </div>

          <div className="space-y-8">
            <h2 className="flex items-center gap-3 text-3xl font-bold border-b pb-2">
              <Lightbulb className="h-8 w-8 text-primary" /> Mastery Ecosystem
            </h2>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                <History className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-xl">Daily Review</h3>
                  <p className="text-sm text-muted-foreground">
                    Stay on top of your game with scheduled sessions. Our SM-2 spaced repetition algorithm ensures you study what you're about to forget.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                <Library className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-xl">Study Sets & Flashcards</h3>
                  <p className="text-sm text-muted-foreground">
                    Import PDFs, images, or text. Our AI extracts concepts, generates flashcards, and even helps you determine the perfect amount of content to study.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                <NotebookPen className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-xl">Smart Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    Rich text and handwriting support. Ask the AI to summarize long lectures or extract key concepts directly into your study sets.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                <GraduationCap className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-xl">Practice Quizzes</h3>
                  <p className="text-sm text-muted-foreground">
                    Convert your sets into mock exams. Get instant AI grading and detailed feedback on why you missed a question.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                <PenTool className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-xl">Essay Practice</h3>
                  <p className="text-sm text-muted-foreground">
                    Practice structured writing. Our AI evaluates your essays based on core concepts and provides improvement tips.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                <Network className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-xl">Cognitive Constellation</h3>
                  <p className="text-sm text-muted-foreground">
                    Visualize your knowledge. See how different topics across your sets connect in an interactive, navigable 3D graph.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                <Users className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-xl">Groups & Public Sets</h3>
                  <p className="text-sm text-muted-foreground">
                    Collaborate with peers. Share sets, join study groups, or browse our growing library of public study materials.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                <Search className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-xl">Textbook Finder</h3>
                  <p className="text-sm text-muted-foreground">
                    Quickly locate textbooks and open-source materials from Google Books and other repositories to supplement your notes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-6 rounded-2xl border border-dashed border-primary/20">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Handshake className="h-5 w-5" /> Our Commitment
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Notebook v3.0 is just the beginning. We are dedicated to building the ultimate knowledge management system, evolving daily to help you reach your full academic potential.
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default About;