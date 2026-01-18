import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  id: string;
  question: string;
  answer: string;
  options: string[];
  userAnswer?: string;
  isCorrect?: boolean;
}

const TakeExam: React.FC = () => {
  const { examId } = useParams<{ examId: string }>(); // This is actually the studySetId
  const { preferences } = useUserPreferences();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateQuiz = async () => {
      if (!examId) return;
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      // 1. Verify Access First
      // Fetch study set meta to check permissions (public or owner)
      const { data: studySet, error: setError } = await supabase
        .from('study_sets')
        .select('user_id, is_public')
        .eq('id', examId)
        .single();

      if (setError || !studySet) {
        setIsLoading(false);
        // We'll handle the "Access Denied" state in the render by checking if questions are empty AND we are not loading
        // Ideally we'd have a specific error state, but 'questions.length === 0' catches it.
        // Let's optimize by setting distinct error state.
        return;
      }

      // Check admin status if needed, but for now:
      // Access if: Public OR Owner
      // For Admins, we'd need to fetch profile. Let's add a quick admin check if user matches.
      let hasAccess = studySet.is_public || (user && studySet.user_id === user.id);

      if (!hasAccess && user) {
        // Double check admin
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
        if (profile?.is_admin) hasAccess = true;
      }

      if (!hasAccess) {
        // Access Denied
        setIsLoading(false);
        setQuestions([]); // Ensure empty to trigger "Insufficient" or custom message
        return;
      }

      // 2. Fetch cards from set
      const { data: cards, error } = await supabase
        .from('cards')
        .select('*')
        .eq('set_id', examId);

      if (error || !cards || cards.length < 4) {
        setIsLoading(false);
        return;
      }

      // Shuffle and pick based on preferences (default 10)
      const numQuestions = preferences?.default_num_exam_questions || 10;
      const shuffled = [...cards].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(numQuestions, shuffled.length));

      const quizQuestions: QuizQuestion[] = selected.map(card => {
        // Generate distractors from other cards
        const otherCards = cards.filter(c => c.id !== card.id);
        const distractors = otherCards
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map(c => c.definition); // using 'definition' as answer/option

        const options = [...distractors, card.definition].sort(() => 0.5 - Math.random());

        return {
          id: card.id,
          question: card.term,
          answer: card.definition,
          options
        };
      });

      setQuestions(quizQuestions);
      setIsLoading(false);
    };

    generateQuiz();
  }, [examId]);

  const handleAnswer = (option: string) => {
    const currentQ = questions[currentQuestionIndex];
    const isCorrect = option === currentQ.answer;

    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = { ...currentQ, userAnswer: option, isCorrect };
    setQuestions(updatedQuestions);

    if (isCorrect) setScore(s => s + 1);

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(i => i + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <Skeleton className="h-4 w-1/3 mx-auto" />
        <Skeleton className="h-64 w-full rounded-[2.5rem]" />
      </div>
    </div>
  );

  if (questions.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="p-12 glass-card rounded-[3rem] border-dashed border-border/60 max-w-md">
        <h2 className="text-2xl font-black mb-4 tracking-tighter">Unable to Start Assessment</h2>
        <p className="text-muted-foreground mb-8 font-medium">
          Either this study set does not have enough cards (minimum 4 required) or you do not have permission to view it.
        </p>
        <Button asChild className="rounded-2xl px-8 h-12 font-bold shadow-premium">
          <Link to={`/sets/${examId}`}>Expand Library</Link>
        </Button>
      </div>
    </div>
  );

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen flex flex-col items-center py-12 px-4 animate-fade-in">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-screen pointer-events-none overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-emerald-500/5 blur-[120px] rounded-full" />
          <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full" />
        </div>

        <div className="w-full max-w-3xl relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
              Assessment Complete
            </div>
            <h1 className="text-5xl font-black tracking-tighter mb-4">Performance Summary</h1>
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Score Index</span>
                <div className={cn(
                  "text-6xl font-black tracking-tighter",
                  percentage >= 80 ? "text-emerald-500" : percentage >= 50 ? "text-orange-500" : "text-red-500"
                )}>
                  {percentage}%
                </div>
              </div>
              <div className="h-12 w-px bg-border/40" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Accuracy</span>
                <div className="text-6xl font-black tracking-tighter text-foreground">
                  {score}<span className="text-muted-foreground/30 mx-1 text-4xl">/</span>{questions.length}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-12 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
            {questions.map((q, i) => (
              <div key={i} className={cn(
                "p-6 rounded-[2rem] border transition-all duration-300",
                q.isCorrect
                  ? "border-emerald-500/20 bg-emerald-50/5 hover:bg-emerald-50/10"
                  : "border-red-500/20 bg-red-50/5 hover:bg-red-50/10"
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-4 flex-grow">
                    <p className="font-black text-lg tracking-tight leading-tight">{q.question}</p>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-24">Your Entry:</span>
                        <span className={q.isCorrect ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>{q.userAnswer}</span>
                      </div>
                      {!q.isCorrect && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-24">Correct Key:</span>
                          <span className="text-emerald-600 font-bold">{q.answer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "p-2 rounded-xl text-white shadow-glow",
                    q.isCorrect ? "bg-emerald-500" : "bg-red-500"
                  )}>
                    {q.isCorrect ? "✓" : "×"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4 border-t border-border/40 pt-10">
            <Button asChild variant="outline" className="rounded-2xl px-10 h-14 font-black border-border/60 hover:bg-secondary transition-all active:scale-95">
              <Link to={`/sets/${examId}`}>Library Overview</Link>
            </Button>
            <Button onClick={() => window.location.reload()} className="rounded-2xl px-10 h-14 font-black bg-primary hover:bg-primary/90 shadow-premium hover:shadow-premium-hover transition-all active:scale-95">
              <RefreshCw className="mr-3 h-5 w-5" /> Retake Assessment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 relative overflow-hidden">
      {/* Immersive Background Elements */}
      <div className="absolute top-0 left-0 w-full h-screen pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-500/5 blur-[120px] rounded-full animate-float" />
      </div>

      <div className="w-full max-w-3xl relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-1">
              Knowledge Assessment
            </div>
            <h1 className="text-4xl font-black tracking-tighter leading-none">Practice Quiz</h1>
            <div className="flex items-center gap-4 text-muted-foreground mt-2">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-widest">
                <span className="h-2 w-2 rounded-full bg-primary shadow-glow" />
                Node {currentQuestionIndex + 1} of {questions.length}
              </div>
            </div>
          </div>

          <Button asChild variant="ghost" className="rounded-xl h-10 px-4 font-black text-[10px] tracking-widest uppercase text-muted-foreground hover:text-red-500 hover:bg-red-500/10">
            <Link to={`/sets/${examId}`} className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" /> Terminate Session
            </Link>
          </Button>
        </div>

        {/* Question Stage */}
        <div className="space-y-8 animate-fade-in md:h-96">
          <div className="p-10 glass-card rounded-[2.5rem] border-white/40 shadow-premium min-h-[160px] flex items-center justify-center text-center">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {currentQ.question}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQ.options.map((option, i) => (
              <Button
                key={i}
                variant="outline"
                className="group relative h-auto py-6 px-6 rounded-[1.75rem] border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:translate-y-[-2px] transition-all duration-300 text-left justify-start whitespace-normal active:scale-[0.98] shadow-sm hover:shadow-md"
                onClick={() => handleAnswer(option)}
              >
                <div className="flex items-start gap-4 h-full w-full">
                  <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-secondary text-[10px] font-black uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-sm font-bold pt-1.5 leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors">
                    {option}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Progress Step Indicator */}
        <div className="mt-20 flex gap-1.5 justify-center">
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i === currentQuestionIndex ? "w-8 bg-primary shadow-glow" : i < currentQuestionIndex ? "w-4 bg-primary/40" : "w-4 bg-muted/30"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TakeExam;