import * as React from 'react';
import { cn } from "@/lib/utils";
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X } from 'lucide-react';
// import { EssayGraderSettings } from "@/components/essay/EssayGraderSettings"; // Removed
// import { GradingConfig } from '@/utils/essayGrader'; // Removed

interface EssayQuestion {
  id: string;
  question_text: string;
  suggested_points: string[] | null;
  created_at: string;
  study_set_id: string | null;
  study_sets: {
    title: string;
    user_id: string;
    is_public: boolean;
  } | null;
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
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user profile for admin check
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.is_admin || false;
  }

  const { data, error } = await supabase
    .from('essay_questions')
    .select(`
      id,
      question_text,
      suggested_points,
      created_at,
      study_set_id,
      study_sets (title, user_id, is_public)
    `)
    .eq('id', questionId)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Question not found");

  // Permission Check
  // Note: Supabase returns foreign key relations as an object (single) or array depending on relationship.
  // Here it's likely an object if 1:1 or N:1. The types say { title: string }[] | null in original code which suggests array?
  // Checking previous code: study_sets (title). It's usually an object if defined as many-to-one.
  // However, the original interface had `study_sets: { title: string }[] | null;`. 
  // IMPORTANT: The fetch response from Supabase for a foreign key is an array if `is_one_to_one` is false in relation, 
  // or simple object if using `!inner` or single(). 
  // Let's assume the previous interface was slightly loose or Supabase types generated arrays.
  // We will cast it carefully.

  // Let's inspect the data structure at runtime if we could, but we can't.
  // Usually `study_sets: { ... }` (object) for `belongs_to`.
  // I will treat it as an object based on standard Supabase-JS `select` behavior for N:1.

  const studySet = Array.isArray(data.study_sets) ? data.study_sets[0] : data.study_sets;

  if (studySet) {
    const hasAccess =
      studySet.is_public ||
      (user && studySet.user_id === user.id) ||
      isAdmin;

    if (!hasAccess) {
      throw new Error("You do not have permission to view this content.");
    }
  }

  return data as unknown as EssayQuestion;
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

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [tempImprovedText, setTempImprovedText] = useState("");
  const [isImproving, setIsImproving] = useState(false);

  const handleImproveText = async (type: 'flow' | 'grammar' | 'conciseness') => {
    if (!userAnswer.trim()) return;
    setIsImproving(true);
    try {
      const improved = await NovaAI.improveText(userAnswer, type);
      setTempImprovedText(improved);
      setIsPreviewOpen(true);
    } catch (e) {
      console.error(e);
      showError("Could not improve text.");
    } finally {
      setIsImproving(false);
    }
  };

  const applyImprovement = () => {
    setUserAnswer(tempImprovedText);
    setIsPreviewOpen(false);
    showSuccess("Nova's improvements applied! ✨");
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
    if (!userAnswer.trim() || !questionId) {
      showError("Nothing to save.");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Please log in to save your progress.");
        return;
      }

      const submissionData = {
        question_id: questionId,
        user_id: user.id,
        content: userAnswer,
        score: currentGrade?.score || 0,
        letter_grade: currentGrade?.letterGrade || 'Draft',
        feedback: currentGrade?.feedback || 'Draft saved successfully.',
        metrics: currentGrade?.metrics || {}
      };

      let result;
      // If we already have a previous submission that is a 'Draft', update it instead of cluttering history
      if (previousSubmission?.id && previousSubmission.letter_grade === 'Draft') {
        result = await supabase
          .from('essay_submissions')
          .update(submissionData)
          .eq('id', previousSubmission.id);
      } else {
        result = await supabase
          .from('essay_submissions')
          .insert(submissionData);
      }

      if (result.error) throw result.error;

      showSuccess("Draft saved!");
      queryClient.invalidateQueries({ queryKey: ['essaySubmission', questionId] });
    } catch (error: any) {
      console.error("Save Draft Error:", error);
      const errorMessage = error?.message || error?.error_description || (typeof error === 'string' ? error : "Database connection issue");
      showError("Failed to save draft: " + errorMessage);
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
    <div className="w-full px-4 md:px-8 py-8 animate-fade-in max-w-5xl">
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
          <Card className={cn("glass-card shadow-premium rounded-[2.5rem] border-white/20 transition-all duration-300", currentGrade ? "border-l-4 border-l-primary" : "")}>
            <CardHeader>
              <CardTitle className="text-xl">{question.question_text}</CardTitle>
              {/* Handle both array (legacy type) and object structure just in case */}
              {(Array.isArray(question.study_sets) ? question.study_sets[0] : question.study_sets)?.title && (
                <CardDescription>From: {(Array.isArray(question.study_sets) ? question.study_sets[0] : question.study_sets)?.title}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {/* Simplified prompt view */}
              <p className="text-muted-foreground text-sm">Write an essay addressing the prompt above. Aim for a clear structure and cover key concepts.</p>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-premium rounded-[2.5rem] border-white/20 transition-all duration-300 overflow-hidden">
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
                    className="relative overflow-hidden border-purple-200 text-purple-700 hover:bg-purple-50 font-medium"
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
                  <Button onClick={handleSubmitAnswer} disabled={gradeMutation.isPending || !userAnswer.trim()} size="lg" className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90 shadow-md transition-all">
                    {gradeMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Brain className="mr-2 h-4 w-4" />}
                    Check My Essay
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Grading Results (Tabbed & Friendly) */}
        <div className="lg:col-span-1">
          {currentGrade ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 sticky top-4">

              {/* Encouraging Summary Card */}
              <Card className="glass-card shadow-premium rounded-[2.5rem] bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border-purple-200/50 overflow-hidden">
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
              </Card>

              {/* Tabbed Feedback Analysis */}
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="structure">Structure</TabsTrigger>
                </TabsList>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4 mt-4">
                  <Card className="glass-card shadow-premium rounded-[2rem] border-white/20">
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
                  </Card>
                </TabsContent>

                {/* Structure & Flow Tab */}
                <TabsContent value="structure" className="space-y-4 mt-4">
                  <Card className="glass-card shadow-premium rounded-[2rem] border-white/20">
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
                  </Card>

                  {/* Combined Feedback List */}
                  <div className="space-y-2">
                    {/* Style Issues */}
                    {currentGrade.styleFeedback && currentGrade.styleFeedback.length > 0 && currentGrade.styleFeedback[0] !== "Style is engaging and varied." && (
                      <Card className="glass-card shadow-premium rounded-2xl bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
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
                      </Card>
                    )}

                    {/* Coherence & Flow Issues */}
                    {currentGrade.coherenceFeedback && currentGrade.coherenceFeedback.length > 0 && currentGrade.coherenceFeedback[0] !== "Good flow and vocabulary." && (
                      <Card className="glass-card shadow-premium rounded-2xl bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
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
                      </Card>
                    )}

                    {/* Structure Tips */}
                    {currentGrade.structureFeedback.length > 0 && currentGrade.structureFeedback[0] !== "Structure looks solid." && (
                      <Card className="glass-card shadow-premium rounded-2xl bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
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
                      </Card>
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

      {/* Magic Fix Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col rounded-[2rem] border-primary/20 shadow-2xl overflow-hidden glass-card">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">Nova's Magic Fix</DialogTitle>
                <DialogDescription className="font-medium">Compare Nova's improvements with your original text.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Original Draft</h4>
              <ScrollArea className="flex-1 rounded-2xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                {userAnswer}
              </ScrollArea>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary px-1">Nova's Version</h4>
              <ScrollArea className="flex-1 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 text-sm font-medium leading-relaxed shadow-[inset_0_0_20px_rgba(79,70,229,0.03)] selection:bg-primary/20">
                {tempImprovedText}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted/20 border-t backdrop-blur-sm">
            <div className="flex w-full justify-between items-center gap-4">
              <p className="text-[10px] font-medium text-muted-foreground italic">Nova improved flow, corrected grammar, and refined vocabulary.</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsPreviewOpen(false)} className="rounded-xl font-bold">
                  <X className="mr-2 h-4 w-4" /> Discard
                </Button>
                <Button onClick={applyImprovement} className="rounded-xl px-8 font-black bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 shadow-lg shadow-indigo-500/20">
                  <Check className="mr-2 h-4 w-4" /> Apply Changes
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default EssayPractice;