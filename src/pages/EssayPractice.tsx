import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { EssayEditor } from '@/components/essay/EssayEditor';
import { DetailedGrade } from '@/utils/essayGrader';
import { essayService } from '@/services/essayService';


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



const fetchEssayQuestionDetails = async (questionId: string): Promise<EssayQuestion> => {
  const { data: { user } } = await supabase.auth.getUser();
  const data = await essayService.getEssayQuestionById(questionId, user?.id);
  if (!data) throw new Error("Question not found");
  return data as unknown as EssayQuestion;
};

const fetchPreviousSubmission = async (questionId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return essayService.getPreviousSubmission(questionId, user.id);
}


const EssayPractice: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();


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

  // Prepare initial data for Editor
  const initialContent = previousSubmission?.content || '';
  const initialGrade: DetailedGrade | null = previousSubmission && previousSubmission.metrics ? {
    score: previousSubmission.score,
    letterGrade: previousSubmission.letter_grade,
    feedback: previousSubmission.feedback,
    metrics: previousSubmission.metrics,
    structureFeedback: [], // Saved metrics usually don't have these detailed arrays unless we store them. 
    contentFeedback: [],   // We can try to reconstruct or leave empty.
    coherenceFeedback: [],
    styleFeedback: [],
    pointsCovered: previousSubmission.metrics.strengths || [],
    pointsMissed: previousSubmission.metrics.improvements || []
  } : null;

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
          <Link to="/essays"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button></Link>
        </div>
      </div>

      {/* Shared Editor Component */}
      <EssayEditor
        questionId={questionId}
        questionText={question.question_text}
        context={question.suggested_points?.[0]}
        initialContent={initialContent}
        initialGrade={initialGrade}
      />
    </div>
  );
};

export default EssayPractice;