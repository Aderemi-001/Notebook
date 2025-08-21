import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, History, Menu, CheckCircle2, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface EssayQuestionSummary {
  id: string;
  question_text: string;
  suggested_points: string[] | null;
  created_at: string;
  study_set_id: string | null;
  study_sets: { title: string }[] | null; // Changed to array
}

const fetchPastEssayQuestions = async (): Promise<EssayQuestionSummary[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: essayQuestions, error: essayQuestionsError } = await supabase
    .from('essay_questions')
    .select(`
      id,
      question_text,
      suggested_points,
      created_at,
      study_set_id,
      study_sets (title)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (essayQuestionsError) {
    console.error("Error fetching past essay questions:", essayQuestionsError);
    throw new Error("Failed to fetch your past essay questions.");
  }

  return essayQuestions || [];
};

const PastEssayQuestions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: pastEssayQuestions, isLoading, isError, error } = useQuery<EssayQuestionSummary[], Error>({
    queryKey: ['pastEssayQuestions'],
    queryFn: fetchPastEssayQuestions,
  });

  const filteredQuestions = pastEssayQuestions?.filter(q =>
    q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.study_sets?.[0]?.title && q.study_sets[0].title.toLowerCase().includes(searchTerm.toLowerCase())) // Access first element
  );

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading past essay questions: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Past Essay Questions</h1>
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
        Review essay questions you've generated to help with your studies.
      </p>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search essay questions by text or associated study set..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <NotebookCard key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 mt-2" />
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      ) : (filteredQuestions?.length === 0 || !filteredQuestions) ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No essay questions found!</h2>
          <p className="text-muted-foreground mt-2">
            {searchTerm ? "Try a different search term." : "Generate essay questions to see them here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {filteredQuestions.map((question) => (
            <NotebookCard key={question.id} className="h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{question.question_text}</CardTitle>
                {question.study_sets?.[0]?.title && ( // Access first element
                  <CardDescription>From Set: {question.study_sets[0].title}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <History className="mr-2 h-4 w-4" />
                  <span>Generated on: {format(new Date(question.created_at), 'PPP')}</span>
                </div>
                {question.suggested_points && question.suggested_points.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <h3 className="text-md font-medium mb-2 flex items-center">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Suggested Points:
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {question.suggested_points.map((point, pointIndex) => (
                        <li key={pointIndex}>{point}</li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="mt-4">
                  <Link to={`/essay-practice/${question.id}`}>
                    <Button variant="outline" className="w-full">
                      <Brain className="mr-2 h-4 w-4" /> Practice Essay
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default PastEssayQuestions;