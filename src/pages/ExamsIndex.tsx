import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Brain, History, Menu, PlusCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ExamsIndex: React.FC = () => {
  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Exams</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-muted-foreground mb-6">
        Generate new exams or review your past attempts.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <NotebookCard className="h-full flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center">
              <Brain className="mr-2 h-5 w-5 text-primary" /> Generate New Exam
            </CardTitle>
            <CardDescription className="mt-2">
              Create custom exams from your study sets with AI-generated questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/generate-exam">
                <PlusCircle className="mr-2 h-4 w-4" /> Start Generating
              </Link>
            </Button>
          </CardContent>
        </NotebookCard>

        <NotebookCard className="h-full flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center">
              <History className="mr-2 h-5 w-5 text-primary" /> Past Exams
            </CardTitle>
            <CardDescription className="mt-2">
              Review your previous exam attempts and see your performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/past-exams">
                <History className="mr-2 h-4 w-4" /> View Past Exams
              </Link>
            </Button>
          </CardContent>
        </NotebookCard>
      </div>
    </div>
  );
};

export default ExamsIndex;