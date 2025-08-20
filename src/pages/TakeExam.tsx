import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface ExamDetails {
  id: string;
  title: string;
  description: string | null;
  study_set_id: string;
  generated_questions: GeneratedQuestion[];
}

interface GeneratedQuestion {
  id: string;
  question_text: string;
  answer_text: string;
  question_type: string;
  options: string[] | null;
}

interface ExamResponse {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  score: number;
}

const fetchExamDetails = async (examId: string): Promise<ExamDetails> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('exams')
    .select(`
      id,
      title,
      description,
      study_set_id,
      generated_questions (
        id,
        question_text,
        answer_text,
        question_type,
        options
      )
    `)
    .eq('id', examId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error("Error fetching exam details:", error);
    throw new Error("Failed to fetch exam details.");
  }
  if (!data) {
    throw new Error("Exam not found.");
  }
  return data as ExamDetails;
};

const TakeExam: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [examCompleted, setExamCompleted] = useState(false);
  const [examResults, setExamResults] = useState<ExamResponse[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: exam, isLoading, isError, error, refetch } = useQuery<ExamDetails, Error>({
    queryKey: ['exam', examId],
    queryFn: () => fetchExamDetails(examId!),
    enabled: !!examId,
  });

  const questions = exam?.generated_questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progressPercentage = totalQuestions > 0 ? ((currentQuestionIndex + (examCompleted ? 1 : 0)) / totalQuestions) * 100 : 0;

  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Last question, prepare for submission
      handleSubmitExam();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    const toastId = showLoading("Submitting exam and calculating results...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated.");
      }

      const responsesToInsert: Omit<ExamResponse, 'id'>[] = [];
      let correctCount = 0;

      for (const question of questions) {
        const userAnswer = userAnswers[question.id]?.trim().toLowerCase() || '';
        const correctAnswer = question.answer_text.trim().toLowerCase();
        let isCorrect = false;
        let score = 0;

        if (question.question_type === 'multiple_choice' || question.question_type === 'short_answer' || question.question_type === 'true_false') {
          isCorrect = (userAnswer === correctAnswer);
          score = isCorrect ? 1 : 0;
        }
        // Add more complex scoring logic for short_answer if needed later

        responsesToInsert.push({
          exam_id: examId!,
          question_id: question.id,
          user_id: user.id,
          user_answer: userAnswers[question.id] || '', // Store original user input
          is_correct: isCorrect,
          score: score,
        });

        if (isCorrect) {
          correctCount++;
        }
      }

      const { error: insertResponsesError } = await supabase
        .from('exam_responses')
        .insert(responsesToInsert);

      if (insertResponsesError) throw insertResponsesError;

      setExamCompleted(true);
      setExamResults(responsesToInsert); // Store results for display
      dismissToast(toastId);
      showSuccess(`Exam completed! You got ${correctCount} out of ${totalQuestions} correct.`);
      queryClient.invalidateQueries({ queryKey: ['examResults', examId] });
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to submit exam.");
      console.error("Exam submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetakeExam = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setExamCompleted(false);
    setExamResults(null);
    refetch(); // Re-fetch questions in case they were updated
  };

  if (!examId) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        No exam ID provided.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex flex-col items-center">
        <Skeleton className="h-10 w-3/4 mb-8" />
        <Skeleton className="h-64 w-full max-w-md rounded-lg" />
        <div className="flex gap-4 mt-8">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading exam: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">This exam has no questions.</p>
        <Button asChild className="mt-4">
          <Link to="/generate-exam" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Generate Exam
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{exam.title}</h1>
        <Button asChild variant="outline">
          <Link to="/generate-exam" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Generator
          </Link>
        </Button>
      </div>

      {/* Progress Bar */}
      {!examCompleted && totalQuestions > 0 && (
        <div className="w-full max-w-md mb-6">
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-sm text-muted-foreground text-right mt-1">
            Question {currentQuestionIndex + 1} / {totalQuestions}
          </p>
        </div>
      )}

      {examCompleted ? (
        <NotebookCard className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Exam Results</CardTitle>
            <CardDescription>Here's how you did on the exam.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-semibold">
              You answered {examResults?.filter(r => r.is_correct).length || 0} out of {totalQuestions} questions correctly.
            </p>
            <Button onClick={handleRetakeExam} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" /> Retake Exam
            </Button>
            <Separator />
            <h3 className="text-xl font-semibold">Detailed Review:</h3>
            <div className="space-y-6">
              {questions.map((q, index) => {
                const result = examResults?.find(r => r.question_id === q.id);
                const isCorrect = result?.is_correct;
                const userAnswer = result?.user_answer || 'No answer provided';

                return (
                  <div key={q.id} className="border p-4 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">Question {index + 1} ({q.question_type.replace('_', ' ')})</p>
                    <p className="font-semibold text-lg mb-2">{q.question_text}</p>
                    {q.question_type === 'multiple_choice' && q.options && (
                      <div className="space-y-1 mb-2">
                        {q.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center">
                            <span className="mr-2 text-muted-foreground">{String.fromCharCode(65 + optIndex)}.</span>
                            <span>{option}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center mb-2">
                      {isCorrect ? (
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">Your Answer: {userAnswer}</span>
                    </div>
                    <div className="flex items-center text-green-600">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      <span className="font-medium">Correct Answer: {q.answer_text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </NotebookCard>
      ) : (
        <NotebookCard className="w-full max-w-md min-h-[300px] flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Question {currentQuestionIndex + 1}</CardTitle>
            <CardDescription>{currentQuestion?.question_type.replace('_', ' ')}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-between p-4">
            <p className="text-xl font-medium mb-4">{currentQuestion?.question_text}</p>
            
            {currentQuestion?.question_type === 'multiple_choice' && currentQuestion.options && (
              <RadioGroup
                value={userAnswers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                className="space-y-2"
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion?.question_type === 'short_answer' && (
              <Textarea
                placeholder="Type your answer here..."
                value={userAnswers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                className="min-h-[100px]"
              />
            )}

            {currentQuestion?.question_type === 'true_false' && (
              <RadioGroup
                value={userAnswers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="True" id="true-option" />
                  <Label htmlFor="true-option">True</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="False" id="false-option" />
                  <Label htmlFor="false-option">False</Label>
                </div>
              </RadioGroup>
            )}
          </CardContent>
        </NotebookCard>
      )}

      {!examCompleted && (
        <div className="mt-8 flex justify-between w-full max-w-md">
          <Button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0 || isSubmitting}
            variant="outline"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <Button
            onClick={handleNextQuestion}
            disabled={isSubmitting}
          >
            {currentQuestionIndex === totalQuestions - 1 ? (
              isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  Submit Exam <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )
            ) : (
              <>
                Next Question <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TakeExam;