import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, History, BookOpen, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Fixed: Added 'from'
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton'; // Fixed: Added 'from'
import { format } from 'date-fns';
import { Label } from "@/components/ui/label";

interface ExamSummary {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  study_set_id: string;
  study_sets: { title: string }[] | null;
  total_questions: number;
  correct_responses: number;
}

const fetchPastExams = async (): Promise<ExamSummary[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: exams, error: examsError } = await supabase
    .from('exams')
    .select(`
      id,
      title,
      description,
      created_at,
      study_set_id,
      study_sets (title),
      generated_questions (id),
      exam_responses (is_correct)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (examsError) {
    console.error("Error fetching past exams:", examsError);
    throw new Error("Failed to fetch your past exams.");
  }

  const processedExams: ExamSummary[] = exams?.map((exam: any) => {
    const totalQuestions = exam.generated_questions?.length || 0;
    const correctResponses = exam.exam_responses?.filter((res: { is_correct: boolean }) => res.is_correct).length || 0;

    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      created_at: exam.created_at,
      study_set_id: exam.study_set_id,
      study_sets: exam.study_sets,
      total_questions: totalQuestions,
      correct_responses: correctResponses,
    };
  }) || [];

  return processedExams;
};

// Helper function to format the exam description
const formatExamDescription = (description: string | null): string => {
  if (!description) return '';
  const parts = description.split('types: ');
  if (parts.length > 1) {
    const prefix = parts[0] + 'types: ';
    const typesString = parts[1];
    const formattedTypes = typesString.split(', ').map(type => {
      return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }).join(', ');
    return prefix + formattedTypes;
  }
  return description;
};

const PastExams: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: pastExams, isLoading, isError, error } = useQuery<ExamSummary[], Error>({
    queryKey: ['pastExams'],
    queryFn: fetchPastExams,
  });

  const filteredExams = pastExams?.filter((exam: ExamSummary) =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (exam.description && formatExamDescription(exam.description).toLowerCase().includes(searchTerm.toLowerCase())) ||
    (exam.study_sets?.[0]?.title && exam.study_sets[0].title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isError) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading past exams: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Past Exams</h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        Review your past exam attempts and see your performance.
      </p>

      <div className="mb-6">
        <Label htmlFor="search-past-exams" className="sr-only">Search past exams</Label>
        <Input
          id="search-past-exams"
          type="text"
          placeholder="Search past exams by title, description, or study set..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <NotebookCard key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      ) : (filteredExams?.length === 0 || !filteredExams) ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No past exams found!</h2>
          <p className="text-muted-foreground mt-2">
            {searchTerm ? "Try a different search term." : "Generate and take an exam to see it here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam: ExamSummary) => (
            <Link to={`/exams/${exam.id}`} key={exam.id}>
              <NotebookCard className="hover:shadow-md transition-shadow h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{exam.title}</CardTitle>
                  {exam.description && (
                    <CardDescription>{formatExamDescription(exam.description)}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {exam.study_sets?.[0]?.title && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>From Set: {exam.study_sets[0].title}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    <span>Taken on: {format(new Date(exam.created_at), 'PPP')}</span>
                  </div>
                  <div className="flex items-center text-sm font-semibold">
                    <History className="mr-2 h-4 w-4" />
                    <span>Score: {exam.correct_responses} / {exam.total_questions}</span>
                  </div>
                </CardContent>
              </NotebookCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PastExams;