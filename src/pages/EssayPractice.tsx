import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Brain, Loader2, CheckCircle2, XCircle, Lightbulb, BookOpen, BarChart3, GraduationCap, ArrowRight, Sparkles, BookCheck, Save, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { DetailedGrade, analyzeEssayWithAI } from '@/utils/essayGrader';
import { NovaAI } from '@/utils/NovaAI';
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// import { EssayGraderSettings } from "@/components/essay/EssayGraderSettings"; // Removed
// import { GradingConfig } from '@/utils/essayGrader'; // Removed

interface EssayQuestion {
  id: string;
  question_text: string;
  suggested_points: string[] | null;
  created_at: string;
  study_set_id: string | null;
  study_sets: { title: string }[] | null;
}

interface EssaySubmission {
  id: string;
  content: string;
  score: number;
  letter_grade: string;
  feedback: string;
  metrics: any;
  created_at: string;
}

const fetchEssayQuestionDetails = async (questionId: string): Promise<EssayQuestion> => {
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
    .single();

  if (error) throw error;
  return data as EssayQuestion;
};

const fetchPreviousSubmission = async (questionId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('essay_submissions')
    .select('*')
    .eq('question_id', questionId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching submission:", error);
    return null;
  }
  return data as EssaySubmission | null;
}

