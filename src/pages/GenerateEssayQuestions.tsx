import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Sparkles, Loader2, Crown, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { showError, showSuccess } from '@/utils/toast';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { EssayEditor } from '@/components/essay/EssayEditor';


interface StudySet {
  id: string;
  title: string;
  description: string | null;
}

interface EssayQuestion {
  id: string;
  question_text: string; // DB column name
  suggested_points: string[] | null;
  difficulty?: 'easy' | 'medium' | 'hard'; // Optional/UI specific
  context?: string; // UI specific, maps to suggested_points[0] normally
}

const GenerateEssayQuestions: React.FC = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<EssayQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<EssayQuestion | null>(null);

  // Essay State
  // (State now managed by EssayEditor when active)
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch user's study sets
  const { data: studySets, isLoading: isLoadingSets } = useQuery<StudySet[]>({
    queryKey: ['studySets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_sets')
        .select('id, title, description')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Check subscription status
  const { status: subscriptionStatus } = useSubscription();

  const { data: subscriptionData } = useQuery({
    queryKey: ['essayCount', user?.id, subscriptionStatus, profile?.is_admin], // Added dependencies
    queryFn: async () => {
      // Calculate start of day (UTC) to match database CURRENT_DATE equivalent
      // Ideally use a specialized robust date lib, but basic JS Date roughly works if we match server timezone behavior.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Count from essay_responses (Legacy/Mixed) - Looking for today's non-drafts
      const { count: responseCount } = await supabase
        .from('essay_responses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_draft', false)
        .gte('created_at', todayISO);

      // Count from essay_submissions (Standard Practice flow)
      const { count: submissionCount } = await supabase
        .from('essay_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .neq('letter_grade', 'Draft')
        .gte('created_at', todayISO);

      const { count: questionCount } = await supabase
        .from('essay_questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .gte('created_at', todayISO);

      const isPro = subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || profile?.is_admin;

      const responseLimit = isPro ? 100 : 3;
      const questionLimit = isPro ? 300 : 3;

      const totalGraded = (responseCount || 0) + (submissionCount || 0);
      const responseRemaining = Math.max(0, responseLimit - totalGraded);
      const questionRemaining = Math.max(0, questionLimit - (questionCount || 0));

      return {
        isPro,
        responseCount: totalGraded,
        questionCount: questionCount || 0,
        responseLimit,
        questionLimit,
        responseRemaining,
        questionRemaining,
        canGrade: responseRemaining > 0,
        canGenerate: questionRemaining > 0
      };
    },
    enabled: !!user,
  });

  const generateQuestions = async () => {
    if (!selectedSetId) return;

    if (subscriptionData && !subscriptionData.canGenerate) {
      showError(subscriptionData.isPro ? 'Limit reached.' : 'Free limit reached. Upgrade to Pro!');
      return;
    }

    setIsGenerating(true);
    try {
      // Fetch cards
      const { data: cards, error } = await supabase
        .from('cards')
        .select('term, definition')
        .eq('set_id', selectedSetId)
        .limit(20);

      if (error) throw error;

      if (!cards || cards.length === 0) {
        showError('No cards found in this study set');
        return;
      }

      // Generate Questions content
      const generatedData = [
        {
          question_text: `Explain the key concepts and relationships between: ${cards.slice(0, 5).map((c: any) => c.term).join(', ')}`,
          suggested_points: ['This question tests your understanding of how these concepts relate to each other.'],
          difficulty: 'medium' as const
        },
        {
          question_text: `Compare and contrast: ${cards.slice(0, 3).map((c: any) => c.term).join(', ')}`,
          suggested_points: ['Analyze the similarities and differences between these key terms.'],
          difficulty: 'hard' as const
        },
        {
          question_text: `Define and provide examples for: ${cards[0]?.term || 'the main concept'}`,
          suggested_points: ['Demonstrate your understanding with clear definitions and real-world examples.'],
          difficulty: 'easy' as const
        }
      ];

      // Save to DB and GET IDs
      const questionsToSave = generatedData.map(q => ({
        user_id: user!.id,
        study_set_id: selectedSetId,
        question_text: q.question_text,
        suggested_points: q.suggested_points
      }));

      const { data: savedQuestions, error: saveError } = await supabase
        .from('essay_questions')
        .insert(questionsToSave)
        .select();

      if (saveError) throw saveError;

      // Map back to UI structure with IDs
      const mappedQuestions: EssayQuestion[] = savedQuestions.map((q, i) => ({
        id: q.id,
        question_text: q.question_text,
        suggested_points: (q.suggested_points as any) as string[] | null,
        difficulty: generatedData[i].difficulty, // Preserve UI metadata if possible, else default
        context: (q.suggested_points as any)?.[0]
      }));

      queryClient.invalidateQueries({ queryKey: ['essayCount'] });
      setGeneratedQuestions(mappedQuestions);
      showSuccess('Questions generated!');
    } catch (error: any) {
      console.error('Error:', error);
      showError(`Failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) return <div className="p-8 text-center">Please log in.</div>;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div className="flex-1">
          <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary transition-colors" asChild>
            <Link to="/essays"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Essay Practice</Link>
          </Button>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3 flex items-center">
            <Sparkles className="mr-3 h-8 w-8 text-purple-500 fill-purple-100" />
            Essay Generator
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Select a study set, generate tailored essay questions with Nova AI, and get instant feedback.
          </p>
        </div>

        {/* Usage Stats Card */}
        {subscriptionData && (
          <Card className="p-4 min-w-[240px] shadow-sm border-2 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> Daily Usage
              </span>
              {!subscriptionData.isPro ? (
                <Link to="/pricing">
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold hover:bg-purple-200 transition-colors">FREE PLAN</span>
                </Link>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Crown className="h-3 w-3" /> PRO</span>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Questions</span>
                  <span className={subscriptionData.questionRemaining > 0 ? 'font-bold' : 'font-bold text-red-500'}>
                    {subscriptionData.questionCount} / {subscriptionData.questionLimit}
                  </span>
                </div>
                <Progress value={(subscriptionData.questionCount / subscriptionData.questionLimit) * 100} className="h-1.5" indicatorClassName={subscriptionData.questionRemaining > 0 ? "bg-purple-500" : "bg-red-500"} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Grading</span>
                  <span className={subscriptionData.responseRemaining > 0 ? 'font-bold' : 'font-bold text-red-500'}>
                    {subscriptionData.responseCount} / {subscriptionData.responseLimit}
                  </span>
                </div>
                <Progress value={(subscriptionData.responseCount / subscriptionData.responseLimit) * 100} className="h-1.5" indicatorClassName={subscriptionData.responseRemaining > 0 ? "bg-pink-500" : "bg-red-500"} />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Step 1: Select Study Set */}
      {!selectedSetId && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Step 1: Select a Study Set</h2>
          {isLoadingSets ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
          ) : studySets && studySets.length > 0 ? (
            <div className="grid gap-3">
              {studySets.map(set => (
                <button key={set.id} onClick={() => setSelectedSetId(set.id)} className="text-left p-4 border rounded-lg hover:bg-accent transition-colors">
                  <h3 className="font-bold">{set.title}</h3>
                  {set.description && <p className="text-sm text-muted-foreground mt-1">{set.description}</p>}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8"><Button asChild><Link to="/create">Create Set</Link></Button></div>
          )}
        </Card>
      )}

      {/* Step 2: Generate */}
      {selectedSetId && generatedQuestions.length === 0 && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Step 2: Generate Questions</h2>
          <Button onClick={generateQuestions} disabled={isGenerating} className="bg-gradient-to-r from-purple-500 to-pink-500">
            {isGenerating ? <><Loader2 className="animate-spin mr-2" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate with Nova AI</>}
          </Button>
        </Card>
      )}

      {/* Step 3: Choose Question */}
      {generatedQuestions.length > 0 && !selectedQuestion && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Step 3: Choose a Question</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {generatedQuestions.map((q, i) => (
              <button key={i} onClick={() => setSelectedQuestion(q)} className="p-4 border-2 rounded-lg hover:border-primary text-left bg-card hover:shadow-md transition-all">
                {q.difficulty && (
                  <span className={cn("px-2 py-1 rounded text-xs font-semibold mb-2 inline-block", q.difficulty === 'easy' ? 'bg-green-100 text-green-700' : q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                    {q.difficulty}
                  </span>
                )}
                <p className="font-medium line-clamp-3">{q.question_text}</p>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{q.suggested_points?.[0]}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Step 4: Essay Editor (Unified UI) */}
      {selectedQuestion && (
        <div className="mt-8">
          <EssayEditor
            questionId={selectedQuestion.id}
            questionText={selectedQuestion.question_text}
            context={selectedQuestion.context || selectedQuestion.suggested_points?.[0]}
          />
        </div>
      )}
    </div>
  );
};

export default GenerateEssayQuestions;
