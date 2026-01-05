
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NotebookCard } from '@/components/NotebookCard';
import { CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateQuiz = async () => {
      if (!examId) return;
      setIsLoading(true);

      // Fetch cards from set
      const { data: cards, error } = await supabase
        .from('cards')
        .select('*')
        .eq('set_id', examId);

      if (error || !cards || cards.length < 4) {
        // Handle error or too few cards
        // For now just stop loading
        setIsLoading(false);
        return;
      }

      // Shuffle and pick 10
      const shuffled = [...cards].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(10, shuffled.length));

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

  if (isLoading) return <div className="p-10 container mx-auto"><Skeleton className="h-64 w-full" /></div>;

  if (questions.length === 0) return (
    <div className="p-10 container mx-auto text-center">
      <h2 className="text-xl font-bold mb-4">Unable to Generate Quiz</h2>
      <p className="mb-4">You need at least 4 cards in this set to generate a quiz.</p>
      <Button asChild><Link to={`/sets/${examId}`}>Back to Set</Link></Button>
    </div>
  );

  if (isFinished) {
    return (
      <div className="container mx-auto py-10 animate-fade-in max-w-2xl text-center">
        <NotebookCard>
          <CardHeader><CardTitle>Quiz Complete!</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4 text-primary">{Math.round((score / questions.length) * 100)}%</div>
            <p className="text-muted-foreground mb-6">You got {score} out of {questions.length} correct.</p>

            <div className="space-y-4 text-left max-h-[60vh] overflow-y-auto pr-2">
              {questions.map((q, i) => (
                <div key={i} className={`p-4 rounded border ${q.isCorrect ? 'border-green-200 dark:border-green-900 bg-green-50/10' : 'border-red-200 dark:border-red-900 bg-red-50/10'}`}>
                  <p className="font-semibold mb-1">{q.question}</p>
                  <p className="text-sm">Your Answer: <span className={q.isCorrect ? "text-green-600 dark:text-green-400 font-bold" : "text-red-600 dark:text-red-400 font-bold"}>{q.userAnswer}</span></p>
                  {!q.isCorrect && <p className="text-sm text-green-600 dark:text-green-400">Correct Answer: {q.answer}</p>}
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="justify-center gap-4 pt-4">
            <Button asChild variant="outline"><Link to={`/sets/${examId}`}>Back to Set</Link></Button>
            <Button onClick={() => window.location.reload()}><RefreshCw className="mr-2 h-4 w-4" /> Try Again</Button>
          </CardFooter>
        </NotebookCard>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="container mx-auto py-10 animate-fade-in max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</span>
          <h1 className="text-2xl font-bold mt-1">Practice Quiz</h1>
        </div>
        <Button asChild variant="ghost"><Link to={`/sets/${examId}`}><ArrowLeft className="mr-2 h-4 w-4" /> Quit</Link></Button>
      </div>

      <NotebookCard className="min-h-[300px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl">{currentQ.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 flex-grow">
          {currentQ.options.map((option, i) => (
            <Button
              key={i}
              variant="outline"
              className="w-full justify-start text-left h-auto py-4 px-4 whitespace-normal hover:bg-secondary/80 transition-colors"
              onClick={() => handleAnswer(option)}
            >
              <span className="mr-3 font-mono text-muted-foreground bg-secondary px-2 py-1 rounded text-xs">{String.fromCharCode(65 + i)}</span>
              {option}
            </Button>
          ))}
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default TakeExam;