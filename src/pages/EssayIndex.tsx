import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Brain, History, PlusCircle, FileText } from 'lucide-react';

const EssayIndex: React.FC = () => {
  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Essay Practice</h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        Generate essay questions based on your concepts and practice writing responses with AI feedback.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <NotebookCard className="h-full flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center">
              <Brain className="mr-2 h-5 w-5 text-primary" /> Generate Essay Questions
            </CardTitle>
            <CardDescription className="mt-2">
              Create new essay questions from your cognitive constellation concepts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/generate-essay-questions">
                <PlusCircle className="mr-2 h-4 w-4" /> Generate Questions
              </Link>
            </Button>
          </CardContent>
        </NotebookCard>

        <NotebookCard className="h-full flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" /> Past Essay Questions
            </CardTitle>
            <CardDescription className="mt-2">
              Review previously generated essay questions and your practice attempts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/past-essay-questions">
                <History className="mr-2 h-4 w-4" /> View Past Questions
              </Link>
            </Button>
          </CardContent>
        </NotebookCard>
      </div>
    </div>
  );
};

export default EssayIndex;