
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, BookOpen, Loader2, GraduationCap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { studySetService, StudySet } from '@/services/studySetService';

const ExamsIndex: React.FC = () => {
  const { data: studySets, isLoading, isError, error } = useQuery<StudySet[], Error>({
    queryKey: ['studySets-exams'],
    queryFn: studySetService.getMyStudySets,
  });

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-primary" /> Practice Quizzes
        </h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        Select a study set to start a generated practice quiz.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
      ) : isError ? (
        <div className="text-red-500">Error loading study sets: {error.message}</div>
      ) : studySets && studySets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {studySets.map(set => (
            <NotebookCard key={set.id} className="flex flex-col justify-between hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="line-clamp-1">{set.title}</CardTitle>
                <CardDescription className="line-clamp-2">{set.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <BookOpen className="mr-2 h-4 w-4" /> {set.cards_count || 0} Cards
                </div>
                <Button asChild className="w-full">
                  <Link to={`/quiz/${set.id}`}>Start Quiz</Link>
                </Button>
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-semibold">No Study Sets Found</h3>
          <p className="text-muted-foreground mb-4">Create a study set to start practicing!</p>
          <Button asChild><Link to="/create">Create Study Set</Link></Button>
        </div>
      )}
    </div>
  );
};

export default ExamsIndex;