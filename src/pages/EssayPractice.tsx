import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Brain, Loader2, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Separator } from "@/components/ui/separator";
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label"; // Import Label

interface EssayQuestion {
  id: string;
  question_text: string;
  suggested_points: string[] | null;
  created_at: string;
  study_set_id: string | null;
  study_sets: { title: string }[] | null; // Changed to array
}

interface EssayResponse {
  id: string;
  user_answer_text: string;
  ai_score: number | null;
  ai_feedback: string | null;
  ai_detailed_feedback: {
    points_covered?: string[];
    points_missed?: string[];
    overall_strengths?: string;
    areas_for_improvement?: string;
  } | null;
  created_at: string;
}

const fetchEssayQuestionDetails = async (questionId: string): Promise<EssayQuestion> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('essay_questions')
    .select(`
      id,
      question_text,
      suggested_points,
      created_at,
      study_set_id,
      study_sets (title)
    `)
    .eq('id', questionId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error("Error fetching essay question details:", error);
    throw new Error("Failed to fetch essay question details.");
  }
  if (!data) {
    throw new Error("Essay question not found.");
  }
  return data as EssayQuestion;
};

const fetchEssayResponses = async (questionId: string): Promise<EssayResponse[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('essay_responses')
    .select('*')
    .eq('essay_question_id', questionId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error("Error fetching essay responses:", error);
    throw new Error("Failed to fetch past essay responses.");
  }
  return data || [];
};

