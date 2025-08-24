import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Brain, Loader2, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Fixed: Added 'from'
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  cards_count: number;
}

interface GeneratedQuestion {
  id: string;
  question_text: string;
  answer_text: string;
  question_type: string;
  options: string[] | null;
}

const fetchUserStudySets = async (): Promise<StudySet[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('study_sets')
    .select('id, title, description, cards(id)')
    .eq('user_id', user.id);

  if (error) {
    console.error("Error fetching user study sets:", error);
    throw new Error("Failed to fetch your study sets.");
  }

  const processedSets = data?.map((set: any) => ({
    id: set.id,
    title: set.title,
    description: set.description,
    cards_count: set.cards.length,
  })) || [];

  return processedSets;
};

const GenerateExam: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedSetId, setSelectedSetId] = useState<string | undefined>(undefined);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(['multiple_choice', 'short_answer', 'true_false']);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExamId, setGeneratedExamId] = useState<string | null>(null);

  const { data: userStudySets, isLoading: isLoadingSets, isError: isErrorSets, error: errorSets } = useQuery<StudySet[], Error>({
    queryKey: ['userStudySetsForExam'],
    queryFn: fetchUserStudySets,
  });

  const handleGenerateQuestions = async () => {
    if (!selectedSetId) {
      showError("Please select a study set.");
      return;
    }
    if (numQuestions <= 0) {
      showError("Number of questions must be at least 1.");
      return;
    }
    if (selectedQuestionTypes.length === 0) {
      showError("Please select at least one question type.");
      return;
    }

    setIsGenerating(true);
    setGeneratedQuestions(null);
    setGeneratedExamId(null);
    const toastId = showLoading("Generating exam questions...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session not found. Please log in again.");
      }

      const response = await fetch(
        `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/generate-exam-questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            // 'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJis_publicsIjoiInN1cGFiYXNlIiwicmVmIjoianVvc2RtZWNwZHV6bHZyaW5uendmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjA1MTAsImV4cCI6MjA2MjkzNjUxMH0.xvg8a1qa6WBuWY9VDLNtQxjnL5VmylefmfchofI1mJU", // Removed apikey
          },
          body: JSON.stringify({
            studySetId: selectedSetId,
            numQuestions: numQuestions,
            questionTypes: selectedQuestionTypes,
          }),
        }
      );

      const result = await response.json();
      dismissToast(toastId);

      if (!response.ok || result.error) {
        throw new Error(result?.error || "Failed to generate questions.");
      }

      setGeneratedQuestions(result.questions);
      setGeneratedExamId(result.exam_id);
      showSuccess("Questions generated successfully!");
      queryClient.invalidateQueries({ queryKey: ['generatedQuestions'] });
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "An unexpected error occurred during question generation.");
      console.error("Question generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuestionTypeChange = (type: string, checked: boolean) => {
    setSelectedQuestionTypes((prev: string[]) =>
      checked ? [...prev, type] : prev.filter((t: string) => t !== type)
    );
  };

  if (isLoadingSets) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isErrorSets) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading study sets: {errorSets?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Generate Exam</h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        Generate custom exam questions from your study sets using AI.
      </p>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Exam Configuration</CardTitle>
          <CardDescription>Select a study set and customize your exam.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="study-set-select">Select Study Set</Label>
            <Select onValueChange={setSelectedSetId} value={selectedSetId}>
              <SelectTrigger id="study-set-select" className="w-full">
                <SelectValue placeholder="Choose a study set" />
              </SelectTrigger>
              <SelectContent>
                {userStudySets?.length === 0 ? (
                  <SelectItem disabled value="no-sets">No study sets available</SelectItem>
                ) : (
                  userStudySets?.map((set: StudySet) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.title} ({set.cards_count} cards)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {!selectedSetId && <p className="text-sm text-red-500 mt-1">Please select a study set.</p>}
          </div>

          <div>
            <Label htmlFor="num-questions">Number of Questions</Label>
            <Input
              id="num-questions"
              type="number"
              min="1"
              value={numQuestions}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumQuestions(parseInt(e.target.value) || 0)}
              placeholder="e.g., 5"
            />
          </div>

          <div>
            <Label>Question Types</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mcq"
                  checked={selectedQuestionTypes.includes('multiple_choice')}
                  onCheckedChange={(checked: boolean) => handleQuestionTypeChange('multiple_choice', checked)}
                />
                <Label htmlFor="mcq">Multiple Choice</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sa"
                  checked={selectedQuestionTypes.includes('short_answer')}
                  onCheckedChange={(checked: boolean) => handleQuestionTypeChange('short_answer', checked)}
                />
                <Label htmlFor="sa">Short Answer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tf"
                  checked={selectedQuestionTypes.includes('true_false')}
                  onCheckedChange={(checked: boolean) => handleQuestionTypeChange('true_false', checked)}
                />
                <Label htmlFor="tf">True/False</Label>
              </div>
            </div>
            {selectedQuestionTypes.length === 0 && <p className="text-sm text-red-500 mt-1">Please select at least one question type.</p>}
          </div>

          <Button
            onClick={handleGenerateQuestions}
            disabled={!selectedSetId || numQuestions <= 0 || selectedQuestionTypes.length === 0 || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" /> Generate Questions
              </>
            )}
          </Button>
        </CardContent>
      </NotebookCard>

      {generatedQuestions && generatedQuestions.length > 0 && (
        <NotebookCard className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Questions</CardTitle>
            {generatedExamId && (
              <Button asChild>
                <Link to={`/exams/${generatedExamId}`} className="flex items-center">
                  <PlayCircle className="mr-2 h-4 w-4" /> Start Exam
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {generatedQuestions.map((q: GeneratedQuestion, index: number) => (
              <div key={q.id || index} className="border p-4 rounded-md bg-background">
                <p className="text-sm text-muted-foreground mb-1">Question {index + 1} ({q.question_type.replace('_', ' ')})</p>
                <p className="font-semibold text-lg mb-2">{q.question_text}</p>
                {q.question_type === 'multiple_choice' && q.options && (
                  <div className="space-y-1">
                    {q.options.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="flex items-center">
                        <span className="mr-2 text-muted-foreground">{String.fromCharCode(65 + optIndex)}.</span>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>
                )}
                <Separator className="my-3" />
                <div className="flex items-center text-green-600">
                  <span className="font-medium">Answer: {q.answer_text}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </NotebookCard>
      )}

      {generatedQuestions && generatedQuestions.length === 0 && !isGenerating && (
        <div className="text-center py-10 border-2 border-dashed rounded-lg mt-6">
          <p className="text-muted-foreground">No questions were generated. Try adjusting your settings or selecting a different study set.</p>
        </div>
      )}
    </div>
  );
};

export default GenerateExam;