const EssayPractice: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [currentGrade, setCurrentGrade] = useState<DetailedGrade | null>(null);
  const queryClient = useQueryClient();

  // Removed manual configuration fetching - using defaults

  const [isImproving, setIsImproving] = useState(false);

  const handleImproveText = async (type: 'flow' | 'grammar' | 'conciseness') => {
    if (!userAnswer.trim()) return;
    setIsImproving(true);
    try {
      const improved = await NovaAI.improveText(userAnswer, type);
      setUserAnswer(improved);
      showSuccess("Nova has polished your text! ✨");
    } catch (e) {
      console.error(e);
      showError("Could not improve text.");
    } finally {
      setIsImproving(false);
    }
  };

  const { data: question, isLoading: isLoadingQuestion, isError: isErrorQuestion } = useQuery<EssayQuestion, Error>({
    queryKey: ['essayQuestion', questionId],
    queryFn: () => fetchEssayQuestionDetails(questionId!),
    enabled: !!questionId,
  });

  const { data: previousSubmission } = useQuery({
    queryKey: ['essaySubmission', questionId],
    queryFn: () => fetchPreviousSubmission(questionId!),
    enabled: !!questionId
  });

  // Load previous submission if exists and user hasn't typed yet
  useEffect(() => {
    if (previousSubmission && !userAnswer && !currentGrade) {
      setUserAnswer(previousSubmission.content);
      if (previousSubmission.metrics) {
        setCurrentGrade({
          score: previousSubmission.score,
          letterGrade: previousSubmission.letter_grade,
          feedback: previousSubmission.feedback,
          metrics: previousSubmission.metrics,
          structureFeedback: [],
          contentFeedback: [],
          coherenceFeedback: [],
          styleFeedback: [],
          pointsCovered: [],
          pointsMissed: []
        });
      }
    }
  }, [previousSubmission]);

  const gradeMutation = useMutation({
    mutationFn: async (text: string) => {
      // 1. AI-Powered Grading (Groq + Local Metrics)
      const result = await analyzeEssayWithAI(
        text,
        question?.question_text || '',
        question?.suggested_points || [],
        null // Use default academic standard
      );

      // 2. Persist to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user && questionId) {
        const { error } = await supabase.from('essay_submissions').insert({
          question_id: questionId,
          user_id: user.id,
          content: text,
          score: result.score,
          letter_grade: result.letterGrade,
          feedback: result.feedback,
          metrics: result.metrics
        });
        if (error) console.error("Failed to save submission:", error);
      }
      return result;
    },
    onSuccess: (result) => {
      setCurrentGrade(result);
      showSuccess("Essay graded & saved!");
      queryClient.invalidateQueries({ queryKey: ['essaySubmission', questionId] });
    },
    onError: (err) => {
      showError("Grading failed: " + err.message);
    }
  });


  const handleSubmitAnswer = () => {
    if (!questionId || !userAnswer.trim()) {
      showError("Please write an answer before submitting.");
      return;
    }
    gradeMutation.mutate(userAnswer);
  };

  const handleSaveDraft = async () => {
    if (!userAnswer.trim() || !questionId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('essay_submissions').insert({
        question_id: questionId,
        user_id: user.id,
        content: userAnswer,
        score: 0,
        letter_grade: 'Draft',
        feedback: 'Draft saved successfully.',
        metrics: {}
      });

      if (error) throw error;
      showSuccess("Draft saved!");
      queryClient.invalidateQueries({ queryKey: ['essaySubmission', questionId] });
    } catch (error: any) {
      showError("Failed to save draft: " + error.message);
    }
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteEssay = async () => {
    if (!questionId) return;
    setIsDeleteDialogOpen(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('essay_submissions')
        .delete()
        .eq('question_id', questionId)
        .eq('user_id', user.id);

      if (error) throw error;

      setUserAnswer('');
      setCurrentGrade(null);
      showSuccess("Essay deleted.");
      queryClient.invalidateQueries({ queryKey: ['essaySubmission', questionId] });
    } catch (error: any) {
      showError("Failed to delete essay: " + error.message);
    }
  };



  if (!questionId) return <div>No ID</div>;
  if (isLoadingQuestion) return <div className="p-10"><Skeleton className="h-40 w-full" /></div>;
  if (isErrorQuestion || !question) return <div className="p-10 text-red-500">Error loading question.</div>;

  return (
    <div className="container mx-auto py-8 animate-fade-in max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Practice Essay
        </h1>
        <div className="flex gap-2">
          {/* Settings removed for streamlined experience */}
          <Link to="/essays"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Prompt & Input */}
        <div className="lg:col-span-2 space-y-6">
          <NotebookCard className={currentGrade ? "border-l-4 border-l-primary" : ""}>
            <CardHeader>
              <CardTitle className="text-xl">{question.question_text}</CardTitle>
              {question.study_sets?.[0]?.title && <CardDescription>From: {question.study_sets[0].title}</CardDescription>}
            </CardHeader>
            <CardContent>
              {/* Simplified prompt view */}
              <p className="text-muted-foreground text-sm">Write an essay addressing the prompt above. Aim for a clear structure and cover key concepts.</p>
            </CardContent>
          </NotebookCard>

          <NotebookCard>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle>Your Response</CardTitle>
              {userAnswer && (
                <Badge variant="outline" className="font-mono text-xs">
                  {userAnswer.split(/\s+/).filter(w => w.length > 0).length} words
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                placeholder="Start typing your essay here..."
                className="min-h-[300px] md:min-h-[400px] text-lg leading-relaxed p-6 resize-y focus-visible:ring-primary/20"
                disabled={gradeMutation.isPending}
              />
              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleImproveText('flow')}
                    disabled={isImproving || !userAnswer.trim()}
                    className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    title="Nova: Improve flow & coherence"
                  >
                    {isImproving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Magic Fix
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Essay">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleSaveDraft} disabled={!userAnswer.trim()} title="Save Draft">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={handleSubmitAnswer} disabled={gradeMutation.isPending || !userAnswer.trim()} size="lg">
                    {gradeMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Brain className="mr-2 h-4 w-4" />}
                    Check My Essay
                  </Button>
                </div>
              </div>
            </CardContent>
          </NotebookCard>
        </div>

        {/* Right Col: Grading Results (Tabbed & Friendly) */}
        <div className="lg:col-span-1">
          {currentGrade ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 sticky top-4">

              {/* Encouraging Summary Card */}
              <NotebookCard className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Sparkles className="h-24 w-24 text-primary" />
                </div>
                <CardContent className="pt-6 text-center relative z-10">
                  <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Overall Result</div>
                  <div className="text-5xl font-black text-foreground mb-2">{currentGrade.letterGrade}</div>
                  <Badge variant={currentGrade.score > 70 ? "default" : "secondary"} className="mb-4 text-md px-3">
                    {currentGrade.score > 70 ? "Passing Grade" : "Keep Practicing"}
                  </Badge>
                  <p className="text-sm font-medium text-muted-foreground italic">"{currentGrade.feedback}"</p>
                </CardContent>
              </NotebookCard>

              {/* Tabbed Feedback Analysis */}
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="structure">Structure</TabsTrigger>
                </TabsList>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4 mt-4">
                  <NotebookCard>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-500" /> Key Concepts Coverage
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Covered Points */}
                      {currentGrade.pointsCovered.length > 0 ? (
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Great Job! You covered:
                          </span>
                          <ul className="text-sm space-y-2 pl-4 border-l-2 border-green-100">
                            {currentGrade.pointsCovered.map((p, i) => (
                              <li key={i} className="text-muted-foreground">{p}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No key concepts detected yet.</p>
                      )}

                      {/* Improved "Missed" Points -> "Focus Areas" */}
                      {currentGrade.pointsMissed.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <span className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" /> Consider adding:
                          </span>
                          <ul className="text-sm space-y-2 pl-4 border-l-2 border-orange-100">
                            {currentGrade.pointsMissed.map((p, i) => (
                              <li key={i} className="text-muted-foreground">{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </NotebookCard>
                </TabsContent>

                {/* Structure & Flow Tab */}
                <TabsContent value="structure" className="space-y-4 mt-4">
                  <NotebookCard>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-purple-500" /> Linguistics & Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Detailed Metrics Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center text-xs">
                        <div className="bg-muted/40 p-3 rounded">
                          <div className="font-bold text-lg">{currentGrade.metrics.gradeLevel}</div>
                          <div className="text-muted-foreground">Grade Level</div>
                        </div>
                        <div className="bg-muted/40 p-3 rounded">
                          <div className="font-bold text-lg">{currentGrade.metrics.uniqueWordPercentage}%</div>
                          <div className="text-muted-foreground">Unique Words</div>
                        </div>
                        <div className="bg-muted/40 p-3 rounded">
                          <div className="font-bold text-lg">{currentGrade.metrics.transitionWordCount}</div>
                          <div className="text-muted-foreground">Transitions</div>
                        </div>
                        <div className="bg-muted/40 p-3 rounded">
                          <div className="font-bold text-lg text-red-500">{currentGrade.metrics.weakWordCount}</div>
                          <div className="text-muted-foreground">Weak Words</div>
                        </div>
                      </div>

                      {/* New Style Analysis Row */}
                      <div className="grid grid-cols-2 gap-4 text-center text-xs">
                        <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded border border-orange-100 dark:border-orange-900">
                          <div className="font-bold text-lg text-orange-600">{currentGrade.metrics.passiveVoiceCount}</div>
                          <div className="text-muted-foreground">Passive Voice Uses</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-100 dark:border-red-900">
                          <div className="font-bold text-lg text-red-600">
                            {currentGrade.metrics.repetitiveWords && currentGrade.metrics.repetitiveWords.length > 0
                              ? currentGrade.metrics.repetitiveWords.slice(0, 2).join(", ")
                              : "None"}
                          </div>
                          <div className="text-muted-foreground">Overused Words</div>
                        </div>
                      </div>

                      {/* Progress Bar for Readability */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Reading Ease</span>
                          <span className="font-medium">{currentGrade.metrics.readabilityScore}/100</span>
                        </div>
                        <Progress value={currentGrade.metrics.readabilityScore} className="h-2 bg-muted" />
                      </div>
                    </CardContent>
                  </NotebookCard>

                  {/* Combined Feedback List */}
                  <div className="space-y-2">
                    {/* Style Issues */}
                    {currentGrade.styleFeedback && currentGrade.styleFeedback.length > 0 && currentGrade.styleFeedback[0] !== "Style is engaging and varied." && (
                      <NotebookCard className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                            <XCircle className="h-4 w-4" /> Critical Style Issues
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-xs text-red-800 dark:text-red-300 space-y-2">
                            {currentGrade.styleFeedback.map((tip, i) => (
                              <li key={i} className="flex gap-2">
                                <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" /> {tip}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </NotebookCard>
                    )}

                    {/* Coherence & Flow Issues */}
                    {currentGrade.coherenceFeedback && currentGrade.coherenceFeedback.length > 0 && currentGrade.coherenceFeedback[0] !== "Good flow and vocabulary." && (
                      <NotebookCard className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Flow Suggestions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-xs text-orange-800 dark:text-orange-300 space-y-2">
                            {currentGrade.coherenceFeedback.map((tip, i) => (
                              <li key={i} className="flex gap-2">
                                <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" /> {tip}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </NotebookCard>
                    )}

                    {/* Structure Tips */}
                    {currentGrade.structureFeedback.length > 0 && currentGrade.structureFeedback[0] !== "Structure looks solid." && (
                      <NotebookCard className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                            <BookCheck className="h-4 w-4" /> Structure Suggestions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-2">
                            {currentGrade.structureFeedback.map((tip, i) => (
                              <li key={i} className="flex gap-2">
                                <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" /> {tip}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </NotebookCard>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10 h-full max-h-[400px]">
              <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
                <Sparkles className="h-8 w-8 text-yellow-500 opacity-80" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Ready to Grade?</h3>
              <p className="text-sm max-w-[200px]">Submit your essay to get instant feedback on content and structure.</p>
            </div>
          )}
        </div>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your essay submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEssay} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
};

export default EssayPractice;