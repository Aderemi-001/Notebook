import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Brain, Loader2, CheckCircle2, Menu, Network } from 'lucide-react'; // Added Network icon
import { supabase } from '@/integrations/supabase/client';
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Concept {
  id: string;
  name: string;
  description: string | null;
}

interface GeneratedEssayQuestion {
  id: string;
  question_text: string;
  suggested_points: string[] | null;
}

const fetchUserConcepts = async (): Promise<Concept[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('concepts')
    .select('id, name, description')
    .eq('user_id', user.id);

  if (error) {
    console.error("Error fetching user concepts:", error);
    throw new Error("Failed to fetch your concepts.");
  }

  return data || [];
};

const GenerateEssayQuestions: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState<number>(3);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedEssayQuestion[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: userConcepts, isLoading: isLoadingConcepts, isError: isErrorConcepts, error: errorConcepts } = useQuery<Concept[], Error>({
    queryKey: ['userConceptsForEssay'],
    queryFn: fetchUserConcepts,
  });

  const handleGenerateQuestions = async () => {
    if (selectedConceptIds.length === 0) {
      showError("Please select at least one concept.");
      return;
    }
    if (numQuestions <= 0) {
      showError("Number of questions must be at least 1.");
      return;
    }

    setIsGenerating(true);
    setGeneratedQuestions(null); // Clear previous questions
    const toastId = showLoading("Generating essay questions...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session not found. Please log in again.");
      }

      const response = await fetch(
        `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/generate-essay-questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJis_publicsIjoiInN1cGFiYXNlIiwicmVmIjoianVvc2RtZWNwZHV6bHZyaW5uendmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjA1MTAsImV4cCI6MjA2MjkzNjUxMH0.xvg8a1qa6WBuWY9VDLNtQxjnL5VmylefmfchofI1mJU",
          },
          body: JSON.stringify({
            conceptIds: selectedConceptIds, // Pass concept IDs
            numQuestions: numQuestions,
          }),
        }
      );

      const result = await response.json();
      dismissToast(toastId);

      if (!response.ok || result.error) {
        throw new Error(result?.error || "Failed to generate essay questions.");
      }

      setGeneratedQuestions(result.questions);
      showSuccess("Essay questions generated successfully!");
      queryClient.invalidateQueries({ queryKey: ['essayQuestions'] });
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "An unexpected error occurred during essay question generation.");
      console.error("Essay question generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConceptSelectionChange = (value: string) => {
    // For simplicity, let's allow only single selection for now.
    // If multi-select is desired, a different UI component (e.g., multi-select dropdown or checkboxes) would be needed.
    setSelectedConceptIds([value]);
  };

  if (isLoadingConcepts) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isErrorConcepts) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading concepts: {errorConcepts?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Generate Essay Questions</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Sets
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-muted-foreground mb-6">
        Generate essay questions based on your concepts to practice for exams.
      </p>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Essay Question Configuration</CardTitle>
          <CardDescription>Select one or more concepts and specify the number of questions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="concept-select">Select Concept(s)</Label>
            <Select onValueChange={handleConceptSelectionChange} value={selectedConceptIds[0] || ""}>
              <SelectTrigger id="concept-select" className="w-full">
                <SelectValue placeholder="Choose concept(s)" />
              </SelectTrigger>
              <SelectContent>
                {userConcepts?.length === 0 ? (
                  <SelectItem disabled value="no-concepts">No concepts available. Import files with AI to generate concepts.</SelectItem>
                ) : (
                  userConcepts?.map(concept => (
                    <SelectItem key={concept.id} value={concept.id}>
                      <div className="flex items-center">
                        <Network className="mr-2 h-4 w-4 text-muted-foreground" />
                        {concept.name}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedConceptIds.length === 0 && <p className="text-sm text-red-500 mt-1">Please select at least one concept.</p>}
          </div>

          <div>
            <Label htmlFor="num-questions">Number of Questions</Label>
            <Input
              id="num-questions"
              type="number"
              min="1"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value) || 0)}
              placeholder="e.g., 3"
            />
          </div>

          <Button
            onClick={handleGenerateQuestions}
            disabled={selectedConceptIds.length === 0 || numQuestions <= 0 || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" /> Generate Essay Questions
              </>
            )}
          </Button>
        </CardContent>
      </NotebookCard>

      {generatedQuestions && generatedQuestions.length > 0 && (
        <NotebookCard className="mt-6">
          <CardHeader>
            <CardTitle>Generated Essay Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {generatedQuestions.map((q, index) => (
              <div key={q.id || index} className="border p-4 rounded-md bg-background">
                <p className="text-sm text-muted-foreground mb-1">Question {index + 1}</p>
                <p className="font-semibold text-lg mb-2">{q.question_text}</p>
                {q.suggested_points && q.suggested_points.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <h3 className="text-md font-medium mb-2 flex items-center">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Suggested Points:
                    </h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {q.suggested_points.map((point, pointIndex) => (
                        <li key={pointIndex}>{point}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </NotebookCard>
      )}

      {generatedQuestions && generatedQuestions.length === 0 && !isGenerating && (
        <div className="text-center py-10 border-2 border-dashed rounded-lg mt-6">
          <p className="text-muted-foreground">No essay questions were generated. Try adjusting your settings or selecting different concepts.</p>
        </div>
      )}
    </div>
  );
};

export default GenerateEssayQuestions;