const EssayPractice: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const queryClient = useQueryClient();

  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isGrading, setIsGrading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<EssayResponse | null>(null);

  const { data: question, isLoading: isLoadingQuestion, isError: isErrorQuestion, error: errorQuestion } = useQuery<EssayQuestion, Error>({
    queryKey: ['essayQuestion', questionId],
    queryFn: () => fetchEssayQuestionDetails(questionId!),
    enabled: !!questionId,
  });

  const { data: pastResponses, isLoading: isLoadingResponses } = useQuery<EssayResponse[], Error>({
    queryKey: ['essayResponses', questionId],
    queryFn: () => fetchEssayResponses(questionId!),
    enabled: !!questionId,
  });

  useEffect(() => {
    // If there are past responses, show the latest one by default
    if (pastResponses && pastResponses.length > 0) {
      setCurrentResponse(pastResponses[0]);
      setUserAnswer(pastResponses[0].user_answer_text);
    } else {
      setCurrentResponse(null);
      setUserAnswer('');
    }
  }, [pastResponses]);

  const handleSubmitAnswer = async () => {
    if (!questionId || !userAnswer.trim()) {
      showError("Please write an answer before submitting.");
      return;
    }

    setIsGrading(true);
    const toastId = showLoading("AI is grading your essay...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session not found. Please log in again.");
      }

      const response = await fetch(
        `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/grade-essay-response`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            // 'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJis_publicsIjoiInN1cGFiYXNlIiwicmVmIjoianVvc2RtZWNwZHV6bHZyaW5uendmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjA1MTAsImV4cCI6MjA2MjkzNjUxMH0.xvg8a1qa6WBuWY9VDLNtQxjnL5VmylefmfchofI1mJU", // Removed apikey
          },
          body: JSON.stringify({
            essayQuestionId: questionId,
            userAnswerText: userAnswer,
          }),
        }
      );

      const result = await response.json();
      dismissToast(toastId);

      if (!response.ok || result.error) {
        throw new Error(result?.error || "Failed to grade essay.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated.");
      }

      const { data: insertedResponse, error: insertError } = await supabase
        .from('essay_responses')
        .insert({
          user_id: user.id,
          essay_question_id: questionId,
          user_answer_text: userAnswer,
          ai_score: result.score,
          ai_feedback: result.summary_feedback,
          ai_detailed_feedback: result.detailed_feedback,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setCurrentResponse(insertedResponse as EssayResponse);
      showSuccess("Essay graded successfully!");
      queryClient.invalidateQueries({ queryKey: ['essayResponses', questionId] });
      queryClient.invalidateQueries({ queryKey: ['pastEssayQuestions'] }); // To update any summary views
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "An unexpected error occurred during grading.");
      console.error("Essay grading error:", err);
    } finally {
      setIsGrading(false);
    }
  };

  const handleClearAnswer = () => {
    setUserAnswer('');
    setCurrentResponse(null);
  };

  if (!questionId) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500 animate-fade-in">
        No essay question ID provided.
      </div>
    );
  }

  if (isLoadingQuestion || isLoadingResponses) {
    return (
      <div className="container mx-auto py-10 animate-fade-in">
        <Skeleton className="h-8 w-3/4 mb-8" />
        <Skeleton className="h-48 w-full rounded-lg mb-6" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isErrorQuestion) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500 animate-fade-in">
        Error loading essay question: {errorQuestion?.message || "Unknown error"}
      </div>
    );
  }

  if (!question) {
    return (
      <div className="container mx-auto py-10 text-center animate-fade-in">
        Essay question not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Practice Essay</h1>
        <Button asChild variant="outline">
          <Link to="/past-essay-questions" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Past Essay Questions
          </Link>
        </Button>
      </div>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">{question.question_text}</CardTitle>
          {question.study_sets?.[0]?.title && (
            <CardDescription>From Set: {question.study_sets[0].title}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {question.suggested_points && question.suggested_points.length > 0 && (
            <>
              <h3 className="text-md font-medium mb-2 flex items-center">
                <Lightbulb className="mr-2 h-4 w-4 text-blue-500" /> Suggested Points:
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {question.suggested_points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </NotebookCard>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Your Answer</CardTitle>
          <CardDescription>Write your essay response below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="essay-answer" className="sr-only">Your Essay Answer</Label>
          <Textarea
            id="essay-answer"
            placeholder="Start writing your essay here..."
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="min-h-[200px]"
            disabled={isGrading}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClearAnswer} disabled={isGrading || !userAnswer.trim()}>
              Clear Answer
            </Button>
            <Button onClick={handleSubmitAnswer} disabled={isGrading || !userAnswer.trim()}>
              {isGrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Grading...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" /> Get AI Feedback
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </NotebookCard>

      {currentResponse && (
        <NotebookCard className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              AI Feedback
              {currentResponse.ai_score !== null && (
                <Badge variant={currentResponse.ai_score >= 70 ? "default" : "destructive"}>
                  Score: {currentResponse.ai_score}/100
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{currentResponse.ai_feedback}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-semibold">Your Response:</h3>
            <p className="whitespace-pre-wrap text-muted-foreground border p-3 rounded-md bg-secondary/50">
              {currentResponse.user_answer_text}
            </p>

            {currentResponse.ai_detailed_feedback && (
              <>
                <Separator />
                <h3 className="text-lg font-semibold">Detailed Feedback:</h3>
                {currentResponse.ai_detailed_feedback.overall_strengths && (
                  <div>
                    <h4 className="font-medium flex items-center mb-1">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Strengths:
                    </h4>
                    <p className="text-muted-foreground text-sm">{currentResponse.ai_detailed_feedback.overall_strengths}</p>
                  </div>
                )}
                {currentResponse.ai_detailed_feedback.areas_for_improvement && (
                  <div>
                    <h4 className="font-medium flex items-center mb-1">
                      <XCircle className="mr-2 h-4 w-4 text-red-600" /> Areas for Improvement:
                    </h4>
                    <p className="text-muted-foreground text-sm">{currentResponse.ai_detailed_feedback.areas_for_improvement}</p>
                  </div>
                )}
                {currentResponse.ai_detailed_feedback.points_covered && currentResponse.ai_detailed_feedback.points_covered.length > 0 && (
                  <div>
                    <h4 className="font-medium flex items-center mb-1">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Points Covered:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {currentResponse.ai_detailed_feedback.points_covered.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentResponse.ai_detailed_feedback.points_missed && currentResponse.ai_detailed_feedback.points_missed.length > 0 && (
                  <div>
                    <h4 className="font-medium flex items-center mb-1">
                      <XCircle className="mr-2 h-4 w-4 text-red-600" /> Points Missed:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {currentResponse.ai_detailed_feedback.points_missed.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </NotebookCard>
      )}

      {pastResponses && pastResponses.length > 1 && (
        <NotebookCard className="mt-6">
          <CardHeader>
            <CardTitle>Past Attempts</CardTitle>
            <CardDescription>Review your previous attempts for this question.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pastResponses.slice(1).map((response, index) => (
              <div key={response.id} className="border p-4 rounded-md bg-background">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-muted-foreground">Attempt {pastResponses.length - index - 1} ({new Date(response.created_at).toLocaleDateString()})</p>
                  {response.ai_score !== null && (
                    <Badge variant={response.ai_score >= 70 ? "default" : "destructive"}>
                      Score: {response.ai_score}/100
                    </Badge>
                  )}
                </div>
                <p className="font-semibold text-md mb-2">{response.ai_feedback}</p>
                <Button variant="outline" size="sm" onClick={() => {
                  setCurrentResponse(response);
                  setUserAnswer(response.user_answer_text);
                }}>
                  View Details
                </Button>
              </div>
            ))}
          </CardContent>
        </NotebookCard>
      )}
    </div>
  );
};

export default EssayPractice;